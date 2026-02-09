import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const CreateMessage = protectedProcedure
  .input(
    z.object({
      notebookId: z.string(),
      content: z.string(),
    })
  )
  .subscription(async function* ({ input, ctx }) {
    const { notebookId, content } = input;
    const userId = ctx.session.user.id;

    // Validate notebook exists
    const notebook = await ctx.db.notebook.findUnique({
      where: {
        id: notebookId,
        userId,
      },
    });
    if (!notebook) {
      throw new Error("Notebook not found");
    }

    // Create user message
    await ctx.db.message.create({
      data: {
        notebookId,
        content,
        userId,
        role: "user",
      },
    });

    // Create assistant message
    const assistantMessage = await ctx.db.message.create({
      data: {
        notebookId,
        content: "",
        userId,
        role: "assistant",
      },
    });

    const abortController = new AbortController();

    // When the HTTP request/subscription is aborted by the client,
    // immediately abort the downstream retrieval fetch as well.
    const requestSignal = ctx.signal;
    const handleRequestAbort =
      requestSignal &&
      ((() => {
        abortController.abort();
      }) as () => void);
    if (requestSignal && handleRequestAbort) {
      requestSignal.addEventListener("abort", handleRequestAbort);
    }

    // Helper to mark message failed
    const markAssistantMessageFailed = async () => {
      await ctx.db.message
        .update({
          where: { id: assistantMessage.id },
          data: { failed: true },
        })
        .catch((e) => console.error("DB Update Error", e));
    };

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const response = await fetch(`${process.env.RETRIEVAL_API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebook_id: notebookId,
          assistant_message_id: assistantMessage.id,
          content: content,
        }),
        signal: abortController.signal, // Connects fetch to the controller
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error("Response body is null");

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        // --- 3. ABORT CHECK BEFORE READ ---
        if (abortController.signal.aborted) break;

        // This read() will now throw an 'AbortError' immediately if
        // ctx.req.on('close') fires the abort signal.
        const { done, value } = await reader.read();

        if (done) {
          // Process trailing buffer logic here...
          if (buffer.trim()) {
            yield buffer.trim();
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("data: ")) {
            const status = trimmedLine.slice(6).trim();
            if (status) yield status;
          } else {
            yield trimmedLine;
          }
        }
      }
    } catch (err) {
      // --- 4. HANDLE ABORT ERRORS ---
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Stream aborted by client or cleanup");
        await markAssistantMessageFailed();
      } else {
        console.error("Stream failed", err);
        await markAssistantMessageFailed();
        throw err;
      }
    } finally {
      // Ensure we always clean up
      if (requestSignal && handleRequestAbort) {
        requestSignal.removeEventListener("abort", handleRequestAbort);
      }
      abortController.abort();
      if (reader) {
        try {
          await reader.cancel();
          reader.releaseLock();
        } catch {
          // Ignore cancel errors
        }
      }
    }
  });

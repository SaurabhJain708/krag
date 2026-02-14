import { encrypt_data } from "@/lib/encryption";
import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

export const CreateMessage = protectedProcedure
  .input(
    z.object({
      notebookId: z.string(),
      content: z.string(),
      encryptionKey: z.string().optional(),
    })
  )
  .subscription(async function* ({ input, ctx }) {
    const { notebookId, content, encryptionKey } = input;
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

    const encryptionType = notebook.encryption;
    let encryptedContent = content;
    if (encryptionType !== "NotEncrypted" && encryptionKey) {
      encryptedContent = encrypt_data(content, encryptionKey);
    }

    // Create user message
    const userMessage = await ctx.db.message.create({
      data: {
        notebookId,
        content: encryptedContent,
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

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    console.log(content);

    try {
      const response = await fetch(`${process.env.RETRIEVAL_API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notebook_id: notebookId,
          assistant_message_id: assistantMessage.id,
          content: content,
          user_message_id: userMessage.id,
          encryption_type: encryptionType,
          encryption_key: encryptionKey,
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
    } catch {
      // Ignore errors
      console.error("Stream failed");
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

import { redis } from "@/lib/redis";
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

    await redis.set(
      `Notebook:${notebookId}:message:${assistantMessage.id}`,
      JSON.stringify({
        status: "uploading",
      })
    );

    try {
      const response = await fetch(`${process.env.RETRIEVAL_API}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notebook_id: notebookId,
          assistant_message_id: assistantMessage.id,
          content: content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Process any remaining data in buffer before breaking
          if (buffer.trim()) {
            const trimmedLine = buffer.trim();
            if (trimmedLine.startsWith("data: ")) {
              const status = trimmedLine.slice(6).trim();
              if (status) {
                yield status;
              }
            } else if (trimmedLine) {
              yield trimmedLine;
            }
          }
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          // Handle SSE format: "data: status_string"
          if (trimmedLine.startsWith("data: ")) {
            const status = trimmedLine.slice(6).trim(); // Remove "data: " prefix
            if (status) {
              yield status;
            }
          } else {
            // Plain status string
            yield trimmedLine;
          }
        }
      }
    } catch (err) {
      console.error("Failed to call retrieval API", err);
      // Mark the assistant message as failed if the API call fails
      await ctx.db.message
        .update({
          where: { id: assistantMessage.id },
          data: { failed: true },
        })
        .catch((dbErr) => {
          console.error("Failed to update message status:", dbErr);
        });
      throw new Error("Failed to process message");
    }
  });

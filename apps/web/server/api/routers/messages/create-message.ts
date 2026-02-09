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

    // Create AbortController to handle cancellation
    const abortController = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let completed = false;
    let clientDisconnected = false;

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
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        // Check if aborted before reading
        if (abortController.signal.aborted) {
          break;
        }

        let readResult;
        try {
          readResult = await reader.read();
        } catch (readErr) {
          // If read fails due to abort, break
          if (readErr instanceof Error && readErr.name === "AbortError") {
            break;
          }
          throw readErr;
        }

        const { done, value } = readResult;

        if (done) {
          // Process any remaining data in buffer before breaking
          if (buffer.trim()) {
            const trimmedLine = buffer.trim();
            if (trimmedLine.startsWith("data: ")) {
              const status = trimmedLine.slice(6).trim();
              if (status) {
                try {
                  yield status;
                } catch {
                  // Client disconnected, abort the request
                  clientDisconnected = true;
                  abortController.abort();
                  if (reader) {
                    try {
                      await reader.cancel();
                    } catch {
                      // Ignore cancel errors
                    }
                  }
                  return; // Exit generator
                }
              }
            } else if (trimmedLine) {
              try {
                yield trimmedLine;
              } catch {
                // Client disconnected, abort the request
                clientDisconnected = true;
                abortController.abort();
                if (reader) {
                  try {
                    await reader.cancel();
                  } catch {
                    // Ignore cancel errors
                  }
                }
                return; // Exit generator
              }
            }
          }
          completed = true;
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

          // Check if aborted before yielding
          if (abortController.signal.aborted) {
            break;
          }

          // Handle SSE format: "data: status_string"
          if (trimmedLine.startsWith("data: ")) {
            const status = trimmedLine.slice(6).trim(); // Remove "data: " prefix
            if (status) {
              try {
                yield status;
              } catch {
                // Client disconnected - tRPC stops calling the generator
                console.log("Client disconnected, aborting Python API request");
                clientDisconnected = true;
                abortController.abort();
                if (reader) {
                  try {
                    await reader.cancel();
                  } catch {
                    // Ignore cancel errors
                  }
                }
                return; // Exit generator
              }
            }
          } else {
            // Plain status string
            try {
              yield trimmedLine;
            } catch {
              // Client disconnected - tRPC stops calling the generator
              clientDisconnected = true;
              abortController.abort();
              if (reader) {
                try {
                  await reader.cancel();
                } catch {
                  // Ignore cancel errors
                }
              }
              return; // Exit generator
            }
          }
        }
      }
    } catch (err) {
      // Handle abort errors gracefully
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Request aborted by client");
        // Mark the assistant message as failed when cancelled
        await ctx.db.message
          .update({
            where: { id: assistantMessage.id },
            data: { failed: true },
          })
          .catch((dbErr) => {
            console.error("Failed to update message status:", dbErr);
          });
        return; // Exit gracefully without throwing
      }

      // Don't throw if client disconnected
      if (clientDisconnected) {
        return;
      }

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
    } finally {
      // Cleanup: abort the request if not completed or client disconnected
      if (!completed || clientDisconnected) {
        abortController.abort();
      }
      if (reader) {
        try {
          await reader.cancel();
          reader.releaseLock();
        } catch {
          // Ignore cleanup errors (expected when already aborted)
        }
      }
    }
  });

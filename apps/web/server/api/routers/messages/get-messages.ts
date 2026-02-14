import { decrypt_data } from "@/lib/encryption";
import { protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const GetMessages = protectedProcedure
  .input(
    z.object({ notebookId: z.string(), encryptionKey: z.string().optional() })
  )
  .query(async ({ input, ctx }) => {
    const { notebookId, encryptionKey } = input;
    const userId = ctx.session.user.id;
    const notebook = await ctx.db.notebook.findUnique({
      where: {
        id: notebookId,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
    if (!notebook) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Notebook not found" });
    }
    const encryptionType = notebook.encryption;
    if (encryptionType !== "NotEncrypted" && encryptionKey) {
      for (const message of notebook.messages) {
        try {
          message.content = decrypt_data(message.content, encryptionKey);
        } catch (error) {
          // If decryption fails, the message might be:
          // 1. Unencrypted (created before encryption was enabled)
          // 2. Encrypted with a different key
          // 3. Corrupted or malformed
          // Log the error but don't fail the entire request - leave content as-is
          console.error(
            `Failed to decrypt message ${message.id}:`,
            error instanceof Error ? error.message : String(error)
          );
          // Leave the content as-is - it might be unencrypted legacy data
        }
      }
    }
    return notebook.messages;
  });

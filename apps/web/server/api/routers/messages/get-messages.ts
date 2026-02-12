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
        message.content = decrypt_data(message.content, encryptionKey);
      }
    }
    return notebook.messages;
  });

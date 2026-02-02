import { protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const GetMessages = protectedProcedure
  .input(z.object({ notebookId: z.string() }))
  .query(async ({ input, ctx }) => {
    const { notebookId } = input;
    const userId = ctx.session.user.id;
    const notebook = await ctx.db.notebook.findUnique({
      where: {
        id: notebookId,
        userId,
      },
      include: {
        messages: true,
      },
    });
    if (!notebook) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Notebook not found" });
    }
    return notebook.messages;
  });

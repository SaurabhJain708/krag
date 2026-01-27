import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

export const getSources = protectedProcedure
  .input(
    z.object({
      notebookId: z.string(),
    })
  )
  .query(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const { notebookId } = input;
    const notebook = await ctx.db.notebook.findUnique({
      where: {
        id: notebookId,
        userId: userId,
      },
    });
    if (!notebook) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Notebook not found" });
    }
    const sources = await ctx.db.source.findMany({
      where: {
        userId: userId,
        notebookId: notebookId,
      },
    });
    return sources;
  });

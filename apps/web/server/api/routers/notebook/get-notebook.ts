import { protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const GetNotebook = protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    const notebook = await ctx.db.notebook.findUnique({
      where: {
        id: input.id,
        userId: ctx.session.user.id,
      },
      include: {
        messages: true,
        sources: true,
      },
    });
    if (!notebook) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Notebook not found" });
    }
    return notebook;
  });

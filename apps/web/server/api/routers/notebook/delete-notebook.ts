import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../trpc";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

export const deleteNotebook = protectedProcedure
  .input(
    z.object({
      notebookId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { notebookId } = input;
    const userId = ctx.session.user.id;
    const notebook = await ctx.db.notebook.findUnique({
      where: { id: notebookId, userId },
      select: {
        image: true,
      },
    });
    if (!notebook) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Notebook not found" });
    }

    if (notebook.image) {
      await supabase.storage.from("files").remove([notebook.image]);
    }
    await ctx.db.notebook.delete({
      where: { id: notebookId, userId },
    });
    return { success: true };
  });

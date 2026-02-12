import { z } from "zod";
import { protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { supabase } from "@/lib/supabase";

export const deleteSource = protectedProcedure
  .input(
    z.object({
      sourceId: z.string(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const { sourceId } = input;
    const source = await ctx.db.source.findUnique({
      where: {
        id: sourceId,
        userId: userId,
      },
      select: {
        image_paths: true,
        id: true,
      },
    });
    if (!source) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
    }
    await supabase.storage.from("files").remove(source.image_paths);
    await ctx.db.source.delete({
      where: {
        id: source.id,
      },
    });
    return { success: true };
  });

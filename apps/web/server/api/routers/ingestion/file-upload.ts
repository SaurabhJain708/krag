import uploadFile from "@/lib/supabase";
import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { redis } from "@/lib/redis";
import { TRPCError } from "@trpc/server";

export const UploadFile = protectedProcedure
  .input(z.object({ file: z.instanceof(File), notebookId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.session.user.id;
    const notebook = await ctx.db.notebook.findUnique({
      where: {
        id: input.notebookId,
        userId: userId,
      },
      select: {
        id: true,
      },
    });
    if (!notebook) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Notebook not found" });
    }
    const { id: fileId, path } = await uploadFile(input.file);
    await ctx.db.file.create({
      data: {
        id: fileId,
        name: input.file.name,
        path: path,
        userId: userId,
        notebookId: notebook.id,
      },
    });
    await redis.set(`file:${fileId}`, JSON.stringify({ path, userId }));
    return { fileId };
  });

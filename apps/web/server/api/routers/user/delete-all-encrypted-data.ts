import { supabase } from "@/lib/supabase";
import { protectedProcedure } from "../../trpc";
import { Encryption } from "@repo/db";

export const deleteAllEncryptedData = protectedProcedure.mutation(
  async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const filePaths = [];
    const notebooks = await ctx.db.notebook.findMany({
      where: { userId, encrypted: true },
      select: {
        image: true,
        id: true,
      },
    });
    for (const notebook of notebooks) {
      filePaths.push(notebook.image);
    }
    const notebookIds = notebooks.map((notebook) => notebook.id);
    const sources = await ctx.db.source.findMany({
      where: { userId, notebookId: { in: notebookIds } },
      select: {
        path: true,
      },
    });
    for (const source of sources) {
      filePaths.push(source.path);
    }
    await ctx.db.notebook.deleteMany({
      where: { userId, encrypted: true },
    });

    await supabase.storage
      .from("files")
      .remove(filePaths.filter((filePath) => filePath !== null));
    await ctx.db.user.update({
      where: { id: userId },
      data: { encryption: Encryption.NotEncrypted },
    });
    return { success: true };
  }
);

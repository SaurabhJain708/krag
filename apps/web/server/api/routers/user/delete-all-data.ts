import { protectedProcedure } from "@/server/api/trpc";
import { supabase } from "@/lib/supabase";

export const DeleteAllData = protectedProcedure.mutation(async ({ ctx }) => {
  const userId = ctx.session.user.id;

  // Get all sources and notebooks before deleting to get file paths
  const sources = await ctx.db.source.findMany({
    where: {
      userId: userId,
    },
    select: {
      path: true,
    },
  });

  const notebooks = await ctx.db.notebook.findMany({
    where: {
      userId: userId,
    },
    select: {
      image: true,
    },
  });

  // Delete files from Supabase storage
  const filePathsToDelete: string[] = [];

  // Add source file paths
  sources.forEach((source) => {
    if (source.path) {
      filePathsToDelete.push(source.path);
    }
  });

  // Add notebook image paths
  notebooks.forEach((notebook) => {
    if (notebook.image) {
      filePathsToDelete.push(notebook.image);
    }
  });

  // Delete all files from storage in batch
  if (filePathsToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("files")
      .remove(filePathsToDelete);

    if (storageError) {
      console.error("Error deleting files from storage:", storageError);
      // Continue with database deletion even if storage deletion fails
    }
  }

  // Delete all user data in the correct order to respect foreign key constraints
  // Sources (files) are deleted first as they reference notebooks
  await ctx.db.source.deleteMany({
    where: {
      userId: userId,
    },
  });

  // Messages are deleted next as they reference notebooks
  await ctx.db.message.deleteMany({
    where: {
      userId: userId,
    },
  });

  // Notebooks are deleted last
  await ctx.db.notebook.deleteMany({
    where: {
      userId: userId,
    },
  });

  return { success: true };
});

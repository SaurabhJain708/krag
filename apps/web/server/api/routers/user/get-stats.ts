import { protectedProcedure } from "@/server/api/trpc";

export const GetUserStats = protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.session.user.id;

  const [notebookCount, sourceCount, sourcesWithFiles, notebooksWithFiles] =
    await Promise.all([
      ctx.db.notebook.count({
        where: {
          userId: userId,
        },
      }),
      ctx.db.source.count({
        where: {
          userId: userId,
        },
      }),
      ctx.db.source.findMany({
        where: {
          userId: userId,
          image_paths: {
            isEmpty: false,
          },
        },
        select: {
          image_paths: true,
        },
      }),
      ctx.db.notebook.findMany({
        where: {
          userId: userId,
          image: {
            not: null,
          },
        },
      }),
    ]);

  const sourceFileCount = sourcesWithFiles.reduce(
    (count, source) => count + source.image_paths.length,
    0
  );
  const notebookFileCount = notebooksWithFiles.filter(
    (notebook) => notebook.image !== null
  ).length;
  const fileCount = sourceFileCount + notebookFileCount;

  return {
    notebookCount,
    fileCount,
    sourceCount,
  };
});

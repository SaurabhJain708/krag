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
          path: {
            not: null,
          },
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

  return {
    notebookCount,
    fileCount: sourcesWithFiles.length + notebooksWithFiles.length, // Sources are the files in the database
    sourceCount,
  };
});

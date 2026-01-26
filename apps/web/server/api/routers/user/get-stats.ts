import { protectedProcedure } from "@/server/api/trpc";

export const GetUserStats = protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.session.user.id;

  const [notebookCount, sourceCount] = await Promise.all([
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
  ]);

  return {
    notebookCount,
    fileCount: sourceCount, // Sources are the files in the database
    sourceCount,
  };
});

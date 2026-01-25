import { supabase } from "@/lib/supabase";
import { protectedProcedure } from "@/server/api/trpc";

export const GetNotebooks = protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.session.user.id;
  const notebooks = await ctx.db.notebook.findMany({
    where: {
      userId: userId,
    },
    include: {
      _count: {
        select: {
          sources: true,
        },
      },
    },
  });

  const notebooksWithUrls = await Promise.all(
    notebooks.map(async (note) => {
      let signedUrl = null;

      if (note.image) {
        const { data, error } = await supabase.storage
          .from("files")
          .createSignedUrl(note.image, 3600);

        signedUrl = data?.signedUrl || null;
      }

      return {
        ...note,
        image: signedUrl,
      };
    })
  );
  return notebooksWithUrls;
});

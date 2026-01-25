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

  const notebooksWithUrls = notebooks.map((note) => {
    let imageUrl = null;

    if (note.image) {
      // If note.image is already a full URL, use it directly
      // Otherwise, it's a path and we need to get the public URL
      if (
        note.image.startsWith("http://") ||
        note.image.startsWith("https://")
      ) {
        imageUrl = note.image;
      } else {
        // Get the public URL for the stored path
        const { data: urlData } = supabase.storage
          .from("files")
          .getPublicUrl(note.image);
        imageUrl = urlData.publicUrl;
      }
    }

    return {
      ...note,
      image: imageUrl,
    };
  });
  return notebooksWithUrls;
});

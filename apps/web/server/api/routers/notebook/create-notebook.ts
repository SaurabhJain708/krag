import { uploadFile } from "@/lib/upload-file";
import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export const CreateNotebook = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1, "Name is required").max(MAX_NAME_LENGTH),
      description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
      // 1. Change input to accept Base64 string + Mime Type
      imageBase64: z.string().optional(),
      imageType: z.string().optional(), // e.g. "image/png"
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.session.user.id;
    const { name, description, imageBase64, imageType } = input;

    let imageUrl: string | null = null;
    if (imageBase64 && imageType) {
      const buffer = Buffer.from(imageBase64, "base64");
      const data = await uploadFile({ buffer, mimeType: imageType, userId });
      imageUrl = data.path;
    }

    const notebook = await ctx.db.notebook.create({
      data: {
        name,
        description: description ?? null,
        userId,
        image: imageUrl,
      },
    });
    return notebook;
  });

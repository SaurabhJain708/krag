import { uploadFile } from "@/lib/upload-file";
import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export const CreateNotebook = protectedProcedure
  .input(
    z.object({
      name: z
        .string()
        .min(1, "Name is required")
        .max(
          MAX_NAME_LENGTH,
          `Name must be ${MAX_NAME_LENGTH} characters or less`
        ),
      description: z
        .string()
        .max(
          MAX_DESCRIPTION_LENGTH,
          `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`
        )
        .optional(),
      image: z.any().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.session.user.id;
    const { name, description, image } = input;

    let imagePath: string | null = null;
    if (image) {
      const data = await uploadFile(image, userId);
      imagePath = data.fullPath;
    }

    const notebook = await ctx.db.notebook.create({
      data: {
        name,
        description: description ?? null,
        userId,
        image: imagePath,
      },
    });
    return notebook;
  });

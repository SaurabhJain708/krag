import { uploadFile } from "@/lib/upload-file";
import { protectedProcedure } from "@/server/api/trpc";
import { Encryption } from "@repo/db";
import { z } from "zod";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export const CreateNotebook = protectedProcedure
  .input(
    z.object({
      name: z.string().min(1, "Name is required").max(MAX_NAME_LENGTH),
      description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
      imageBase64: z.string().optional(),
      imageType: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.session.user.id;
    const encryption = ctx.session.user.encryption;
    const isEncrypted =
      encryption === Encryption.SimpleEncryption ||
      encryption === Encryption.AdvancedEncryption;
    const { name, description, imageBase64, imageType } = input;

    let imageUrl: string | null = null;
    if (imageBase64 && imageType) {
      try {
        const buffer = Buffer.from(imageBase64, "base64");
        const data = await uploadFile({ buffer, mimeType: imageType, userId });
        imageUrl = data.path;
      } catch (error) {
        console.error("Error uploading image:", error);
        throw new Error(
          `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    const notebook = await ctx.db.notebook.create({
      data: {
        name,
        description: description ?? null,
        userId,
        image: imageUrl,
        encrypted: isEncrypted,
      },
    });
    return notebook;
  });

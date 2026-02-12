import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../trpc";
import { z } from "zod";
import { FileProcessingStatus, FileType } from "@repo/db";
import { uploadFile as uploadFileToStorage } from "@/lib/upload-file";
import { redis } from "@/lib/redis";

export const uploadFile = protectedProcedure
  .input(
    z.object({
      fileBase64: z.string().optional(),
      fileName: z.string().optional(),
      notebookId: z.string(),
      websiteUrl: z.string().optional(),
      encryptionKey: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { fileBase64, fileName, notebookId, websiteUrl, encryptionKey } =
      input;
    const userId = ctx.session.user.id;
    const notebook = await ctx.db.notebook.findUnique({
      where: {
        id: notebookId,
        userId,
      },
    });
    if (!notebook) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Notebook not found" });
    }
    const buffer = Buffer.from(fileBase64 || "", "base64");
    const data = await uploadFileToStorage({
      buffer,
      mimeType: "application/pdf",
      userId,
    });

    const encryptionType = notebook.encryption;

    await redis.lpush(
      "file_processing_queue",
      JSON.stringify({
        id: data.id,
        mimeType: websiteUrl ? "text/html" : "application/pdf",
        base64: fileBase64 || "",
        user_id: userId,
        url: websiteUrl,
        type: websiteUrl ? "url" : "pdf",
        encryptionKey: encryptionKey || null,
        encryptionType: encryptionType,
      })
    );

    await redis.set(`source:${data.id}`, FileProcessingStatus.queued);

    const source = await ctx.db.source.create({
      data: {
        id: data.id,
        userId,
        notebookId,
        name: websiteUrl ? websiteUrl : fileName || "",
        type: websiteUrl ? FileType.url : FileType.pdf,
        path: data.path,
        processingStatus: FileProcessingStatus.queued,
      },
    });

    return { success: true, sourceId: source.id };
  });

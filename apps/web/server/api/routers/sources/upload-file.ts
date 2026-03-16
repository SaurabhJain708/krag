import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../../trpc";
import { z } from "zod";
import { FileProcessingStatus, FileType } from "@repo/db";
import { redis } from "@/lib/redis";
import { v4 as uuidv4 } from "uuid";
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

    const encryptionType = notebook.encryption;

    // Debug logging
    console.log(
      "Upload file - encryptionKey received:",
      encryptionKey ? "present" : "missing"
    );
    console.log(
      "Upload file - encryptionKey value:",
      encryptionKey ? `${encryptionKey.substring(0, 10)}...` : "null"
    );
    console.log("Upload file - encryptionType:", encryptionType);

    const id = uuidv4();

    const queueMessage = {
      id,
      mimeType: websiteUrl ? "text/html" : "application/pdf",
      base64: fileBase64 || "",
      user_id: userId,
      url: websiteUrl,
      type: websiteUrl ? "url" : "pdf",
      encryption_key:
        encryptionKey && encryptionKey.trim() ? encryptionKey : null,
      encryption_type: encryptionType,
    };

    console.log(
      "Upload file - Redis message encryption_key:",
      queueMessage.encryption_key ? "present" : "null"
    );
    console.log(
      "Upload file - Redis message encryption_type:",
      queueMessage.encryption_type
    );

    await redis.lpush("file_processing_queue", JSON.stringify(queueMessage));

    await redis.set(`source:${id}`, FileProcessingStatus.queued);

    const source = await ctx.db.source.create({
      data: {
        id,
        userId,
        notebookId,
        name: websiteUrl ? websiteUrl : fileName || "",
        type: websiteUrl ? FileType.url : FileType.pdf,
        path: `${userId}/${id}`,
        processingStatus: FileProcessingStatus.queued,
      },
    });

    return { success: true, sourceId: source.id };
  });

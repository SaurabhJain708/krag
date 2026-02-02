import { redis } from "@/lib/redis";
import { protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import axios from "axios";

export const CreateMessage = protectedProcedure
  .input(
    z.object({
      notebookId: z.string(),
      content: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { notebookId, content } = input;
    const userId = ctx.session.user.id;
    const notebook = await ctx.db.notebook.findUnique({
      where: {
        id: notebookId,
        userId,
      },
    });
    if (!notebook) {
      throw new Error("Notebook not found");
    }

    const message = await ctx.db.message.create({
      data: {
        notebookId,
        content,
        userId,
        role: "user",
      },
    });

    await redis.set(
      `message:${message.id}`,
      JSON.stringify({
        status: "uploading",
      })
    );

    await axios.post(`${process.env.RETRIEVAL_API}`, {
      data: {
        user_id: userId,
        notebook_id: notebookId,
        message_id: message.id,
        content: content,
        role: "user",
      },
    });
    return { success: true };
  });

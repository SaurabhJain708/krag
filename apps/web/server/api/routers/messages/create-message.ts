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

    await ctx.db.message.create({
      data: {
        notebookId,
        content,
        userId,
        role: "user",
      },
    });

    const assistantMessage = await ctx.db.message.create({
      data: {
        notebookId,
        content: "",
        userId,
        role: "assistant",
      },
    });

    await redis.set(
      `Notebook:${notebookId}:message:${assistantMessage.id}`,
      JSON.stringify({
        status: "uploading",
      })
    );

    try {
      await axios.post(
        `${process.env.RETRIEVAL_API}`,
        {
          notebook_id: notebookId,
          assistant_message_id: assistantMessage.id,
          content: content,
        },
        {
          // Allow plenty of time for the retrieval API to respond
          timeout: 5 * 60 * 1000, // 5 minutes
        }
      );
    } catch (err) {
      console.error("Failed to call retrieval API", err);
      // Mark the assistant message as failed if the API call fails
      await ctx.db.message.update({
        where: { id: assistantMessage.id },
        data: { failed: true },
      });
      throw new Error("Failed to process message");
    }

    return { success: true };
  });

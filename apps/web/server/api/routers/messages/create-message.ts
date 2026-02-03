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

    // Kick off retrieval / LLM work asynchronously so this request
    // doesn't block (and potentially time out) while the Python worker
    // runs for 2–3 minutes.
    void axios
      .post(
        `${process.env.RETRIEVAL_API}`,
        {
          notebook_id: notebookId,
          assistant_message_id: assistantMessage.id,
          content: content,
        },
        {
          // Allow plenty of time for the retrieval API to respond;
          // this only affects the background call, not the tRPC response.
          timeout: 5 * 60 * 1000, // 5 minutes
        }
      )
      .catch((err) => {
        console.error("Failed to call retrieval API", err);
      });

    return { success: true };
  });

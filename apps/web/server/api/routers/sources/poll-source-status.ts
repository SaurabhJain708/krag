import { z } from "zod";
import { publicProcedure } from "../../trpc";
import { redis } from "@/lib/redis";
import { FileProcessingStatus } from "@repo/db";

export const pollStatus = publicProcedure
  .input(
    z.object({
      sourceIds: z.array(z.string()),
    })
  )
  .query(async ({ input }) => {
    const sourceStatuses = await Promise.all(
      input.sourceIds.map(async (sourceId) => {
        const source = (await redis.get(
          `source:${sourceId}`
        )) as FileProcessingStatus;
        return {
          id: sourceId,
          status: source,
        };
      })
    );
    console.log(sourceStatuses);
    return sourceStatuses;
  });

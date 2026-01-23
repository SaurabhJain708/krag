import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const exampleRouter = createTRPCRouter({
  hello: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { message: `Hello ${input.name}` };
    }),
});

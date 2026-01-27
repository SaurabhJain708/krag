import { protectedProcedure } from "../../trpc";
import { z } from "zod";

const encryptionEnum = [
  "NotEncrypted",
  "SimpleEncryption",
  "AdvancedEncryption",
] as const;

export const handleEncryption = protectedProcedure
  .input(
    z.object({
      encryption: z.enum(encryptionEnum),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const { encryption } = input;
    await ctx.db.user.update({
      where: { id: userId },
      data: { encryption },
    });
    return { success: true };
  });

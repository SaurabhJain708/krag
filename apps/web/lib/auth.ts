import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
// If your Prisma file is located elsewhere, you can change the path
import { Encryption, prisma } from "@repo/db";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      encryption: {
        type: "string",
        required: false,
        defaultValue: Encryption.NotEncrypted,
        input: false,
      },
    },
  },
});

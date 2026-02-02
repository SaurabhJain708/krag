import { createTRPCRouter } from "@/server/api/trpc";
import { CreateMessage } from "./create-message";
import { GetMessages } from "./get-messages";

export const messagesRouter = createTRPCRouter({
  createMessage: CreateMessage,
  getMessages: GetMessages,
});

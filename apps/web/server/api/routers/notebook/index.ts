import { createTRPCRouter } from "@/server/api/trpc";
import { CreateNotebook } from "./create-notebook";
import { GetNotebook } from "./get-notebook";
import { GetNotebooks } from "./get-notebooks";

export const notebookRouter = createTRPCRouter({
  createNotebook: CreateNotebook,
  getNotebook: GetNotebook,
  getNotebooks: GetNotebooks,
});

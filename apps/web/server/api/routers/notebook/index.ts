import { createTRPCRouter } from "@/server/api/trpc";
import { CreateNotebook } from "./create-notebook";
import { GetNotebook } from "./get-notebook";
import { GetNotebooks } from "./get-notebooks";
import { deleteNotebook } from "./delete-notebook";

export const notebookRouter = createTRPCRouter({
  createNotebook: CreateNotebook,
  getNotebook: GetNotebook,
  getNotebooks: GetNotebooks,
  deleteNotebook: deleteNotebook,
});

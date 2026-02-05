import { createTRPCRouter } from "@/server/api/trpc";
import { getSources } from "./get-sources";
import { uploadFile } from "./upload-file";
import { pollStatus } from "./poll-source-status";
import { deleteSource } from "./delete-source";
import { getSource } from "./get-source";

export const sourcesRouter = createTRPCRouter({
  getSources: getSources,
  uploadFile: uploadFile,
  pollStatus: pollStatus,
  deleteSource: deleteSource,
  getSource: getSource,
});

import { createTRPCRouter } from "../../trpc";
import { getSources } from "./get-sources";
import { uploadFile } from "./upload-file";
import { pollStatus } from "./poll-source-status";

export const sourcesRouter = createTRPCRouter({
  getSources: getSources,
  uploadFile: uploadFile,
  pollStatus: pollStatus,
});

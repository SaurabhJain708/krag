import { createTRPCRouter } from "../../trpc";
import { getSources } from "./get-sources";
import { uploadFile } from "./upload-file";

export const sourcesRouter = createTRPCRouter({
  getSources: getSources,
  uploadFile: uploadFile,
});

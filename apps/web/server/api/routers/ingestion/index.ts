import { createTRPCRouter } from "@/server/api/trpc";
import { UploadFile } from "./file-upload";

export const ingestionRouter = createTRPCRouter({
  uploadFile: UploadFile,
});

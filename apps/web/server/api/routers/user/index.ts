import { createTRPCRouter } from "@/server/api/trpc";
import { GetUserStats } from "./get-stats";
import { DeleteAllData } from "./delete-all-data";
import { handleEncryption } from "./encryption-handler";
import { deleteAllEncryptedData } from "./delete-all-encrypted-data";
import { deleteNotebook } from "../notebook/delete-notebook";

export const userRouter = createTRPCRouter({
  getStats: GetUserStats,
  deleteAllData: DeleteAllData,
  handleEncryption: handleEncryption,
  deleteAllEncryptedData: deleteAllEncryptedData,
  deleteNotebook: deleteNotebook,
});

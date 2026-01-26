import { createTRPCRouter } from "@/server/api/trpc";
import { GetUserStats } from "./get-stats";

export const userRouter = createTRPCRouter({
  getStats: GetUserStats,
});

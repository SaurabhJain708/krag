import { createTRPCRouter } from "../../trpc";
import { getSources } from "./get-sources";

export const sourcesRouter = createTRPCRouter({
  getSources: getSources,
});

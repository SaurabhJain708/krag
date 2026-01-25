import { createCallerFactory, createTRPCRouter } from "./trpc";
import { notebookRouter } from "./routers/notebook";
import { ingestionRouter } from "./routers/ingestion";

export const appRouter = createTRPCRouter({
  notebookRouter: notebookRouter,
  ingestionRouter: ingestionRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

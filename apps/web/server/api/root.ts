import { createCallerFactory, createTRPCRouter } from "./trpc";
import { notebookRouter } from "./routers/notebook";
import { ingestionRouter } from "./routers/ingestion";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  notebookRouter: notebookRouter,
  ingestionRouter: ingestionRouter,
  userRouter: userRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

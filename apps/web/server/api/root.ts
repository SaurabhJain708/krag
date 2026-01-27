import { createCallerFactory, createTRPCRouter } from "./trpc";
import { notebookRouter } from "./routers/notebook";
import { userRouter } from "./routers/user";
import { sourcesRouter } from "./routers/sources";

export const appRouter = createTRPCRouter({
  notebookRouter: notebookRouter,
  userRouter: userRouter,
  sourcesRouter: sourcesRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);

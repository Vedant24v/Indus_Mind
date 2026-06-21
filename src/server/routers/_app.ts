import { router } from "../trpc";
import { authRouter } from "./auth";
import { projectRouter } from "./project";
import { documentRouter } from "./document";
import { chatRouter } from "./chat";

export const appRouter = router({
  auth: authRouter,
  project: projectRouter,
  document: documentRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;

import { propertiesRouter } from "@/server/api/routers/properties";
import { equipmentRouter } from "@/server/api/routers/equipment";
import { systemSettingsRouter } from "@/server/api/routers/system-settings";
import { systemLogRouter } from "@/server/api/routers/system-log";
import { smartessRouter } from "@/server/api/routers/smartess";
import { smartlifeRouter } from "@/server/api/routers/smartlife";
import { weatherRouter } from "@/server/api/routers/weather";
import { adminRouter } from "@/server/api/routers/admin";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  properties: propertiesRouter,
  equipment: equipmentRouter,
  systemSettings: systemSettingsRouter,
  systemLog: systemLogRouter,
  smartess: smartessRouter,
  smartlife: smartlifeRouter,
  weather: weatherRouter,
  admin: adminRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

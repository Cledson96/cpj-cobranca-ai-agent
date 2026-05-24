import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { registerPrismaPlugin } from "./plugins/prisma.js";
import { registerAdminRoutes, type AdminRouteDependencies } from "./routes/admin.routes.js";
import { registerAgentRoutes, type AgentRouteDependencies } from "./routes/agent.routes.js";
import { registerHistoryRoutes, type HistoryRouteDependencies } from "./routes/history.routes.js";
import { registerHealthRoutes } from "./routes/health.routes.js";

export type AppDependencies = AgentRouteDependencies & HistoryRouteDependencies & AdminRouteDependencies;

export function buildApp(
  options: FastifyServerOptions = {},
  dependencies: AppDependencies = {},
): FastifyInstance {
  const app = Fastify(options);

  void app.register(cors, {
    origin: true,
  });
  void app.register(registerPrismaPlugin);
  void app.register(registerHealthRoutes);
  void app.register(registerAgentRoutes, dependencies);
  void app.register(registerHistoryRoutes, dependencies);
  void app.register(registerAdminRoutes, dependencies);

  return app;
}

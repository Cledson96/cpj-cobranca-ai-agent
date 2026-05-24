import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { registerPrismaPlugin } from "./plugins/prisma.js";
import { registerAgentRoutes, type AgentRouteDependencies } from "./routes/agent.routes.js";
import { registerHistoryRoutes, type HistoryRouteDependencies } from "./routes/history.routes.js";
import { registerHealthRoutes } from "./routes/health.routes.js";

export type AppDependencies = AgentRouteDependencies & HistoryRouteDependencies;

export function buildApp(
  options: FastifyServerOptions = {},
  dependencies: AppDependencies = {},
): FastifyInstance {
  const app = Fastify(options);

  void app.register(registerPrismaPlugin);
  void app.register(registerHealthRoutes);
  void app.register(registerAgentRoutes, dependencies);
  void app.register(registerHistoryRoutes, dependencies);

  return app;
}

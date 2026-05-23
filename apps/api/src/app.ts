import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { registerHealthRoutes } from "./routes/health.routes.js";

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options);

  void app.register(registerHealthRoutes);

  return app;
}

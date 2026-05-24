import type { FastifyInstance } from "fastify";
import { HealthController } from "../controllers/health.controller.js";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  const controller = new HealthController();

  app.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            required: ["status", "service", "timestamp"],
            properties: {
              status: { type: "string", const: "ok" },
              service: { type: "string" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    async () => controller.show(),
  );
}

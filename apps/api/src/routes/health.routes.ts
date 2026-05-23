import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
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
    async () => ({
      status: "ok",
      service: "cpj-cobranca-ai-agent",
      timestamp: new Date().toISOString(),
    }),
  );
}

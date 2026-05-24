import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ExecutionRepository } from "../modules/executions/execution.repository.js";

export type HistoryRouteDependencies = {
  historyRepository?: Pick<ExecutionRepository, "listLatest" | "getById">;
};

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export async function registerHistoryRoutes(
  app: FastifyInstance,
  dependencies: HistoryRouteDependencies = {},
): Promise<void> {
  const historyRepository = dependencies.historyRepository ?? new ExecutionRepository(app.prisma);

  app.get("/api/v1/history", async () => historyRepository.listLatest(20));

  app.get("/api/v1/history/:id", async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }

    const execution = await historyRepository.getById(parsed.data.id);
    if (!execution) {
      return reply.status(404).send({ error: "execution_not_found" });
    }

    return execution;
  });
}

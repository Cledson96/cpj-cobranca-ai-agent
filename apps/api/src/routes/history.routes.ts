import type { FastifyInstance } from "fastify";
import { HistoryController } from "../controllers/history.controller.js";
import { ExecutionRepository } from "../modules/executions/execution.repository.js";

export type HistoryRouteDependencies = {
  historyRepository?: Pick<ExecutionRepository, "listLatest" | "getById">;
};

export async function registerHistoryRoutes(
  app: FastifyInstance,
  dependencies: HistoryRouteDependencies = {},
): Promise<void> {
  const historyRepository = dependencies.historyRepository ?? new ExecutionRepository(app.prisma);
  const controller = new HistoryController(historyRepository);

  app.get("/api/v1/history", async () => controller.listLatest());
  app.get("/api/v1/history/:id", async (request, reply) => controller.getById(request, reply));
}

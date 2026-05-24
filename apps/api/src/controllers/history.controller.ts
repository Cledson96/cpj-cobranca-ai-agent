import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { ExecutionRepository } from "../modules/executions/execution.repository.js";

const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export class HistoryController {
  constructor(private readonly historyRepository: Pick<ExecutionRepository, "listLatest" | "getById">) {}

  async listLatest() {
    return this.historyRepository.listLatest(20);
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid_request", details: parsed.error.flatten() });
    }

    const execution = await this.historyRepository.getById(parsed.data.id);
    if (!execution) {
      return reply.status(404).send({ error: "execution_not_found" });
    }

    return execution;
  }
}

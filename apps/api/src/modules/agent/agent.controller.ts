import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";
import type { AgentService } from "@/modules/agent/agent.service.js";

export class AgentController {
  constructor(private readonly agentService: Pick<AgentService, "execute">) {}

  async execute(
    flowType: FlowType,
    schema: z.ZodTypeAny,
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_request",
        details: parsed.error.flatten(),
      });
    }

    try {
      return await this.agentService.execute(flowType, parsed.data);
    } catch (error) {
      request.log.error({ error }, "agent route failed");
      return reply.status(500).send({
        error: "agent_execution_failed",
        message: error instanceof Error ? error.message : "Erro inesperado",
      });
    }
  }
}

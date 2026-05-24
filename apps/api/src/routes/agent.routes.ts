import type { FastifyInstance, FastifyReply } from "fastify";
import {
  complianceRequestSchema,
  documentRequestSchema,
  reviewRequestSchema,
  testsRequestSchema,
} from "@cpj-cobranca/shared/case-schemas";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";
import type { z } from "zod";
import { loadEnv } from "../config/env.js";
import { AgentService } from "../modules/agent/agent.service.js";
import { OpenRouterClient } from "../modules/llm/openrouter.client.js";
import { UsageService } from "../modules/llm/usage.service.js";
import { PromptTemplateService } from "../modules/prompts/prompt-template.service.js";

export type AgentRouteDependencies = {
  agentService?: Pick<AgentService, "execute">;
};

const routes = [
  { method: "review", schema: reviewRequestSchema },
  { method: "compliance", schema: complianceRequestSchema },
  { method: "document", schema: documentRequestSchema },
  { method: "tests", schema: testsRequestSchema },
] as const;

export async function registerAgentRoutes(
  app: FastifyInstance,
  dependencies: AgentRouteDependencies = {},
): Promise<void> {
  const agentService = dependencies.agentService ?? createDefaultAgentService(app);

  for (const route of routes) {
    app.post(`/api/v1/${route.method}`, async (request, reply) => {
      const parsed = route.schema.safeParse(request.body);
      if (!parsed.success) {
        return sendValidationError(reply, parsed.error);
      }

      try {
        return await agentService.execute(route.method as FlowType, parsed.data);
      } catch (error) {
        request.log.error({ error }, "agent route failed");
        return reply.status(500).send({
          error: "agent_execution_failed",
          message: error instanceof Error ? error.message : "Erro inesperado",
        });
      }
    });
  }
}

function createDefaultAgentService(app: FastifyInstance): AgentService {
  const env = loadEnv();
  return new AgentService({
    prisma: app.prisma,
    promptTemplateService: new PromptTemplateService(app.prisma),
    openRouterClient: new OpenRouterClient({
      apiKey: env.OPENROUTER_API_KEY,
      siteUrl: env.OPENROUTER_SITE_URL,
      appTitle: env.OPENROUTER_APP_TITLE,
      fetchGenerationStats: env.OPENROUTER_FETCH_GENERATION_STATS,
    }),
    usageService: new UsageService(app.prisma),
  });
}

function sendValidationError(reply: FastifyReply, error: z.ZodError): FastifyReply {
  return reply.status(400).send({
    error: "invalid_request",
    details: error.flatten(),
  });
}

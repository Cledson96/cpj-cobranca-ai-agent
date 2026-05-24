import type { FastifyInstance } from "fastify";
import {
  complianceRequestSchema,
  documentRequestSchema,
  reviewRequestSchema,
  testsRequestSchema,
} from "@cpj-cobranca/shared/case-schemas";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";
import { loadEnv } from "@/shared/config/env.js";
import { AgentController } from "@/modules/agent/agent.controller.js";
import { AgentService } from "@/modules/agent/agent.service.js";
import { OpenRouterClient } from "@/infrastructure/llm/openrouter.client.js";
import { UsageService } from "@/modules/models/usage.service.js";
import { PromptTemplateService } from "@/modules/prompts/prompt-template.service.js";

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
  const controller = new AgentController(agentService);

  for (const route of routes) {
    app.post(`/api/v1/${route.method}`, async (request, reply) =>
      controller.execute(route.method as FlowType, route.schema, request, reply),
    );
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

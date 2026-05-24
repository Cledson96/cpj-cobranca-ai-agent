import type { FastifyInstance, FastifyReply } from "fastify";
import {
  flowModelSettingUpdateSchema,
  promptTemplateCreateSchema,
} from "@cpj-cobranca/shared/admin-schemas";
import { flowTypeSchema } from "@cpj-cobranca/shared/flow-types";
import { z } from "zod";
import { loadEnv } from "../config/env.js";
import { AdminService } from "../modules/admin/admin.service.js";
import { ExecutionRepository } from "../modules/executions/execution.repository.js";
import { ModelCatalogService } from "../modules/llm/model-catalog.service.js";
import { OpenRouterClient } from "../modules/llm/openrouter.client.js";
import { PromptTemplateService } from "../modules/prompts/prompt-template.service.js";
import { registerAdminAuth } from "../plugins/admin-auth.js";

export type AdminRouteDependencies = {
  adminService?: Pick<
    AdminService,
    | "listPromptTemplates"
    | "createPromptTemplate"
    | "activatePromptTemplate"
    | "syncModels"
    | "listModels"
    | "listFlowSettings"
    | "updateFlowSetting"
    | "getUsageSummary"
    | "listExecutions"
    | "getExecutionDetail"
  >;
  adminToken?: string;
};

const idParamsSchema = z.object({ id: z.string().min(1) });
const flowParamsSchema = z.object({ flowType: flowTypeSchema });
const usageQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function registerAdminRoutes(
  app: FastifyInstance,
  dependencies: AdminRouteDependencies = {},
): Promise<void> {
  const env = loadEnv();
  const adminService = dependencies.adminService ?? createDefaultAdminService(app);

  await app.register(registerAdminAuth, {
    token: dependencies.adminToken ?? env.ADMIN_TOKEN,
  });

  app.get("/api/admin/prompt-templates", async () => adminService.listPromptTemplates());

  app.post("/api/admin/prompt-templates", async (request, reply) => {
    const parsed = promptTemplateCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return reply.status(201).send(await adminService.createPromptTemplate(parsed.data));
  });

  app.post("/api/admin/prompt-templates/:id/activate", async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return adminService.activatePromptTemplate(parsed.data.id);
  });

  app.get("/api/admin/flow-settings", async () => adminService.listFlowSettings());

  app.put("/api/admin/flow-settings/:flowType", async (request, reply) => {
    const params = flowParamsSchema.safeParse(request.params);
    const body = flowModelSettingUpdateSchema.safeParse(request.body);
    if (!params.success) {
      return sendValidationError(reply, params.error);
    }
    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    return adminService.updateFlowSetting(params.data.flowType, body.data);
  });

  app.post("/api/admin/models/sync", async () => adminService.syncModels());

  app.get("/api/admin/models", async () => adminService.listModels());

  app.get("/api/admin/usage/summary", async (request, reply) => {
    const parsed = usageQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return adminService.getUsageSummary(parsed.data);
  });

  app.get("/api/admin/executions", async () => adminService.listExecutions(50));

  app.get("/api/admin/executions/:id", async (request, reply) => {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const execution = await adminService.getExecutionDetail(parsed.data.id);
    if (!execution) {
      return reply.status(404).send({ error: "execution_not_found" });
    }

    return execution;
  });
}

function createDefaultAdminService(app: FastifyInstance): AdminService {
  const env = loadEnv();
  const openRouterClient = new OpenRouterClient({
    apiKey: env.OPENROUTER_API_KEY,
    siteUrl: env.OPENROUTER_SITE_URL,
    appTitle: env.OPENROUTER_APP_TITLE,
    fetchGenerationStats: env.OPENROUTER_FETCH_GENERATION_STATS,
  });
  const promptTemplateService = new PromptTemplateService(app.prisma);
  const historyRepository = new ExecutionRepository(app.prisma);

  return new AdminService(
    app.prisma,
    promptTemplateService,
    new ModelCatalogService(app.prisma, openRouterClient),
    historyRepository,
  );
}

function sendValidationError(reply: FastifyReply, error: z.ZodError): FastifyReply {
  return reply.status(400).send({
    error: "invalid_request",
    details: error.flatten(),
  });
}

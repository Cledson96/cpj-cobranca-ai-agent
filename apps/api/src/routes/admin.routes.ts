import type { FastifyInstance } from "fastify";
import { RateLimitMiddleware } from "../api/classes/RateLimitMiddleware.js";
import { type AppEnv, loadEnv } from "../config/env.js";
import { AdminController } from "../controllers/admin.controller.js";
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
  env?: AppEnv;
};

export async function registerAdminRoutes(
  app: FastifyInstance,
  dependencies: AdminRouteDependencies = {},
): Promise<void> {
  const env = dependencies.env ?? loadEnv();
  const adminService = dependencies.adminService ?? createDefaultAdminService(app);
  const adminToken = dependencies.adminToken ?? env.ADMIN_TOKEN;
  const controller = new AdminController(adminService);

  app.register(registerAdminAuth, {
    token: adminToken,
  });
  RateLimitMiddleware.registerAdmin(app, env, adminToken);

  app.register(async (adminApp) => {
    adminApp.get("/api/admin/prompt-templates", async () => controller.listPromptTemplates());

    adminApp.post("/api/admin/prompt-templates", async (request, reply) =>
      controller.createPromptTemplate(request, reply),
    );

    adminApp.post("/api/admin/prompt-templates/:id/activate", async (request, reply) =>
      controller.activatePromptTemplate(request, reply),
    );

    adminApp.get("/api/admin/flow-settings", async () => controller.listFlowSettings());

    adminApp.put("/api/admin/flow-settings/:flowType", async (request, reply) =>
      controller.updateFlowSetting(request, reply),
    );

    adminApp.post("/api/admin/models/sync", async () => controller.syncModels());

    adminApp.get("/api/admin/models", async () => controller.listModels());

    adminApp.get("/api/admin/usage/summary", async (request, reply) =>
      controller.getUsageSummary(request, reply),
    );

    adminApp.get("/api/admin/executions", async () => controller.listExecutions());

    adminApp.get("/api/admin/executions/:id", async (request, reply) =>
      controller.getExecutionDetail(request, reply),
    );
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

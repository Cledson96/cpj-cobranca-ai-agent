import { describe, expect, it, vi } from "vitest";
import { buildApp } from "@/app";

function createAdminService() {
  return {
    listPromptTemplates: vi.fn().mockResolvedValue([
      {
        id: "7b3f0b8d-82bd-4ec4-9091-22e6fcf1d1e2",
        flowType: "review",
        name: "Review v1",
        version: 1,
        isActive: true,
        systemTemplate: "Sistema",
        userTemplate: "Usuario",
        responseSchemaName: "review",
        notes: null,
        createdAt: "2026-05-23T12:00:00.000Z",
        updatedAt: "2026-05-23T12:00:00.000Z",
      },
    ]),
    createPromptTemplate: vi.fn().mockResolvedValue({ id: "new", version: 2 }),
    activatePromptTemplate: vi.fn().mockResolvedValue({ id: "new", isActive: true }),
    syncModels: vi.fn().mockResolvedValue({ synced: 1 }),
    listModels: vi.fn().mockResolvedValue([{ id: "openai/gpt-4o-mini", name: "GPT-4o mini" }]),
    listFlowSettings: vi.fn().mockResolvedValue([{ flowType: "review" }]),
    updateFlowSetting: vi.fn().mockResolvedValue({ flowType: "review", primaryModel: "openai/gpt-4o-mini" }),
    getUsageSummary: vi.fn().mockResolvedValue({
      request_count: 1,
      success_count: 1,
      failed_count: 0,
      total_tokens: 15,
      cost_usd: 0.0002,
      by_flow: [{ flow_type: "review", request_count: 1, cost_usd: 0.0002 }],
      by_model: [{ model_used: "openai/gpt-4o-mini", request_count: 1, cost_usd: 0.0002 }],
    }),
    listExecutions: vi.fn().mockResolvedValue([]),
    getExecutionDetail: vi.fn().mockResolvedValue({ id: "execution-1" }),
  };
}

function createApp() {
  const adminService = createAdminService();
  return {
    app: buildApp(
      {},
      {
        adminService,
        adminToken: "secret",
      },
    ),
    adminService,
  };
}

describe("admin routes", () => {
  it("requires x-admin-token for admin endpoints", async () => {
    const { app } = createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/prompt-templates",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ error: "unauthorized" });

    await app.close();
  });

  it("lists and creates prompt templates", async () => {
    const { app, adminService } = createApp();

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/admin/prompt-templates",
      headers: { "x-admin-token": "secret" },
    });
    const createPayload = {
      flowType: "review",
      name: "Review v2",
      systemTemplate: "Sistema",
      userTemplate: "Usuario",
      responseSchemaName: "review",
      notes: "nova",
    };
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/admin/prompt-templates",
      headers: { "x-admin-token": "secret" },
      payload: createPayload,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toHaveLength(1);
    expect(createResponse.statusCode).toBe(201);
    expect(adminService.createPromptTemplate).toHaveBeenCalledWith(createPayload);

    await app.close();
  });

  it("activates prompt templates and updates flow settings", async () => {
    const { app, adminService } = createApp();

    const activateResponse = await app.inject({
      method: "POST",
      url: "/api/admin/prompt-templates/template-1/activate",
      headers: { "x-admin-token": "secret" },
    });
    const updatePayload = {
      primaryModel: "openai/gpt-4o-mini",
      fallbackModels: [],
      temperature: 0.1,
      maxTokens: 1800,
      responseFormatMode: "json_schema",
    };
    const updateResponse = await app.inject({
      method: "PUT",
      url: "/api/admin/flow-settings/review",
      headers: { "x-admin-token": "secret" },
      payload: updatePayload,
    });

    expect(activateResponse.statusCode).toBe(200);
    expect(updateResponse.statusCode).toBe(200);
    expect(adminService.activatePromptTemplate).toHaveBeenCalledWith("template-1");
    expect(adminService.updateFlowSetting).toHaveBeenCalledWith("review", updatePayload);

    await app.close();
  });

  it("syncs models, lists models and returns usage summary", async () => {
    const { app, adminService } = createApp();

    const syncResponse = await app.inject({
      method: "POST",
      url: "/api/admin/models/sync",
      headers: { "x-admin-token": "secret" },
    });
    const modelsResponse = await app.inject({
      method: "GET",
      url: "/api/admin/models",
      headers: { "x-admin-token": "secret" },
    });
    const usageResponse = await app.inject({
      method: "GET",
      url: "/api/admin/usage/summary?from=2026-05-23&to=2026-05-24",
      headers: { "x-admin-token": "secret" },
    });

    expect(syncResponse.json()).toEqual({ synced: 1 });
    expect(modelsResponse.json()).toHaveLength(1);
    expect(usageResponse.json()).toHaveProperty("request_count", 1);
    expect(adminService.getUsageSummary).toHaveBeenCalledWith({
      from: "2026-05-23",
      to: "2026-05-24",
    });

    await app.close();
  });

  it("returns execution audit data for the admin UI", async () => {
    const { app, adminService } = createApp();

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/admin/executions",
      headers: { "x-admin-token": "secret" },
    });
    const detailResponse = await app.inject({
      method: "GET",
      url: "/api/admin/executions/execution-1",
      headers: { "x-admin-token": "secret" },
    });

    expect(listResponse.statusCode).toBe(200);
    expect(detailResponse.statusCode).toBe(200);
    expect(adminService.listExecutions).toHaveBeenCalledWith(50);
    expect(adminService.getExecutionDetail).toHaveBeenCalledWith("execution-1");

    await app.close();
  });
});

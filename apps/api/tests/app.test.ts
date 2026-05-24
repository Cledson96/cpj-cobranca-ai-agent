import { describe, expect, it, vi } from "vitest";
import { App, buildApp } from "@/app";
import { loadEnv } from "@/shared/config/env";

function createDependencies() {
  const agentService = {
    execute: vi.fn().mockResolvedValue({
      overall_quality: "good",
      score: 10,
      issues: [],
      positives: [],
      summary: "ok",
    }),
  };
  const adminService = {
    listPromptTemplates: vi.fn().mockResolvedValue([]),
    createPromptTemplate: vi.fn(),
    activatePromptTemplate: vi.fn(),
    syncModels: vi.fn(),
    listModels: vi.fn().mockResolvedValue([]),
    listFlowSettings: vi.fn().mockResolvedValue([]),
    updateFlowSetting: vi.fn(),
    getUsageSummary: vi.fn().mockResolvedValue({
      request_count: 0,
      success_count: 0,
      failed_count: 0,
      total_tokens: 0,
      cost_usd: null,
      by_flow: [],
      by_model: [],
    }),
    listExecutions: vi.fn().mockResolvedValue([]),
    getExecutionDetail: vi.fn().mockResolvedValue(null),
  };

  return {
    agentService,
    adminService,
    adminToken: "secret",
  };
}

describe("App", () => {
  it("creates a Fastify instance and keeps buildApp compatibility", async () => {
    const app = new App({
      serverOptions: { logger: false },
      dependencies: createDependencies(),
      env: loadEnv({}),
    });
    const legacyApp = buildApp({ logger: false }, createDependencies());

    expect(app.instance).toBeDefined();

    const response = await legacyApp.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);

    await app.close();
    await legacyApp.close();
  });

  it("applies CORS from CORS_ORIGIN", async () => {
    const app = buildApp(
      { logger: false },
      createDependencies(),
      loadEnv({ CORS_ORIGIN: "http://admin.local,http://localhost:3001" }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://admin.local" },
    });

    expect(response.headers["access-control-allow-origin"]).toBe("http://admin.local");

    await app.close();
  });

  it("adds security headers and compresses eligible responses", async () => {
    const app = buildApp({ logger: false }, createDependencies(), loadEnv({}));
    app.register(async (scopedApp) => {
      scopedApp.get("/large-payload", async () => ({ payload: "x".repeat(4096) }));
    });

    const healthResponse = await app.inject({ method: "GET", url: "/health" });
    const compressedResponse = await app.inject({
      method: "GET",
      url: "/large-payload",
      headers: { "accept-encoding": "gzip" },
    });

    expect(healthResponse.headers["x-content-type-options"]).toBe("nosniff");
    expect(compressedResponse.headers["content-encoding"]).toBe("gzip");

    await app.close();
  });

  it("rate limits public routes without blocking health checks", async () => {
    const app = buildApp(
      { logger: false },
      createDependencies(),
      loadEnv({ RATE_LIMIT_MAX: "1", RATE_LIMIT_WINDOW: "1 minute" }),
    );

    const firstPublicResponse = await app.inject({
      method: "POST",
      url: "/api/v1/review",
      payload: { code: "const x = 1", language: "typescript" },
    });
    const secondPublicResponse = await app.inject({
      method: "POST",
      url: "/api/v1/review",
      payload: { code: "const x = 2", language: "typescript" },
    });
    const healthResponse = await app.inject({ method: "GET", url: "/health" });

    expect(firstPublicResponse.statusCode).toBe(200);
    expect(secondPublicResponse.statusCode).toBe(429);
    expect(healthResponse.statusCode).toBe(200);

    await app.close();
  });

  it("uses a stricter admin rate limit while keeping admin token protection", async () => {
    const app = buildApp(
      { logger: false },
      createDependencies(),
      loadEnv({ RATE_LIMIT_MAX: "100", ADMIN_RATE_LIMIT_MAX: "1" }),
    );

    const unauthorizedResponse = await app.inject({
      method: "GET",
      url: "/api/admin/prompt-templates",
    });
    const firstAdminResponse = await app.inject({
      method: "GET",
      url: "/api/admin/prompt-templates",
      headers: { "x-admin-token": "secret" },
    });
    const secondAdminResponse = await app.inject({
      method: "GET",
      url: "/api/admin/prompt-templates",
      headers: { "x-admin-token": "secret" },
    });

    expect(unauthorizedResponse.statusCode).toBe(401);
    expect(firstAdminResponse.statusCode).toBe(200);
    expect(secondAdminResponse.statusCode).toBe(429);

    await app.close();
  });
});

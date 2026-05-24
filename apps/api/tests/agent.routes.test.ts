import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app";

function createApp() {
  const agentService = {
    execute: vi.fn().mockImplementation((flowType: string) => {
      if (flowType === "review") {
        return {
          overall_quality: "good",
          score: 9,
          issues: [],
          positives: ["Claro"],
          summary: "Ok",
        };
      }

      if (flowType === "compliance") {
        return {
          compliant: true,
          compliance_score: 100,
          covered_requirements: ["A"],
          missing_requirements: [],
          partial_requirements: [],
          verdict: "Aderente",
        };
      }

      if (flowType === "document") {
        return {
          doc_type: "technical",
          title: "Funcao",
          description: "Descricao",
          inputs: [],
          outputs: [],
          side_effects: [],
          usage_example: "exemplo",
          notes: null,
        };
      }

      return {
        framework: "jest",
        test_file: "example.test.ts",
        test_cases: [],
        coverage_hints: [],
      };
    }),
  };
  const historyRepository = {
    listLatest: vi.fn().mockResolvedValue([
      {
        id: "7d2d5c9b-2a2b-4ad9-8f98-9712b9a93a40",
        type: "review",
        status: "success",
        timestamp: "2026-05-23T12:00:00.000Z",
        duration_ms: 100,
        model_used: "openai/gpt-4o-mini",
        cost_usd: 0.0002,
      },
    ]),
    getById: vi.fn().mockResolvedValue({
      id: "7d2d5c9b-2a2b-4ad9-8f98-9712b9a93a40",
      type: "review",
      status: "success",
      timestamp: "2026-05-23T12:00:00.000Z",
      duration_ms: 100,
      model_used: "openai/gpt-4o-mini",
      cost_usd: 0.0002,
      input_payload: { code: "const x = 1" },
      output_payload: { score: 9 },
      error_message: null,
      prompt_template_id: "template-1",
      prompt_template_version: 1,
      model_requested: "openai/gpt-4o-mini",
      provider: "openrouter",
      generation_id: "gen-1",
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    }),
  };

  return {
    app: buildApp(
      {},
      {
        agentService,
        historyRepository,
      },
    ),
    agentService,
    historyRepository,
  };
}

describe("agent routes", () => {
  it.each([
    [
      "/api/v1/review",
      { code: "const x = 1", language: "typescript" },
      "review",
      "overall_quality",
    ],
    [
      "/api/v1/compliance",
      { task_description: "Fazer A", code: "const x = 1", language: "typescript" },
      "compliance",
      "compliant",
    ],
    [
      "/api/v1/document",
      { code: "const x = 1", language: "typescript", doc_type: "technical" },
      "document",
      "title",
    ],
    [
      "/api/v1/tests",
      { code: "const x = 1", language: "typescript", test_framework: "jest" },
      "tests",
      "test_file",
    ],
  ])("executes %s", async (url, payload, flowType, expectedKey) => {
    const { app, agentService } = createApp();

    const response = await app.inject({
      method: "POST",
      url,
      payload,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty(expectedKey);
    expect(agentService.execute).toHaveBeenCalledWith(flowType, payload);

    await app.close();
  });

  it("returns 400 for invalid public route payloads", async () => {
    const { app } = createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/review",
      payload: { code: "", language: "typescript" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "invalid_request" });

    await app.close();
  });

  it("returns latest history and execution detail", async () => {
    const { app, historyRepository } = createApp();

    const listResponse = await app.inject({ method: "GET", url: "/api/v1/history" });
    const detailResponse = await app.inject({
      method: "GET",
      url: "/api/v1/history/7d2d5c9b-2a2b-4ad9-8f98-9712b9a93a40",
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toHaveLength(1);
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json()).toHaveProperty("input_payload");
    expect(historyRepository.listLatest).toHaveBeenCalledWith(20);

    await app.close();
  });

  it("returns 404 when execution history item is missing", async () => {
    const { app, historyRepository } = createApp();
    historyRepository.getById.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/history/7d2d5c9b-2a2b-4ad9-8f98-9712b9a93a40",
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});

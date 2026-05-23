import { describe, expect, it } from "vitest";
import {
  flowModelSettingUpdateSchema,
  promptTemplateCreateSchema,
  usageSummarySchema,
} from "./admin-schemas";

describe("admin schemas", () => {
  it("validates prompt template creation payloads", () => {
    const payload = promptTemplateCreateSchema.parse({
      flowType: "review",
      name: "Review Padrao v2",
      systemTemplate: "Voce e um revisor tecnico.",
      userTemplate: "Codigo: {{code}}",
      responseSchemaName: "review",
      notes: "Foco em seguranca.",
    });

    expect(payload.flowType).toBe("review");
  });

  it("rejects mismatched flow and response schema names", () => {
    expect(() =>
      promptTemplateCreateSchema.parse({
        flowType: "review",
        name: "Template invalido",
        systemTemplate: "Sistema",
        userTemplate: "Usuario",
        responseSchemaName: "tests",
      }),
    ).toThrow();
  });

  it("validates per-flow model settings", () => {
    const payload = flowModelSettingUpdateSchema.parse({
      primaryModel: "openai/gpt-4o-mini",
      fallbackModels: ["google/gemini-2.5-flash"],
      temperature: 0.1,
      maxTokens: 1800,
      responseFormatMode: "json_schema",
    });

    expect(payload.fallbackModels).toHaveLength(1);
  });

  it("validates usage summary responses", () => {
    const summary = usageSummarySchema.parse({
      request_count: 42,
      success_count: 40,
      failed_count: 2,
      total_tokens: 180200,
      cost_usd: 0.87,
      by_flow: [{ flow_type: "review", request_count: 20, cost_usd: 0.32 }],
      by_model: [{ model_used: "openai/gpt-4o-mini", request_count: 42, cost_usd: 0.87 }],
    });

    expect(summary.failed_count).toBe(2);
  });
});

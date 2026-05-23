import { describe, expect, it } from "vitest";
import {
  buildSeedFlowModelSettings,
  buildSeedPromptTemplates,
} from "../src/modules/prompts/seed-templates";

describe("seed templates", () => {
  it("creates one active versioned prompt template per agent flow", () => {
    const templates = buildSeedPromptTemplates();

    expect(templates).toHaveLength(4);
    expect(templates.map((template) => template.flowType).sort()).toEqual([
      "compliance",
      "document",
      "review",
      "tests",
    ]);

    for (const template of templates) {
      expect(template.version).toBe(1);
      expect(template.isActive).toBe(true);
      expect(template.name).toContain("Padrao");
      expect(template.systemTemplate.length).toBeGreaterThan(80);
      expect(template.userTemplate).toContain("{{");
      expect(template.userTemplate).toContain("}}");
      expect(template.responseSchemaName).toBe(template.flowType);
    }
  });

  it("creates one model setting per agent flow with the configured default model", () => {
    const settings = buildSeedFlowModelSettings("openai/gpt-4o-mini");

    expect(settings).toHaveLength(4);
    expect(settings.map((setting) => setting.flowType).sort()).toEqual([
      "compliance",
      "document",
      "review",
      "tests",
    ]);

    for (const setting of settings) {
      expect(setting.primaryModel).toBe("openai/gpt-4o-mini");
      expect(setting.fallbackModels).toEqual([]);
      expect(setting.temperature).toBeGreaterThanOrEqual(0);
      expect(setting.temperature).toBeLessThanOrEqual(0.3);
      expect(setting.maxTokens).toBeGreaterThanOrEqual(1200);
      expect(setting.responseFormatMode).toBe("json_schema");
    }
  });
});

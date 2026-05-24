import { describe, expect, it } from "vitest";
import {
  OutputValidationError,
  buildResponseJsonSchema,
  parseAgentOutput,
} from "../src/modules/agent/output-parser";

describe("output parser", () => {
  it("parses schema-valid JSON for a flow", () => {
    const result = parseAgentOutput(
      "review",
      JSON.stringify({
        overall_quality: "good",
        score: 9,
        issues: [],
        positives: ["Codigo claro"],
        summary: "Sem problemas relevantes.",
      }),
    );

    expect(result).toMatchObject({
      overall_quality: "good",
      score: 9,
    });
  });

  it("accepts JSON wrapped in markdown fences", () => {
    const result = parseAgentOutput(
      "compliance",
      "```json\n{\"compliant\":true,\"compliance_score\":100,\"covered_requirements\":[\"A\"],\"missing_requirements\":[],\"partial_requirements\":[],\"verdict\":\"ok\"}\n```",
    );

    expect(result).toMatchObject({ compliant: true, compliance_score: 100 });
  });

  it("throws a validation error with a repair prompt when JSON is invalid", () => {
    expect(() => parseAgentOutput("tests", "{\"framework\":\"jest\"}")).toThrow(
      OutputValidationError,
    );

    try {
      parseAgentOutput("tests", "{\"framework\":\"jest\"}");
    } catch (error) {
      expect(error).toBeInstanceOf(OutputValidationError);
      expect((error as OutputValidationError).repairInstructions).toContain("tests");
    }
  });

  it("builds an OpenRouter-compatible JSON schema from the flow response schema", () => {
    const jsonSchema = buildResponseJsonSchema("document");

    expect(jsonSchema).toMatchObject({
      type: "object",
      properties: expect.objectContaining({
        doc_type: expect.any(Object),
        title: expect.any(Object),
      }),
    });
  });
});

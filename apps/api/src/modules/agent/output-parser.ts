import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import { caseResponseSchemas } from "@cpj-cobranca/shared/case-schemas";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";

export class OutputValidationError extends Error {
  readonly repairInstructions: string;

  constructor(
    readonly flowType: FlowType,
    readonly rawOutput: string,
    readonly validationDetails: string,
  ) {
    super(`Resposta invalida para o fluxo ${flowType}: ${validationDetails}`);
    this.name = "OutputValidationError";
    this.repairInstructions =
      `A resposta para o fluxo ${flowType} nao esta no schema esperado. ` +
      "Retorne somente um JSON valido, sem markdown, comentarios ou texto extra, preservando os dados corretos quando possivel.";
  }
}

export function parseAgentOutput(flowType: FlowType, rawOutput: string): unknown {
  const schema = caseResponseSchemas[flowType] as z.ZodTypeAny;
  const jsonText = extractJson(rawOutput);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    throw new OutputValidationError(flowType, rawOutput, getErrorMessage(error));
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new OutputValidationError(flowType, rawOutput, result.error.message);
  }

  return result.data;
}

export function buildResponseJsonSchema(flowType: FlowType): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(caseResponseSchemas[flowType], {
    name: flowType,
    target: "openAi",
  });

  if (
    typeof jsonSchema === "object" &&
    jsonSchema !== null &&
    "definitions" in jsonSchema &&
    jsonSchema.definitions &&
    typeof jsonSchema.definitions === "object" &&
    flowType in jsonSchema.definitions
  ) {
    return jsonSchema.definitions[flowType] as Record<string, unknown>;
  }

  return jsonSchema as Record<string, unknown>;
}

function extractJson(output: string): string {
  const trimmed = output.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

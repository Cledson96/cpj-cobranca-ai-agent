import { describe, expect, it } from "vitest";
import {
  complianceRequestSchema,
  complianceResponseSchema,
  documentRequestSchema,
  documentResponseSchema,
  historyListItemSchema,
  reviewRequestSchema,
  reviewResponseSchema,
  testsRequestSchema,
  testsResponseSchema,
} from "./case-schemas";

describe("case API schemas", () => {
  it("accepts a valid review request and rejects unsupported languages", () => {
    expect(
      reviewRequestSchema.parse({
        code: "function somar(a, b) { return a + b; }",
        language: "javascript",
        context: "Funcao simples",
      }),
    ).toMatchObject({ language: "javascript" });

    expect(() =>
      reviewRequestSchema.parse({
        code: "package main",
        language: "go",
      }),
    ).toThrow();
  });

  it("accepts the exact review response shape required by the case", () => {
    const parsed = reviewResponseSchema.parse({
      overall_quality: "needs_improvement",
      score: 6,
      issues: [
        {
          severity: "high",
          line_hint: "linha 4",
          description: "Interpolacao direta em SQL.",
          suggestion: "Use parametros na query.",
        },
      ],
      positives: ["A funcao tem objetivo claro."],
      summary: "Precisa corrigir pontos de seguranca.",
    });

    expect(parsed.issues[0]?.severity).toBe("high");
  });

  it("validates compliance request and response contracts", () => {
    expect(
      complianceRequestSchema.parse({
        task_description: "Deve salvar uma tentativa de contato.",
        code: "app.post('/contatos', handler)",
        language: "typescript",
      }),
    ).toMatchObject({ language: "typescript" });

    expect(
      complianceResponseSchema.parse({
        compliant: false,
        compliance_score: 60,
        covered_requirements: ["Salva canal e resultado."],
        missing_requirements: ["Nao valida limite diario."],
        partial_requirements: ["Auditoria incompleta."],
        verdict: "A implementacao cobre parte dos criterios.",
      }),
    ).toMatchObject({ compliant: false });
  });

  it("validates documentation request and response contracts", () => {
    expect(
      documentRequestSchema.parse({
        code: "def classify_aging(): pass",
        language: "python",
        doc_type: "technical",
      }),
    ).toMatchObject({ doc_type: "technical" });

    expect(
      documentResponseSchema.parse({
        doc_type: "operational",
        title: "Classificacao de aging",
        description: "Classifica dividas por atraso.",
        inputs: [{ name: "due_date", type: "date", description: "Vencimento." }],
        outputs: [{ name: "bucket", type: "string", description: "Faixa de atraso." }],
        side_effects: [],
        usage_example: "classify_aging(date(2026, 1, 1))",
        notes: null,
      }),
    ).toMatchObject({ doc_type: "operational" });
  });

  it("validates unit test generation contracts", () => {
    expect(
      testsRequestSchema.parse({
        code: "export function calcular() { return 1; }",
        language: "typescript",
        test_framework: "jest",
      }),
    ).toMatchObject({ test_framework: "jest" });

    expect(
      testsResponseSchema.parse({
        framework: "jest",
        test_file: "describe('calcular', () => {})",
        test_cases: [
          {
            name: "calcula no caminho feliz",
            type: "happy_path",
            description: "Valida retorno esperado.",
          },
        ],
        coverage_hints: ["Adicionar caso de erro."],
      }),
    ).toMatchObject({ framework: "jest" });
  });

  it("validates summarized history list items", () => {
    expect(
      historyListItemSchema.parse({
        id: "7d2d5c9b-2a2b-4ad9-8f98-9712b9a93a40",
        type: "review",
        status: "success",
        timestamp: "2026-05-23T12:00:00.000Z",
        duration_ms: 1840,
        model_used: "openai/gpt-4o-mini",
        cost_usd: 0.00014,
      }),
    ).toMatchObject({ status: "success" });
  });
});

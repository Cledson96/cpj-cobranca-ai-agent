import { z } from "zod";
import {
  docTypeSchema,
  executionFlowTypeSchema,
  executionStatusSchema,
  supportedLanguageSchema,
} from "./flow-types.js";

const nonEmptyString = z.string().trim().min(1);

export const reviewRequestSchema = z.object({
  code: nonEmptyString,
  language: supportedLanguageSchema,
  context: z.string().trim().optional(),
});
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

export const reviewResponseSchema = z.object({
  overall_quality: z.enum(["good", "needs_improvement", "critical"]),
  score: z.number().int().min(0).max(10),
  issues: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      line_hint: z.string().nullable(),
      description: nonEmptyString,
      suggestion: nonEmptyString,
    }),
  ),
  positives: z.array(nonEmptyString),
  summary: nonEmptyString,
});
export type ReviewResponse = z.infer<typeof reviewResponseSchema>;

export const complianceRequestSchema = z.object({
  task_description: nonEmptyString,
  code: nonEmptyString,
  language: supportedLanguageSchema,
});
export type ComplianceRequest = z.infer<typeof complianceRequestSchema>;

export const complianceResponseSchema = z.object({
  compliant: z.boolean(),
  compliance_score: z.number().int().min(0).max(100),
  covered_requirements: z.array(nonEmptyString),
  missing_requirements: z.array(nonEmptyString),
  partial_requirements: z.array(nonEmptyString),
  verdict: nonEmptyString,
});
export type ComplianceResponse = z.infer<typeof complianceResponseSchema>;

export const documentRequestSchema = z.object({
  code: nonEmptyString,
  language: supportedLanguageSchema,
  doc_type: docTypeSchema,
});
export type DocumentRequest = z.infer<typeof documentRequestSchema>;

const ioDescriptionSchema = z.object({
  name: nonEmptyString,
  type: nonEmptyString,
  description: nonEmptyString,
});

export const documentResponseSchema = z.object({
  doc_type: docTypeSchema,
  title: nonEmptyString,
  description: nonEmptyString,
  inputs: z.array(ioDescriptionSchema),
  outputs: z.array(ioDescriptionSchema),
  side_effects: z.array(nonEmptyString),
  usage_example: nonEmptyString,
  notes: z.string().nullable(),
});
export type DocumentResponse = z.infer<typeof documentResponseSchema>;

export const testsRequestSchema = z.object({
  code: nonEmptyString,
  language: supportedLanguageSchema,
  test_framework: nonEmptyString,
});
export type TestsRequest = z.infer<typeof testsRequestSchema>;

export const testsResponseSchema = z.object({
  framework: nonEmptyString,
  test_file: nonEmptyString,
  test_cases: z.array(
    z.object({
      name: nonEmptyString,
      type: z.enum(["happy_path", "edge_case", "error_case"]),
      description: nonEmptyString,
    }),
  ),
  coverage_hints: z.array(nonEmptyString),
});
export type TestsResponse = z.infer<typeof testsResponseSchema>;

export const historyListItemSchema = z.object({
  id: z.string().uuid(),
  type: executionFlowTypeSchema,
  status: executionStatusSchema,
  timestamp: z.string().datetime(),
  duration_ms: z.number().int().nonnegative(),
  model_used: z.string().nullable(),
  cost_usd: z.number().nonnegative().nullable(),
});
export type HistoryListItem = z.infer<typeof historyListItemSchema>;

export const executionDetailSchema = historyListItemSchema.extend({
  input_payload: z.unknown(),
  output_payload: z.unknown().nullable(),
  error_message: z.string().nullable(),
  prompt_template_id: z.string().nullable(),
  prompt_template_version: z.number().int().positive().nullable(),
  model_requested: z.string(),
  provider: z.string(),
  generation_id: z.string().nullable(),
  prompt_tokens: z.number().int().nonnegative().nullable(),
  completion_tokens: z.number().int().nonnegative().nullable(),
  total_tokens: z.number().int().nonnegative().nullable(),
});
export type ExecutionDetail = z.infer<typeof executionDetailSchema>;

export const caseResponseSchemas = {
  review: reviewResponseSchema,
  compliance: complianceResponseSchema,
  document: documentResponseSchema,
  tests: testsResponseSchema,
} as const;

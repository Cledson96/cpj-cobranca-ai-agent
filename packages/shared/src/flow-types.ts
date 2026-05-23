import { z } from "zod";

export const flowTypeSchema = z.enum(["review", "compliance", "document", "tests"]);
export type FlowType = z.infer<typeof flowTypeSchema>;

export const executionFlowTypeSchema = z.enum(["review", "compliance", "document", "tests", "batch"]);
export type ExecutionFlowType = z.infer<typeof executionFlowTypeSchema>;

export const executionStatusSchema = z.enum(["success", "failed"]);
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;

export const supportedLanguageSchema = z.enum(["typescript", "javascript", "python"]);
export type SupportedLanguage = z.infer<typeof supportedLanguageSchema>;

export const docTypeSchema = z.enum(["technical", "operational"]);
export type DocType = z.infer<typeof docTypeSchema>;

export const responseSchemaNameSchema = flowTypeSchema;
export type ResponseSchemaName = z.infer<typeof responseSchemaNameSchema>;

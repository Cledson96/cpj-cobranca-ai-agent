import { z } from "zod";
import { flowTypeSchema, responseSchemaNameSchema } from "./flow-types";

const nonEmptyString = z.string().trim().min(1);

export const promptTemplateCreateSchema = z
  .object({
    flowType: flowTypeSchema,
    name: nonEmptyString,
    systemTemplate: nonEmptyString,
    userTemplate: nonEmptyString,
    responseSchemaName: responseSchemaNameSchema,
    notes: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.flowType !== value.responseSchemaName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "responseSchemaName deve corresponder ao flowType",
        path: ["responseSchemaName"],
      });
    }
  });
export type PromptTemplateCreate = z.infer<typeof promptTemplateCreateSchema>;

export const promptTemplateListItemSchema = z.object({
  id: z.string().uuid(),
  flowType: flowTypeSchema,
  name: nonEmptyString,
  version: z.number().int().positive(),
  isActive: z.boolean(),
  systemTemplate: nonEmptyString,
  userTemplate: nonEmptyString,
  responseSchemaName: responseSchemaNameSchema,
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PromptTemplateListItem = z.infer<typeof promptTemplateListItemSchema>;

export const flowModelSettingUpdateSchema = z.object({
  primaryModel: nonEmptyString,
  fallbackModels: z.array(nonEmptyString),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  responseFormatMode: z.enum(["json_schema", "json_object"]),
});
export type FlowModelSettingUpdate = z.infer<typeof flowModelSettingUpdateSchema>;

export const flowModelSettingSchema = flowModelSettingUpdateSchema.extend({
  id: z.string().uuid(),
  flowType: flowTypeSchema,
  updatedAt: z.string().datetime(),
});
export type FlowModelSetting = z.infer<typeof flowModelSettingSchema>;

export const openRouterModelSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString,
  contextLength: z.number().int().positive().nullable(),
  promptPrice: z.number().nonnegative().nullable(),
  completionPrice: z.number().nonnegative().nullable(),
  requestPrice: z.number().nonnegative().nullable(),
  supportedParameters: z.array(nonEmptyString),
  syncedAt: z.string().datetime(),
});
export type OpenRouterModel = z.infer<typeof openRouterModelSchema>;

const usageBucketSchema = z.object({
  request_count: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative().nullable(),
});

export const usageSummarySchema = z.object({
  request_count: z.number().int().nonnegative(),
  success_count: z.number().int().nonnegative(),
  failed_count: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative().nullable(),
  by_flow: z.array(
    usageBucketSchema.extend({
      flow_type: flowTypeSchema,
    }),
  ),
  by_model: z.array(
    usageBucketSchema.extend({
      model_used: nonEmptyString,
    }),
  ),
});
export type UsageSummary = z.infer<typeof usageSummarySchema>;

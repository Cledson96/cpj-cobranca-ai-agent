import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";
import type {
  OpenRouterChatCompletionResult,
  OpenRouterClient,
  OpenRouterMessage,
} from "@/infrastructure/llm/openrouter.client.js";
import { UsageService } from "@/modules/models/usage.service.js";
import type { RenderedPromptTemplate, PromptTemplateService } from "@/modules/prompts/prompt-template.service.js";
import {
  OutputValidationError,
  buildResponseJsonSchema,
  parseAgentOutput,
} from "@/modules/agent/output-parser.js";
import { runAgentGraph } from "@/modules/agent/agent.graph.js";

type PrismaLike = Pick<PrismaClient, "flowModelSetting" | "execution">;

type FlowSetting = {
  flowType: FlowType;
  primaryModel: string;
  fallbackModels: unknown;
  temperature: unknown;
  maxTokens: number;
  responseFormatMode: "json_schema" | "json_object";
};

export type AgentServiceDependencies = {
  prisma: PrismaLike;
  promptTemplateService: Pick<PromptTemplateService, "renderActiveTemplate">;
  openRouterClient: Pick<OpenRouterClient, "createChatCompletion">;
  usageService: Pick<UsageService, "recordExecutionUsage">;
  now?: () => Date;
};

type ExecutionContext = {
  rendered?: RenderedPromptTemplate;
  setting?: FlowSetting;
  llmResult?: OpenRouterChatCompletionResult;
  output?: unknown;
  persisted?: boolean;
};

export class AgentService {
  private readonly now: () => Date;

  constructor(private readonly deps: AgentServiceDependencies) {
    this.now = deps.now ?? (() => new Date());
  }

  async execute(flowType: FlowType, input: Record<string, unknown>): Promise<unknown> {
    const startedAt = this.now();
    const requestHash = hashInput(flowType, input);
    const context: ExecutionContext = {};

    try {
      const finalState = await runAgentGraph(
        { flowType, input },
        {
          loadPromptAndSettings: async () => {
            const rendered = await this.deps.promptTemplateService.renderActiveTemplate(flowType, input);
            const setting = await this.deps.prisma.flowModelSetting.findUnique({
              where: { flowType },
            });
            if (!setting) {
              throw new Error(`Configuracao de modelo nao encontrada para ${flowType}`);
            }

            context.rendered = rendered;
            context.setting = setting as FlowSetting;

            return { rendered, setting };
          },
          callModel: async () => {
            const llmResult = await this.callModel(flowType, context);
            context.llmResult = llmResult;

            return { llmResult };
          },
          validateAndRepair: async () => {
            const output = await this.validateAndRepair(flowType, context);
            context.output = output;

            return { output };
          },
          persistExecution: async () => {
            const persistedExecution = await this.persistExecution({
              flowType,
              input,
              requestHash,
              startedAt,
              context,
              status: "success",
            });
            context.persisted = true;

            return { persistedExecution };
          },
        },
      );

      return finalState.output;
    } catch (error) {
      if (!context.persisted) {
        await this.persistExecution({
          flowType,
          input,
          requestHash,
          startedAt,
          context,
          status: "failed",
          error,
        });
      }

      throw error;
    }
  }

  private async callModel(
    flowType: FlowType,
    context: ExecutionContext,
  ): Promise<OpenRouterChatCompletionResult> {
    const setting = requireSetting(context);
    const rendered = requireRendered(context);

    return this.deps.openRouterClient.createChatCompletion({
      primaryModel: setting.primaryModel,
      fallbackModels: toStringArray(setting.fallbackModels),
      messages: [
        { role: "system", content: rendered.systemPrompt },
        { role: "user", content: rendered.userPrompt },
      ],
      temperature: toNumber(setting.temperature),
      maxTokens: setting.maxTokens,
      responseFormat:
        setting.responseFormatMode === "json_schema"
          ? {
              mode: "json_schema",
              schemaName: flowType,
              jsonSchema: buildResponseJsonSchema(flowType),
            }
          : { mode: "json_object" },
    });
  }

  private async validateAndRepair(flowType: FlowType, context: ExecutionContext): Promise<unknown> {
    const firstResult = requireLlmResult(context);

    try {
      return parseAgentOutput(flowType, firstResult.content);
    } catch (error) {
      if (!(error instanceof OutputValidationError)) {
        throw error;
      }

      const setting = requireSetting(context);
      const repairResult = await this.deps.openRouterClient.createChatCompletion({
        primaryModel: setting.primaryModel,
        fallbackModels: toStringArray(setting.fallbackModels),
        messages: buildRepairMessages(error, firstResult.content),
        temperature: 0,
        maxTokens: setting.maxTokens,
        responseFormat:
          setting.responseFormatMode === "json_schema"
            ? {
                mode: "json_schema",
                schemaName: flowType,
                jsonSchema: buildResponseJsonSchema(flowType),
              }
            : { mode: "json_object" },
      });

      context.llmResult = repairResult;
      return parseAgentOutput(flowType, repairResult.content);
    }
  }

  private async persistExecution(input: {
    flowType: FlowType;
    input: Record<string, unknown>;
    requestHash: string;
    startedAt: Date;
    context: ExecutionContext;
    status: "success" | "failed";
    error?: unknown;
  }) {
    const completedAt = this.now();
    const llmResult = input.context.llmResult;
    const setting = input.context.setting;
    const rendered = input.context.rendered;

    const execution = await this.deps.prisma.execution.create({
      data: {
        flowType: input.flowType,
        status: input.status,
        inputPayload: toInputJson(input.input),
        outputPayload:
          input.status === "success" ? toInputJson(input.context.output) : Prisma.JsonNull,
        errorMessage: input.status === "failed" ? getErrorMessage(input.error) : null,
        durationMs: Math.max(0, completedAt.getTime() - input.startedAt.getTime()),
        requestHash: input.requestHash,
        promptTemplateId: rendered?.template.id ?? null,
        promptTemplateVersion: rendered?.template.version ?? null,
        modelRequested: setting?.primaryModel ?? "nao_configurado",
        modelUsed: llmResult?.modelUsed ?? null,
        provider: "openrouter",
        generationId: llmResult?.generationId ?? null,
        promptTokens: llmResult?.usage.promptTokens ?? null,
        completionTokens: llmResult?.usage.completionTokens ?? null,
        totalTokens: llmResult?.usage.totalTokens ?? null,
        reasoningTokens: llmResult?.usage.reasoningTokens ?? null,
        cachedTokens: llmResult?.usage.cachedTokens ?? null,
        costUsd: llmResult?.usage.costUsd ?? null,
      },
    });

    if (input.status === "success") {
      await this.deps.usageService.recordExecutionUsage({
        createdAt: execution.createdAt,
        flowType: input.flowType,
        status: input.status,
        modelUsed: execution.modelUsed,
        promptTokens: execution.promptTokens,
        completionTokens: execution.completionTokens,
        totalTokens: execution.totalTokens,
        costUsd: toNumberOrNull(execution.costUsd),
      });
    }

    return execution;
  }
}

function buildRepairMessages(
  error: OutputValidationError,
  invalidContent: string,
): OpenRouterMessage[] {
  return [
    {
      role: "system",
      content: error.repairInstructions,
    },
    {
      role: "user",
      content: `${error.repairInstructions}\n\nResposta invalida:\n${invalidContent}`,
    },
  ];
}

function requireRendered(context: ExecutionContext): RenderedPromptTemplate {
  if (!context.rendered) {
    throw new Error("Prompt ainda nao renderizado");
  }

  return context.rendered;
}

function requireSetting(context: ExecutionContext): FlowSetting {
  if (!context.setting) {
    throw new Error("Configuracao de modelo ainda nao carregada");
  }

  return context.setting;
}

function requireLlmResult(context: ExecutionContext): OpenRouterChatCompletionResult {
  if (!context.llmResult) {
    throw new Error("Resultado do modelo ainda nao carregado");
  }

  return context.llmResult;
}

function hashInput(flowType: FlowType, input: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify({ flowType, input })).digest("hex");
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const maybeDecimal = value as { toNumber?: () => number };
    if (typeof maybeDecimal.toNumber === "function") {
      return maybeDecimal.toNumber();
    }
  }

  return Number(value);
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = toNumber(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

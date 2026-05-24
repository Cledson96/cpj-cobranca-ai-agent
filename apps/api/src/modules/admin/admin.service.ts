import type { PrismaClient } from "@prisma/client";
import type {
  FlowModelSettingUpdate,
  PromptTemplateCreate,
} from "@cpj-cobranca/shared/admin-schemas";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";
import type { ExecutionRepository } from "@/modules/history/execution.repository.js";
import type { ModelCatalogService } from "@/modules/models/model-catalog.service.js";
import type { PromptTemplateService } from "@/modules/prompts/prompt-template.service.js";

type PrismaLike = Pick<PrismaClient, "flowModelSetting" | "execution">;

export type UsageSummaryFilters = {
  from?: string | undefined;
  to?: string | undefined;
};

export class AdminService {
  constructor(
    private readonly prisma: PrismaLike,
    private readonly promptTemplateService: PromptTemplateService,
    private readonly modelCatalogService: ModelCatalogService,
    private readonly executionRepository: ExecutionRepository,
  ) {}

  async listPromptTemplates() {
    const templates = await this.promptTemplateService.listTemplates();
    return templates.map((template) => ({
      id: template.id,
      flowType: template.flowType,
      name: template.name,
      version: template.version,
      isActive: template.isActive,
      systemTemplate: template.systemTemplate,
      userTemplate: template.userTemplate,
      responseSchemaName: template.responseSchemaName,
      notes: template.notes,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }));
  }

  async createPromptTemplate(input: PromptTemplateCreate) {
    const template = await this.promptTemplateService.createTemplateVersion(input);
    return {
      ...template,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  async activatePromptTemplate(id: string) {
    const template = await this.promptTemplateService.activateTemplate(id);
    return {
      ...template,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  async syncModels() {
    return this.modelCatalogService.syncModels();
  }

  async listModels() {
    return this.modelCatalogService.listModels();
  }

  async listFlowSettings() {
    const settings = await this.prisma.flowModelSetting.findMany({
      orderBy: { flowType: "asc" },
    });

    return settings.map(mapFlowSetting);
  }

  async updateFlowSetting(flowType: FlowType, input: FlowModelSettingUpdate) {
    const setting = await this.prisma.flowModelSetting.update({
      where: { flowType },
      data: {
        primaryModel: input.primaryModel,
        fallbackModels: input.fallbackModels,
        temperature: input.temperature,
        maxTokens: input.maxTokens,
        responseFormatMode: input.responseFormatMode,
      },
    });

    return mapFlowSetting(setting);
  }

  async getUsageSummary(filters: UsageSummaryFilters) {
    const createdAt = buildDateFilter(filters);
    const executions = await this.prisma.execution.findMany({
      where: createdAt ? { createdAt } : {},
    });
    const byFlow = new Map<string, { request_count: number; cost_usd: number | null }>();
    const byModel = new Map<string, { request_count: number; cost_usd: number | null }>();

    let successCount = 0;
    let failedCount = 0;
    let totalTokens = 0;
    let totalCost: number | null = null;

    for (const execution of executions) {
      if (execution.status === "success") {
        successCount += 1;
      } else {
        failedCount += 1;
      }
      totalTokens += execution.totalTokens ?? 0;
      totalCost = addNullableCost(totalCost, toNumberOrNull(execution.costUsd));

      if (execution.flowType !== "batch") {
        const bucket = byFlow.get(execution.flowType) ?? { request_count: 0, cost_usd: null };
        bucket.request_count += 1;
        bucket.cost_usd = addNullableCost(bucket.cost_usd, toNumberOrNull(execution.costUsd));
        byFlow.set(execution.flowType, bucket);
      }

      if (execution.modelUsed) {
        const bucket = byModel.get(execution.modelUsed) ?? { request_count: 0, cost_usd: null };
        bucket.request_count += 1;
        bucket.cost_usd = addNullableCost(bucket.cost_usd, toNumberOrNull(execution.costUsd));
        byModel.set(execution.modelUsed, bucket);
      }
    }

    return {
      request_count: executions.length,
      success_count: successCount,
      failed_count: failedCount,
      total_tokens: totalTokens,
      cost_usd: totalCost,
      by_flow: [...byFlow.entries()].map(([flow_type, bucket]) => ({
        flow_type,
        ...bucket,
      })),
      by_model: [...byModel.entries()].map(([model_used, bucket]) => ({
        model_used,
        ...bucket,
      })),
    };
  }

  async listExecutions(limit = 50) {
    return this.executionRepository.listLatest(limit);
  }

  async getExecutionDetail(id: string) {
    return this.executionRepository.getById(id);
  }
}

type FlowSettingRecord = Awaited<ReturnType<PrismaClient["flowModelSetting"]["findMany"]>>[number];

function mapFlowSetting(setting: FlowSettingRecord) {
  return {
    id: setting.id,
    flowType: setting.flowType,
    primaryModel: setting.primaryModel,
    fallbackModels: toStringArray(setting.fallbackModels),
    temperature: toNumber(setting.temperature),
    maxTokens: setting.maxTokens,
    responseFormatMode: setting.responseFormatMode,
    updatedAt: setting.updatedAt.toISOString(),
  };
}

function buildDateFilter(filters: UsageSummaryFilters) {
  if (!filters.from && !filters.to) {
    return undefined;
  }

  return {
    ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
    ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
  };
}

function addNullableCost(current: number | null, next: number | null): number | null {
  if (next === null) {
    return current;
  }

  return (current ?? 0) + next;
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

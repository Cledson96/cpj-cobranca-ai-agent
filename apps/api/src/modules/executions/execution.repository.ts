import type { PrismaClient } from "@prisma/client";
import type { ExecutionDetail, HistoryListItem } from "@cpj-cobranca/shared/case-schemas";

type PrismaLike = Pick<PrismaClient, "execution">;

export class ExecutionRepository {
  constructor(private readonly prisma: PrismaLike) {}

  async listLatest(limit = 20): Promise<HistoryListItem[]> {
    const executions = await this.prisma.execution.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return executions.map(toHistoryListItem);
  }

  async getById(id: string): Promise<ExecutionDetail | null> {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
    });

    return execution ? toExecutionDetail(execution) : null;
  }
}

type ExecutionRecord = Awaited<ReturnType<PrismaClient["execution"]["findMany"]>>[number];

function toHistoryListItem(execution: ExecutionRecord): HistoryListItem {
  return {
    id: execution.id,
    type: execution.flowType,
    status: execution.status,
    timestamp: execution.createdAt.toISOString(),
    duration_ms: execution.durationMs,
    model_used: execution.modelUsed,
    cost_usd: toNumberOrNull(execution.costUsd),
  };
}

function toExecutionDetail(execution: ExecutionRecord): ExecutionDetail {
  return {
    ...toHistoryListItem(execution),
    input_payload: execution.inputPayload,
    output_payload: execution.outputPayload,
    error_message: execution.errorMessage,
    prompt_template_id: execution.promptTemplateId,
    prompt_template_version: execution.promptTemplateVersion,
    model_requested: execution.modelRequested,
    provider: execution.provider,
    generation_id: execution.generationId,
    prompt_tokens: execution.promptTokens,
    completion_tokens: execution.completionTokens,
    total_tokens: execution.totalTokens,
  };
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

import type { PrismaClient } from "@prisma/client";
import type { ExecutionStatus, FlowType } from "@cpj-cobranca/shared/flow-types";

type PrismaLike = Pick<PrismaClient, "usageDailyAggregate">;

export type ExecutionUsageTelemetry = {
  createdAt: Date;
  flowType: FlowType;
  status: ExecutionStatus;
  modelUsed: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
};

export class UsageService {
  constructor(private readonly prisma: PrismaLike) {}

  async recordExecutionUsage(telemetry: ExecutionUsageTelemetry): Promise<void> {
    if (!telemetry.modelUsed) {
      return;
    }

    const day = toUtcDay(telemetry.createdAt);
    const successIncrement = telemetry.status === "success" ? 1 : 0;
    const failedIncrement = telemetry.status === "failed" ? 1 : 0;

    await this.prisma.usageDailyAggregate.upsert({
      where: {
        day_flowType_modelUsed: {
          day,
          flowType: telemetry.flowType,
          modelUsed: telemetry.modelUsed,
        },
      },
      create: {
        day,
        flowType: telemetry.flowType,
        modelUsed: telemetry.modelUsed,
        requestCount: 1,
        successCount: successIncrement,
        failedCount: failedIncrement,
        promptTokens: telemetry.promptTokens ?? 0,
        completionTokens: telemetry.completionTokens ?? 0,
        totalTokens: telemetry.totalTokens ?? 0,
        costUsd: telemetry.costUsd ?? 0,
      },
      update: {
        requestCount: { increment: 1 },
        successCount: { increment: successIncrement },
        failedCount: { increment: failedIncrement },
        promptTokens: { increment: telemetry.promptTokens ?? 0 },
        completionTokens: { increment: telemetry.completionTokens ?? 0 },
        totalTokens: { increment: telemetry.totalTokens ?? 0 },
        costUsd: { increment: telemetry.costUsd ?? 0 },
      },
    });
  }
}

function toUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

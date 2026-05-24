import { describe, expect, it, vi } from "vitest";
import { UsageService } from "../src/modules/llm/usage.service";

describe("UsageService", () => {
  it("increments daily aggregate buckets from execution telemetry", async () => {
    const upsert = vi.fn();
    const service = new UsageService({
      usageDailyAggregate: { upsert },
    });

    await service.recordExecutionUsage({
      createdAt: new Date("2026-05-23T19:30:00.000Z"),
      flowType: "review",
      status: "success",
      modelUsed: "openai/gpt-4o-mini",
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      costUsd: 0.0002,
    });

    expect(upsert).toHaveBeenCalledWith({
      where: {
        day_flowType_modelUsed: {
          day: new Date("2026-05-23T00:00:00.000Z"),
          flowType: "review",
          modelUsed: "openai/gpt-4o-mini",
        },
      },
      create: expect.objectContaining({
        day: new Date("2026-05-23T00:00:00.000Z"),
        flowType: "review",
        modelUsed: "openai/gpt-4o-mini",
        requestCount: 1,
        successCount: 1,
        failedCount: 0,
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        costUsd: 0.0002,
      }),
      update: expect.objectContaining({
        requestCount: { increment: 1 },
        successCount: { increment: 1 },
        failedCount: { increment: 0 },
        promptTokens: { increment: 10 },
        completionTokens: { increment: 5 },
        totalTokens: { increment: 15 },
        costUsd: { increment: 0.0002 },
      }),
    });
  });

  it("does not write an aggregate when no model was used", async () => {
    const upsert = vi.fn();
    const service = new UsageService({
      usageDailyAggregate: { upsert },
    });

    await service.recordExecutionUsage({
      createdAt: new Date("2026-05-23T19:30:00.000Z"),
      flowType: "review",
      status: "failed",
      modelUsed: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      costUsd: null,
    });

    expect(upsert).not.toHaveBeenCalled();
  });
});

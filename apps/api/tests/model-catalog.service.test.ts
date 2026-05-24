import { describe, expect, it, vi } from "vitest";
import { ModelCatalogService } from "@/modules/models/model-catalog.service";
import type { OpenRouterClient } from "@/infrastructure/llm/openrouter.client";

describe("ModelCatalogService", () => {
  it("syncs OpenRouter model metadata into Prisma", async () => {
    const upsert = vi.fn();
    const prisma = {
      openRouterModel: {
        upsert,
        findMany: vi.fn(),
      },
    };
    const openRouter = {
      listModels: vi.fn().mockResolvedValue([
        {
          id: "openai/gpt-4o-mini",
          name: "GPT-4o mini",
          contextLength: 128000,
          promptPrice: 0.00000015,
          completionPrice: 0.0000006,
          requestPrice: null,
          supportedParameters: ["response_format"],
          rawMetadata: { id: "openai/gpt-4o-mini" },
        },
      ]),
    } as unknown as OpenRouterClient;
    const service = new ModelCatalogService(prisma, openRouter);

    const result = await service.syncModels();

    expect(result).toEqual({ synced: 1 });
    expect(upsert).toHaveBeenCalledWith({
      where: { id: "openai/gpt-4o-mini" },
      update: expect.objectContaining({
        name: "GPT-4o mini",
        contextLength: 128000,
        supportedParameters: ["response_format"],
      }),
      create: expect.objectContaining({
        id: "openai/gpt-4o-mini",
        name: "GPT-4o mini",
      }),
    });
  });

  it("returns synced models sorted by id with numeric prices", async () => {
    const prisma = {
      openRouterModel: {
        upsert: vi.fn(),
        findMany: vi.fn().mockResolvedValue([
          {
            id: "openai/gpt-4o-mini",
            name: "GPT-4o mini",
            contextLength: 128000,
            promptPrice: { toNumber: () => 0.00000015 },
            completionPrice: { toNumber: () => 0.0000006 },
            requestPrice: null,
            supportedParameters: ["response_format"],
            syncedAt: new Date("2026-05-23T12:00:00.000Z"),
          },
        ]),
      },
    };
    const service = new ModelCatalogService(prisma, {} as OpenRouterClient);

    const result = await service.listModels();

    expect(result).toEqual([
      {
        id: "openai/gpt-4o-mini",
        name: "GPT-4o mini",
        contextLength: 128000,
        promptPrice: 0.00000015,
        completionPrice: 0.0000006,
        requestPrice: null,
        supportedParameters: ["response_format"],
        syncedAt: "2026-05-23T12:00:00.000Z",
      },
    ]);
    expect(prisma.openRouterModel.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
    });
  });
});

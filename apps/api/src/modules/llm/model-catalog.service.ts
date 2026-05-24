import { Prisma, type PrismaClient } from "@prisma/client";
import type { OpenRouterClient, OpenRouterModelMetadata } from "./openrouter.client.js";

type PrismaLike = Pick<PrismaClient, "openRouterModel">;

export class ModelCatalogService {
  constructor(
    private readonly prisma: PrismaLike,
    private readonly openRouter: OpenRouterClient,
  ) {}

  async syncModels(): Promise<{ synced: number }> {
    const models = await this.openRouter.listModels();

    for (const model of models) {
      await this.prisma.openRouterModel.upsert({
        where: { id: model.id },
        update: toPrismaModelData(model),
        create: {
          id: model.id,
          ...toPrismaModelData(model),
        },
      });
    }

    return { synced: models.length };
  }

  async listModels() {
    const models = await this.prisma.openRouterModel.findMany({
      orderBy: { id: "asc" },
    });

    return models.map((model) => ({
      id: model.id,
      name: model.name,
      contextLength: model.contextLength,
      promptPrice: toNumberOrNull(model.promptPrice),
      completionPrice: toNumberOrNull(model.completionPrice),
      requestPrice: toNumberOrNull(model.requestPrice),
      supportedParameters: toStringArray(model.supportedParameters),
      syncedAt: model.syncedAt.toISOString(),
    }));
  }
}

function toPrismaModelData(model: OpenRouterModelMetadata) {
  return {
    name: model.name,
    contextLength: model.contextLength,
    promptPrice: model.promptPrice,
    completionPrice: model.completionPrice,
    requestPrice: model.requestPrice,
    supportedParameters: model.supportedParameters,
    rawMetadata: toInputJson(model.rawMetadata),
    syncedAt: new Date(),
  };
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
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

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

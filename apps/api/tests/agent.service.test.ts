import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { AgentService } from "../src/modules/agent/agent.service";

const renderedTemplate = {
  template: {
    id: "template-1",
    version: 1,
    flowType: "review",
    responseSchemaName: "review",
  },
  systemPrompt: "Sistema",
  userPrompt: "Usuario",
};

const flowSetting = {
  flowType: "review",
  primaryModel: "openai/gpt-4o-mini",
  fallbackModels: ["google/gemini-2.5-flash"],
  temperature: { toNumber: () => 0.1 },
  maxTokens: 1800,
  responseFormatMode: "json_schema",
};

function createService(overrides: Record<string, unknown> = {}) {
  const executionCreate = vi.fn().mockImplementation(({ data }) => ({
    id: "execution-1",
    createdAt: new Date("2026-05-23T12:00:00.000Z"),
    ...data,
  }));
  const prisma = {
    flowModelSetting: {
      findUnique: vi.fn().mockResolvedValue(flowSetting),
    },
    execution: {
      create: executionCreate,
    },
  };
  const promptTemplateService = {
    renderActiveTemplate: vi.fn().mockResolvedValue(renderedTemplate),
  };
  const openRouterClient = {
    createChatCompletion: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        overall_quality: "good",
        score: 9,
        issues: [],
        positives: ["Claro"],
        summary: "Ok",
      }),
      generationId: "gen-1",
      modelUsed: "openai/gpt-4o-mini",
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        reasoningTokens: null,
        cachedTokens: null,
        costUsd: 0.0002,
      },
    }),
  };
  const usageService = {
    recordExecutionUsage: vi.fn(),
  };

  return {
    service: new AgentService({
      prisma,
      promptTemplateService,
      openRouterClient,
      usageService,
      now: () => new Date("2026-05-23T12:00:01.000Z"),
      ...overrides,
    }),
    prisma,
    promptTemplateService,
    openRouterClient,
    usageService,
  };
}

describe("AgentService", () => {
  it("executes a flow, validates output and persists success telemetry", async () => {
    const { service, prisma, openRouterClient, usageService } = createService();

    const output = await service.execute("review", {
      code: "const x = 1",
      language: "typescript",
    });

    expect(output).toMatchObject({ overall_quality: "good", score: 9 });
    expect(openRouterClient.createChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryModel: "openai/gpt-4o-mini",
        fallbackModels: ["google/gemini-2.5-flash"],
        temperature: 0.1,
        maxTokens: 1800,
      }),
    );
    expect(prisma.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        flowType: "review",
        status: "success",
        inputPayload: { code: "const x = 1", language: "typescript" },
        promptTemplateId: "template-1",
        promptTemplateVersion: 1,
        modelRequested: "openai/gpt-4o-mini",
        modelUsed: "openai/gpt-4o-mini",
        generationId: "gen-1",
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        costUsd: 0.0002,
      }),
    });
    expect(usageService.recordExecutionUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        flowType: "review",
        status: "success",
        modelUsed: "openai/gpt-4o-mini",
      }),
    );
  });

  it("runs one repair attempt when the first model output is invalid", async () => {
    const openRouterClient = {
      createChatCompletion: vi
        .fn()
        .mockResolvedValueOnce({
          content: "{\"overall_quality\":\"good\"}",
          generationId: "gen-1",
          modelUsed: "openai/gpt-4o-mini",
          usage: {
            promptTokens: 1,
            completionTokens: 1,
            totalTokens: 2,
            reasoningTokens: null,
            cachedTokens: null,
            costUsd: null,
          },
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            overall_quality: "good",
            score: 8,
            issues: [],
            positives: ["ok"],
            summary: "Corrigido",
          }),
          generationId: "gen-2",
          modelUsed: "openai/gpt-4o-mini",
          usage: {
            promptTokens: 2,
            completionTokens: 2,
            totalTokens: 4,
            reasoningTokens: null,
            cachedTokens: null,
            costUsd: null,
          },
        }),
    };
    const { service } = createService({ openRouterClient });

    const output = await service.execute("review", {
      code: "const x = 1",
      language: "typescript",
    });

    expect(output).toMatchObject({ score: 8 });
    expect(openRouterClient.createChatCompletion).toHaveBeenCalledTimes(2);
    expect(openRouterClient.createChatCompletion.mock.calls[1][0].messages[1].content).toContain(
      "nao esta no schema esperado",
    );
  });

  it("persists failed executions before rethrowing errors", async () => {
    const openRouterClient = {
      createChatCompletion: vi.fn().mockRejectedValue(new Error("sem chave")),
    };
    const { service, prisma, usageService } = createService({ openRouterClient });

    await expect(
      service.execute("review", {
        code: "const x = 1",
        language: "typescript",
      }),
    ).rejects.toThrow("sem chave");

    expect(prisma.execution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        flowType: "review",
        status: "failed",
        errorMessage: "sem chave",
        outputPayload: Prisma.JsonNull,
      }),
    });
    expect(usageService.recordExecutionUsage).not.toHaveBeenCalled();
  });
});

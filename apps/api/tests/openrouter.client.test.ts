import { describe, expect, it, vi } from "vitest";
import {
  OpenRouterClient,
  OpenRouterConfigurationError,
  OpenRouterHttpError,
} from "@/infrastructure/llm/openrouter.client";

const baseConfig = {
  apiKey: "test-key",
  siteUrl: "http://localhost:3001",
  appTitle: "CPJ Cobranca AI Agent",
  fetchGenerationStats: false,
};

describe("OpenRouterClient", () => {
  it("sends chat completions with auth, fallback models and json schema response format", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "gen-123",
          model: "openai/gpt-4o-mini",
          choices: [{ message: { content: "{\"summary\":\"ok\"}" } }],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 8,
            total_tokens: 20,
            prompt_tokens_details: { cached_tokens: 4 },
            completion_tokens_details: { reasoning_tokens: 2 },
            cost: 0.00012,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const client = new OpenRouterClient({ ...baseConfig, fetchImpl: fetchMock });

    const result = await client.createChatCompletion({
      primaryModel: "openai/gpt-4o-mini",
      fallbackModels: ["google/gemini-2.5-flash"],
      messages: [{ role: "user", content: "Responda em JSON" }],
      temperature: 0.1,
      maxTokens: 500,
      responseFormat: {
        mode: "json_schema",
        schemaName: "review",
        jsonSchema: {
          type: "object",
          properties: { summary: { type: "string" } },
          required: ["summary"],
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "HTTP-Referer": "http://localhost:3001",
          "X-OpenRouter-Title": "CPJ Cobranca AI Agent",
          "Content-Type": "application/json",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({
      model: "openai/gpt-4o-mini",
      models: ["openai/gpt-4o-mini", "google/gemini-2.5-flash"],
      temperature: 0.1,
      max_tokens: 500,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "review",
          strict: true,
          schema: {
            type: "object",
            properties: { summary: { type: "string" } },
            required: ["summary"],
          },
        },
      },
    });
    expect(result).toEqual({
      content: "{\"summary\":\"ok\"}",
      generationId: "gen-123",
      modelUsed: "openai/gpt-4o-mini",
      usage: {
        promptTokens: 12,
        completionTokens: 8,
        totalTokens: 20,
        cachedTokens: 4,
        reasoningTokens: 2,
        costUsd: 0.00012,
      },
    });
  });

  it("enriches usage from generation stats when enabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "gen-456",
            model: "openai/gpt-4o-mini",
            choices: [{ message: { content: "{\"summary\":\"ok\"}" } }],
            usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              tokens_prompt: 100,
              tokens_completion: 50,
              total_cost: 0.0015,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    const client = new OpenRouterClient({
      ...baseConfig,
      fetchGenerationStats: true,
      fetchImpl: fetchMock,
    });

    const result = await client.createChatCompletion({
      primaryModel: "openai/gpt-4o-mini",
      fallbackModels: [],
      messages: [{ role: "user", content: "ok" }],
      temperature: 0.1,
      maxTokens: 500,
      responseFormat: { mode: "json_object" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://openrouter.ai/api/v1/generation?id=gen-456",
    );
    expect(result.usage).toMatchObject({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      costUsd: 0.0015,
    });
  });

  it("throws a configuration error when the API key is missing", async () => {
    const client = new OpenRouterClient({ ...baseConfig, apiKey: "" });

    await expect(
      client.createChatCompletion({
        primaryModel: "openai/gpt-4o-mini",
        fallbackModels: [],
        messages: [{ role: "user", content: "ok" }],
        temperature: 0.1,
        maxTokens: 500,
        responseFormat: { mode: "json_object" },
      }),
    ).rejects.toBeInstanceOf(OpenRouterConfigurationError);
  });

  it("throws an http error with provider details on non-2xx responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "sem credito" } }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new OpenRouterClient({ ...baseConfig, fetchImpl: fetchMock });

    await expect(
      client.createChatCompletion({
        primaryModel: "openai/gpt-4o-mini",
        fallbackModels: [],
        messages: [{ role: "user", content: "ok" }],
        temperature: 0.1,
        maxTokens: 500,
        responseFormat: { mode: "json_object" },
      }),
    ).rejects.toMatchObject({
      constructor: OpenRouterHttpError,
      status: 402,
      providerMessage: "sem credito",
    });
  });
});

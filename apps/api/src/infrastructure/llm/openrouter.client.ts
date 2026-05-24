export type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenRouterResponseFormat =
  | {
      mode: "json_schema";
      schemaName: string;
      jsonSchema: Record<string, unknown>;
    }
  | {
      mode: "json_object";
    };

export type OpenRouterChatCompletionRequest = {
  primaryModel: string;
  fallbackModels: string[];
  messages: OpenRouterMessage[];
  responseFormat: OpenRouterResponseFormat;
  temperature: number;
  maxTokens: number;
};

export type OpenRouterUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  reasoningTokens: number | null;
  cachedTokens: number | null;
  costUsd: number | null;
};

export type OpenRouterChatCompletionResult = {
  content: string;
  generationId: string | null;
  modelUsed: string | null;
  usage: OpenRouterUsage;
};

export type OpenRouterModelMetadata = {
  id: string;
  name: string;
  contextLength: number | null;
  promptPrice: number | null;
  completionPrice: number | null;
  requestPrice: number | null;
  supportedParameters: string[];
  rawMetadata: unknown;
};

export type OpenRouterClientConfig = {
  apiKey: string;
  siteUrl: string;
  appTitle: string;
  fetchGenerationStats: boolean;
  fetchImpl?: typeof fetch;
};

type OpenRouterChatResponseBody = {
  id?: string;
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number | string | null;
    completion_tokens?: number | string | null;
    total_tokens?: number | string | null;
    cost?: number | string | null;
    prompt_tokens_details?: {
      cached_tokens?: number | string | null;
    } | null;
    completion_tokens_details?: {
      reasoning_tokens?: number | string | null;
    } | null;
  } | null;
  error?: {
    message?: string;
  };
};

type OpenRouterGenerationStatsBody = {
  data?: {
    tokens_prompt?: number | string | null;
    tokens_completion?: number | string | null;
    total_cost?: number | string | null;
  };
};

type OpenRouterModelsBody = {
  data?: Array<{
    id?: string;
    name?: string;
    context_length?: number | string | null;
    pricing?: {
      prompt?: number | string | null;
      completion?: number | string | null;
      request?: number | string | null;
    } | null;
    supported_parameters?: string[] | null;
  }>;
};

const chatCompletionsUrl = "https://openrouter.ai/api/v1/chat/completions";
const modelsUrl = "https://openrouter.ai/api/v1/models";

export class OpenRouterConfigurationError extends Error {
  constructor() {
    super("OPENROUTER_API_KEY nao configurada");
    this.name = "OpenRouterConfigurationError";
  }
}

export class OpenRouterHttpError extends Error {
  readonly status: number;
  readonly providerMessage: string;

  constructor(status: number, providerMessage: string) {
    super(`OpenRouter retornou HTTP ${status}: ${providerMessage}`);
    this.name = "OpenRouterHttpError";
    this.status = status;
    this.providerMessage = providerMessage;
  }
}

export class OpenRouterClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: OpenRouterClientConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async createChatCompletion(
    request: OpenRouterChatCompletionRequest,
  ): Promise<OpenRouterChatCompletionResult> {
    this.assertConfigured();

    const response = await this.fetchImpl(chatCompletionsUrl, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: request.primaryModel,
        models: [request.primaryModel, ...request.fallbackModels],
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        response_format: toOpenRouterResponseFormat(request.responseFormat),
      }),
    });

    const body = (await parseJson(response)) as OpenRouterChatResponseBody;
    if (!response.ok) {
      throw new OpenRouterHttpError(response.status, extractProviderMessage(body));
    }

    const usage = normalizeUsage(body.usage);
    const generationId = body.id ?? null;

    if (this.config.fetchGenerationStats && generationId) {
      const generationUsage = await this.fetchGenerationUsage(generationId);
      Object.assign(usage, generationUsage);
    }

    return {
      content: body.choices?.[0]?.message?.content ?? "",
      generationId,
      modelUsed: body.model ?? null,
      usage,
    };
  }

  async listModels(): Promise<OpenRouterModelMetadata[]> {
    this.assertConfigured();

    const response = await this.fetchImpl(modelsUrl, {
      method: "GET",
      headers: this.buildHeaders(),
    });
    const body = (await parseJson(response)) as OpenRouterModelsBody & OpenRouterChatResponseBody;
    if (!response.ok) {
      throw new OpenRouterHttpError(response.status, extractProviderMessage(body));
    }

    return (body.data ?? [])
      .filter((model) => Boolean(model.id))
      .map((model) => ({
        id: model.id as string,
        name: model.name || (model.id as string),
        contextLength: toNullableNumber(model.context_length),
        promptPrice: toNullableNumber(model.pricing?.prompt),
        completionPrice: toNullableNumber(model.pricing?.completion),
        requestPrice: toNullableNumber(model.pricing?.request),
        supportedParameters: model.supported_parameters ?? [],
        rawMetadata: model,
      }));
  }

  private async fetchGenerationUsage(generationId: string): Promise<Partial<OpenRouterUsage>> {
    const response = await this.fetchImpl(
      `https://openrouter.ai/api/v1/generation?id=${encodeURIComponent(generationId)}`,
      {
        method: "GET",
        headers: this.buildHeaders(),
      },
    );
    if (!response.ok) {
      return {};
    }

    const body = (await parseJson(response)) as OpenRouterGenerationStatsBody;
    const promptTokens = toNullableNumber(body.data?.tokens_prompt);
    const completionTokens = toNullableNumber(body.data?.tokens_completion);

    return {
      promptTokens,
      completionTokens,
      totalTokens:
        promptTokens !== null && completionTokens !== null ? promptTokens + completionTokens : null,
      costUsd: toNullableNumber(body.data?.total_cost),
    };
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.config.siteUrl,
      "X-OpenRouter-Title": this.config.appTitle,
    };
  }

  private assertConfigured(): void {
    if (!this.config.apiKey.trim()) {
      throw new OpenRouterConfigurationError();
    }
  }
}

function toOpenRouterResponseFormat(format: OpenRouterResponseFormat): Record<string, unknown> {
  if (format.mode === "json_object") {
    return { type: "json_object" };
  }

  return {
    type: "json_schema",
    json_schema: {
      name: format.schemaName,
      strict: true,
      schema: format.jsonSchema,
    },
  };
}

function normalizeUsage(usage: OpenRouterChatResponseBody["usage"]): OpenRouterUsage {
  return {
    promptTokens: toNullableNumber(usage?.prompt_tokens),
    completionTokens: toNullableNumber(usage?.completion_tokens),
    totalTokens: toNullableNumber(usage?.total_tokens),
    reasoningTokens: toNullableNumber(usage?.completion_tokens_details?.reasoning_tokens),
    cachedTokens: toNullableNumber(usage?.prompt_tokens_details?.cached_tokens),
    costUsd: toNullableNumber(usage?.cost),
  };
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text } };
  }
}

function extractProviderMessage(body: OpenRouterChatResponseBody): string {
  return body.error?.message || "erro desconhecido do provedor";
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

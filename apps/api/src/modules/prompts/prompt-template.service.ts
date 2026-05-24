import { PromptTemplate as LangChainPromptTemplate } from "@langchain/core/prompts";
import type { PrismaClient, PromptTemplate } from "@prisma/client";
import type { PromptTemplateCreate } from "@cpj-cobranca/shared/admin-schemas";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";

type PrismaLike = Pick<PrismaClient, "promptTemplate" | "$transaction">;

export type RenderedPromptTemplate = {
  template: PromptTemplate;
  systemPrompt: string;
  userPrompt: string;
};

export class PromptTemplateNotFoundError extends Error {
  constructor(message = "Template de prompt nao encontrado") {
    super(message);
    this.name = "PromptTemplateNotFoundError";
  }
}

export class PromptTemplateService {
  constructor(private readonly prisma: PrismaLike) {}

  async listTemplates(): Promise<PromptTemplate[]> {
    return this.prisma.promptTemplate.findMany({
      orderBy: [{ flowType: "asc" }, { version: "desc" }],
    });
  }

  async getActiveTemplate(flowType: FlowType): Promise<PromptTemplate> {
    const template = await this.prisma.promptTemplate.findFirst({
      where: { flowType, isActive: true },
      orderBy: { version: "desc" },
    });

    if (!template) {
      throw new PromptTemplateNotFoundError(`Nenhum template ativo para o fluxo ${flowType}`);
    }

    return template;
  }

  async renderActiveTemplate(
    flowType: FlowType,
    variables: Record<string, unknown>,
  ): Promise<RenderedPromptTemplate> {
    const template = await this.getActiveTemplate(flowType);

    return {
      template,
      systemPrompt: await renderMustacheTemplate(template.systemTemplate, variables),
      userPrompt: await renderMustacheTemplate(template.userTemplate, variables),
    };
  }

  async createTemplateVersion(input: PromptTemplateCreate): Promise<PromptTemplate> {
    const latest = await this.prisma.promptTemplate.findFirst({
      where: { flowType: input.flowType },
      orderBy: { version: "desc" },
    });
    const version = (latest?.version ?? 0) + 1;

    return this.prisma.promptTemplate.create({
      data: {
        flowType: input.flowType,
        name: input.name,
        version,
        isActive: false,
        systemTemplate: input.systemTemplate,
        userTemplate: input.userTemplate,
        responseSchemaName: input.responseSchemaName,
        notes: input.notes ?? null,
      },
    });
  }

  async activateTemplate(id: string): Promise<PromptTemplate> {
    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.promptTemplate.findUnique({
        where: { id },
      });

      if (!candidate) {
        throw new PromptTemplateNotFoundError();
      }

      if (candidate.flowType !== candidate.responseSchemaName) {
        throw new Error("responseSchemaName deve corresponder ao flowType");
      }

      await tx.promptTemplate.updateMany({
        where: { flowType: candidate.flowType },
        data: { isActive: false },
      });

      return tx.promptTemplate.update({
        where: { id },
        data: { isActive: true },
      });
    });
  }
}

async function renderMustacheTemplate(
  template: string,
  variables: Record<string, unknown>,
): Promise<string> {
  const prompt = LangChainPromptTemplate.fromTemplate(template, {
    templateFormat: "mustache",
  });

  return prompt.format(variables);
}

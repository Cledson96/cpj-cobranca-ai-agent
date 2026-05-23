import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  buildSeedFlowModelSettings,
  buildSeedPromptTemplates,
} from "../src/modules/prompts/seed-templates.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || "openai/gpt-4o-mini";

  for (const template of buildSeedPromptTemplates()) {
    await prisma.promptTemplate.upsert({
      where: {
        flowType_version: {
          flowType: template.flowType,
          version: template.version,
        },
      },
      update: {
        isActive: template.isActive,
        systemTemplate: template.systemTemplate,
        userTemplate: template.userTemplate,
        notes: template.notes,
      },
      create: template,
    });
  }

  for (const setting of buildSeedFlowModelSettings(defaultModel)) {
    await prisma.flowModelSetting.upsert({
      where: {
        flowType: setting.flowType,
      },
      update: {
        primaryModel: setting.primaryModel,
        fallbackModels: setting.fallbackModels,
        temperature: setting.temperature,
        maxTokens: setting.maxTokens,
        responseFormatMode: setting.responseFormatMode,
      },
      create: setting,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

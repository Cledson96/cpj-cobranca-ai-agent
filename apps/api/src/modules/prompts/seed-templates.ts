import type { FlowType } from "@cpj-cobranca/shared/flow-types";

export type SeedPromptTemplate = {
  flowType: FlowType;
  name: string;
  version: number;
  isActive: boolean;
  systemTemplate: string;
  userTemplate: string;
  responseSchemaName: FlowType;
  notes: string;
};

export type SeedFlowModelSetting = {
  flowType: FlowType;
  primaryModel: string;
  fallbackModels: string[];
  temperature: number;
  maxTokens: number;
  responseFormatMode: "json_schema" | "json_object";
};

const flows = ["review", "compliance", "document", "tests"] as const satisfies readonly FlowType[];

export function buildSeedPromptTemplates(): SeedPromptTemplate[] {
  return [
    {
      flowType: "review",
      name: "Review Padrao v1",
      version: 1,
      isActive: true,
      responseSchemaName: "review",
      notes: "Template inicial para revisao automatizada de codigo.",
      systemTemplate:
        "Voce e um revisor tecnico senior do CPJ-Cobranca. Avalie clareza, seguranca, tratamento de erros, complexidade percebida, vazamento de recursos e aderencia a boas praticas. Responda apenas em JSON valido no schema solicitado.",
      userTemplate:
        "Linguagem: {{language}}\nContexto: {{context}}\nCodigo para revisar:\n```{{language}}\n{{code}}\n```",
    },
    {
      flowType: "compliance",
      name: "Compliance Padrao v1",
      version: 1,
      isActive: true,
      responseSchemaName: "compliance",
      notes: "Template inicial para comparacao entre tarefa e implementacao.",
      systemTemplate:
        "Voce e um analista tecnico de aderencia. Compare criterios de aceite com codigo entregue, identifique requisitos cobertos, ausentes e parciais, e evite inferencias sem evidencia no codigo. Responda apenas em JSON valido no schema solicitado.",
      userTemplate:
        "Linguagem: {{language}}\nDescricao da tarefa:\n{{task_description}}\n\nCodigo implementado:\n```{{language}}\n{{code}}\n```",
    },
    {
      flowType: "document",
      name: "Documentacao Padrao v1",
      version: 1,
      isActive: true,
      responseSchemaName: "document",
      notes: "Template inicial para documentacao tecnica e operacional.",
      systemTemplate:
        "Voce e um documentador tecnico do CPJ-Cobranca. Gere documentacao objetiva, util e adequada ao doc_type informado. Para technical, foque assinaturas, tipos e dependencias. Para operational, foque comportamento e impacto de negocio. Responda apenas em JSON valido no schema solicitado.",
      userTemplate:
        "Linguagem: {{language}}\nTipo de documentacao: {{doc_type}}\nCodigo a documentar:\n```{{language}}\n{{code}}\n```",
    },
    {
      flowType: "tests",
      name: "Testes Padrao v1",
      version: 1,
      isActive: true,
      responseSchemaName: "tests",
      notes: "Template inicial para geracao de testes unitarios.",
      systemTemplate:
        "Voce e um especialista em testes automatizados. Gere um arquivo de teste completo, executavel e coerente com o framework solicitado. Cubra caminho feliz, casos de borda e erros, e liste lacunas que ainda exigem revisao manual. Responda apenas em JSON valido no schema solicitado.",
      userTemplate:
        "Linguagem: {{language}}\nFramework de teste: {{test_framework}}\nCodigo a testar:\n```{{language}}\n{{code}}\n```",
    },
  ];
}

export function buildSeedFlowModelSettings(defaultModel: string): SeedFlowModelSetting[] {
  return flows.map((flowType) => ({
    flowType,
    primaryModel: defaultModel,
    fallbackModels: [],
    temperature: flowType === "tests" ? 0.2 : 0.1,
    maxTokens: flowType === "tests" ? 2400 : 1800,
    responseFormatMode: "json_schema",
  }));
}

import { describe, expect, it, vi } from "vitest";
import { PromptTemplateService } from "@/modules/prompts/prompt-template.service";

const activeTemplate = {
  id: "7b3f0b8d-82bd-4ec4-9091-22e6fcf1d1e2",
  flowType: "review",
  name: "Review Padrao v1",
  version: 1,
  isActive: true,
  systemTemplate: "Sistema {{language}}",
  userTemplate: "Codigo {{code}} em {{language}}",
  responseSchemaName: "review",
  notes: null,
  createdAt: new Date("2026-05-23T12:00:00.000Z"),
  updatedAt: new Date("2026-05-23T12:00:00.000Z"),
};

describe("PromptTemplateService", () => {
  it("loads and renders the active prompt template for a flow", async () => {
    const service = new PromptTemplateService({
      promptTemplate: {
        findFirst: vi.fn().mockResolvedValue(activeTemplate),
      },
      $transaction: vi.fn(),
    });

    const rendered = await service.renderActiveTemplate("review", {
      code: "const x = 1",
      language: "typescript",
    });

    expect(rendered).toEqual({
      template: activeTemplate,
      systemPrompt: "Sistema typescript",
      userPrompt: "Codigo const x = 1 em typescript",
    });
  });

  it("creates the next immutable template version without activating it", async () => {
    const findFirst = vi.fn().mockResolvedValue({ version: 3 });
    const create = vi.fn().mockResolvedValue({ id: "new-template", version: 4, isActive: false });
    const service = new PromptTemplateService({
      promptTemplate: {
        findFirst,
        create,
      },
      $transaction: vi.fn(),
    });

    const result = await service.createTemplateVersion({
      flowType: "review",
      name: "Review v4",
      systemTemplate: "Sistema",
      userTemplate: "Usuario",
      responseSchemaName: "review",
      notes: "nova regra",
    });

    expect(result).toEqual({ id: "new-template", version: 4, isActive: false });
    expect(create).toHaveBeenCalledWith({
      data: {
        flowType: "review",
        name: "Review v4",
        version: 4,
        isActive: false,
        systemTemplate: "Sistema",
        userTemplate: "Usuario",
        responseSchemaName: "review",
        notes: "nova regra",
      },
    });
  });

  it("activates one template version per flow in a transaction", async () => {
    const updateMany = vi.fn();
    const update = vi.fn().mockResolvedValue({ ...activeTemplate, id: "candidate", isActive: true });
    const tx = {
      promptTemplate: {
        findUnique: vi.fn().mockResolvedValue({
          id: "candidate",
          flowType: "review",
          responseSchemaName: "review",
        }),
        updateMany,
        update,
      },
    };
    const service = new PromptTemplateService({
      promptTemplate: {},
      $transaction: vi.fn((callback) => callback(tx)),
    });

    const result = await service.activateTemplate("candidate");

    expect(result.id).toBe("candidate");
    expect(updateMany).toHaveBeenCalledWith({
      where: { flowType: "review" },
      data: { isActive: false },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: "candidate" },
      data: { isActive: true },
    });
  });

  it("rejects activation when the response schema does not match the flow", async () => {
    const tx = {
      promptTemplate: {
        findUnique: vi.fn().mockResolvedValue({
          id: "candidate",
          flowType: "review",
          responseSchemaName: "tests",
        }),
      },
    };
    const service = new PromptTemplateService({
      promptTemplate: {},
      $transaction: vi.fn((callback) => callback(tx)),
    });

    await expect(service.activateTemplate("candidate")).rejects.toThrow(
      "responseSchemaName deve corresponder ao flowType",
    );
  });
});

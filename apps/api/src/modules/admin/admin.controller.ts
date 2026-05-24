import type { FastifyReply, FastifyRequest } from "fastify";
import {
  flowModelSettingUpdateSchema,
  promptTemplateCreateSchema,
} from "@cpj-cobranca/shared/admin-schemas";
import { flowTypeSchema } from "@cpj-cobranca/shared/flow-types";
import { z } from "zod";
import type { AdminService } from "@/modules/admin/admin.service.js";

const idParamsSchema = z.object({ id: z.string().min(1) });
const flowParamsSchema = z.object({ flowType: flowTypeSchema });
const usageQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export class AdminController {
  constructor(
    private readonly adminService: Pick<
      AdminService,
      | "listPromptTemplates"
      | "createPromptTemplate"
      | "activatePromptTemplate"
      | "syncModels"
      | "listModels"
      | "listFlowSettings"
      | "updateFlowSetting"
      | "getUsageSummary"
      | "listExecutions"
      | "getExecutionDetail"
    >,
  ) {}

  async listPromptTemplates() {
    return this.adminService.listPromptTemplates();
  }

  async createPromptTemplate(request: FastifyRequest, reply: FastifyReply) {
    const parsed = promptTemplateCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return reply.status(201).send(await this.adminService.createPromptTemplate(parsed.data));
  }

  async activatePromptTemplate(request: FastifyRequest, reply: FastifyReply) {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return this.adminService.activatePromptTemplate(parsed.data.id);
  }

  async listFlowSettings() {
    return this.adminService.listFlowSettings();
  }

  async updateFlowSetting(request: FastifyRequest, reply: FastifyReply) {
    const params = flowParamsSchema.safeParse(request.params);
    const body = flowModelSettingUpdateSchema.safeParse(request.body);
    if (!params.success) {
      return sendValidationError(reply, params.error);
    }
    if (!body.success) {
      return sendValidationError(reply, body.error);
    }

    return this.adminService.updateFlowSetting(params.data.flowType, body.data);
  }

  async syncModels() {
    return this.adminService.syncModels();
  }

  async listModels() {
    return this.adminService.listModels();
  }

  async getUsageSummary(request: FastifyRequest, reply: FastifyReply) {
    const parsed = usageQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    return this.adminService.getUsageSummary(parsed.data);
  }

  async listExecutions() {
    return this.adminService.listExecutions(50);
  }

  async getExecutionDetail(request: FastifyRequest, reply: FastifyReply) {
    const parsed = idParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return sendValidationError(reply, parsed.error);
    }

    const execution = await this.adminService.getExecutionDetail(parsed.data.id);
    if (!execution) {
      return reply.status(404).send({ error: "execution_not_found" });
    }

    return execution;
  }
}

function sendValidationError(reply: FastifyReply, error: z.ZodError): FastifyReply {
  return reply.status(400).send({
    error: "invalid_request",
    details: error.flatten(),
  });
}

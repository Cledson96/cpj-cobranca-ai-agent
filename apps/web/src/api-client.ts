import type {
  FlowModelSetting,
  FlowModelSettingUpdate,
  OpenRouterModel,
  PromptTemplateCreate,
  PromptTemplateListItem,
  UsageSummary,
} from "@cpj-cobranca/shared/admin-schemas";
import type { ExecutionDetail, HistoryListItem } from "@cpj-cobranca/shared/case-schemas";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
const tokenStorageKey = "cpj-admin-token";

export function getStoredAdminToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(tokenStorageKey) || "";
}

export function setStoredAdminToken(token: string): void {
  window.localStorage.setItem(tokenStorageKey, token);
}

export function clearStoredAdminToken(): void {
  window.localStorage.removeItem(tokenStorageKey);
}

export async function getUsageSummary(token: string): Promise<UsageSummary> {
  return adminRequest("/api/admin/usage/summary", token);
}

export async function listExecutions(token: string): Promise<HistoryListItem[]> {
  return adminRequest("/api/admin/executions", token);
}

export async function getExecutionDetail(token: string, id: string): Promise<ExecutionDetail> {
  return adminRequest(`/api/admin/executions/${id}`, token);
}

export async function listPromptTemplates(token: string): Promise<PromptTemplateListItem[]> {
  return adminRequest("/api/admin/prompt-templates", token);
}

export async function createPromptTemplate(
  token: string,
  payload: PromptTemplateCreate,
): Promise<PromptTemplateListItem> {
  return adminRequest("/api/admin/prompt-templates", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function activatePromptTemplate(
  token: string,
  id: string,
): Promise<PromptTemplateListItem> {
  return adminRequest(`/api/admin/prompt-templates/${id}/activate`, token, {
    method: "POST",
  });
}

export async function listModels(token: string): Promise<OpenRouterModel[]> {
  return adminRequest("/api/admin/models", token);
}

export async function syncModels(token: string): Promise<{ synced: number }> {
  return adminRequest("/api/admin/models/sync", token, {
    method: "POST",
  });
}

export async function listFlowSettings(token: string): Promise<FlowModelSetting[]> {
  return adminRequest("/api/admin/flow-settings", token);
}

export async function updateFlowSetting(
  token: string,
  flowType: FlowType,
  payload: FlowModelSettingUpdate,
): Promise<FlowModelSetting> {
  return adminRequest(`/api/admin/flow-settings/${flowType}`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

async function adminRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token,
      ...init.headers,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
  }

  return data as T;
}

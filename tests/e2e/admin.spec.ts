import { expect, test, type Page } from "@playwright/test";

const now = "2026-05-24T03:00:00.000Z";
const executionId = "11111111-1111-4111-8111-111111111111";

test.beforeEach(async ({ page }) => {
  await mockAdminApi(page);
});

test("renders the admin dashboard after token entry", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByLabel("Token administrativo")).toBeVisible();
  await page.getByLabel("Token administrativo").fill("test-token");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "Requisicoes" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "review" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "openai/gpt-4o-mini" })).toBeVisible();
});

test("navigates through prompts, models and execution detail", async ({ page }) => {
  await seedToken(page);
  await page.goto("/admin");

  await page.getByRole("link", { name: "Prompts" }).click();
  await expect(page.getByRole("heading", { name: "Prompts" })).toBeVisible();
  await expect(page.getByText("Review Padrao")).toBeVisible();

  await page.getByRole("link", { name: "Modelos" }).click();
  await expect(page.getByRole("heading", { name: "Modelos" })).toBeVisible();
  await expect(page.getByText("GPT 4o mini")).toBeVisible();

  await page.getByRole("link", { name: "Execucoes" }).click();
  await expect(page.getByRole("heading", { name: "Execucoes" })).toBeVisible();
  await page.getByText("openai/gpt-4o-mini").click();
  await expect(page.getByText("\"model_requested\": \"openai/gpt-4o-mini\"")).toBeVisible();
});

async function seedToken(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("cpj-admin-token", "test-token");
  });
}

async function mockAdminApi(page: Page) {
  await page.route("http://localhost:3000/api/admin/usage/summary", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        request_count: 2,
        success_count: 2,
        failed_count: 0,
        total_tokens: 321,
        cost_usd: 0.0042,
        by_flow: [{ flow_type: "review", request_count: 2, cost_usd: 0.0042 }],
        by_model: [{ model_used: "openai/gpt-4o-mini", request_count: 2, cost_usd: 0.0042 }],
      }),
    });
  });

  await page.route("http://localhost:3000/api/admin/executions", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: executionId,
          type: "review",
          status: "success",
          timestamp: now,
          duration_ms: 820,
          model_used: "openai/gpt-4o-mini",
          cost_usd: 0.0042,
        },
      ]),
    });
  });

  await page.route(`http://localhost:3000/api/admin/executions/${executionId}`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: executionId,
        type: "review",
        status: "success",
        timestamp: now,
        duration_ms: 820,
        model_used: "openai/gpt-4o-mini",
        cost_usd: 0.0042,
        input_payload: { language: "typescript", code: "export const total = 1;" },
        output_payload: { score: 8, issues: [] },
        error_message: null,
        prompt_template_id: "22222222-2222-4222-8222-222222222222",
        prompt_template_version: 1,
        model_requested: "openai/gpt-4o-mini",
        provider: "openrouter",
        generation_id: "gen-1",
        prompt_tokens: 120,
        completion_tokens: 201,
        total_tokens: 321,
      }),
    });
  });

  await page.route("http://localhost:3000/api/admin/prompt-templates", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "22222222-2222-4222-8222-222222222222",
          flowType: "review",
          name: "Review Padrao",
          version: 1,
          isActive: true,
          systemTemplate: "Voce revisa codigo.",
          userTemplate: "Codigo: {{code}}",
          responseSchemaName: "review",
          notes: "seed",
          createdAt: now,
          updatedAt: now,
        },
      ]),
    });
  });

  await page.route("http://localhost:3000/api/admin/models", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "openai/gpt-4o-mini",
          name: "GPT 4o mini",
          contextLength: 128000,
          promptPrice: 0.00000015,
          completionPrice: 0.0000006,
          requestPrice: null,
          supportedParameters: ["response_format"],
          syncedAt: now,
        },
      ]),
    });
  });

  await page.route("http://localhost:3000/api/admin/flow-settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "33333333-3333-4333-8333-333333333333",
          flowType: "review",
          primaryModel: "openai/gpt-4o-mini",
          fallbackModels: ["google/gemini-2.5-flash"],
          temperature: 0.1,
          maxTokens: 1800,
          responseFormatMode: "json_schema",
          updatedAt: now,
        },
      ]),
    });
  });
}

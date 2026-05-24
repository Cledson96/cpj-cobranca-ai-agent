import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

describe("loadEnv", () => {
  it("uses safe defaults for local development", () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.OPENROUTER_DEFAULT_MODEL).toBe("openai/gpt-4o-mini");
    expect(env.OPENROUTER_FETCH_GENERATION_STATS).toBe(true);
    expect(env.OPENROUTER_SITE_URL).toBe("http://localhost:3001");
    expect(env.OPENROUTER_APP_TITLE).toBe("CPJ Cobranca AI Agent");
    expect(env.ADMIN_TOKEN).toBe("change-me-local-admin-token");
  });

  it("coerces a valid PORT value", () => {
    const env = loadEnv({ PORT: "3333" });

    expect(env.PORT).toBe(3333);
  });

  it("rejects invalid PORT values", () => {
    expect(() => loadEnv({ PORT: "abc" })).toThrow();
  });

  it("coerces OpenRouter generation stats flag", () => {
    const env = loadEnv({ OPENROUTER_FETCH_GENERATION_STATS: "false" });

    expect(env.OPENROUTER_FETCH_GENERATION_STATS).toBe(false);
  });
});

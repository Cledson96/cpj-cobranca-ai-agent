import { describe, expect, it } from "vitest";
import { loadEnv } from "../src/config/env";

describe("loadEnv", () => {
  it("uses safe defaults for local development", () => {
    const env = loadEnv({});

    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("coerces a valid PORT value", () => {
    const env = loadEnv({ PORT: "3333" });

    expect(env.PORT).toBe(3333);
  });

  it("rejects invalid PORT values", () => {
    expect(() => loadEnv({ PORT: "abc" })).toThrow();
  });
});

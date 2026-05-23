import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("GET /health", () => {
  it("returns service status and timestamp", async () => {
    const app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    await app.close();

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");

    const body = response.json<{
      status: string;
      service: string;
      timestamp: string;
    }>();

    expect(body.status).toBe("ok");
    expect(body.service).toBe("cpj-cobranca-ai-agent");
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

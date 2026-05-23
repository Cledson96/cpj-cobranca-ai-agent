import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("Prisma plugin", () => {
  it("decorates the Fastify app with a Prisma client", async () => {
    const app = buildApp();

    await app.ready();

    expect(app.prisma).toBeDefined();
    expect(app.prisma.$disconnect).toEqual(expect.any(Function));

    await app.close();
  });
});

import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";
import type { AppEnv } from "@/shared/config/env.js";

export class SecurityMiddleware {
  static register(app: FastifyInstance, env: AppEnv): void {
    app.register(helmet);
    app.register(cors, {
      origin: parseCorsOrigin(env.CORS_ORIGIN),
    });
  }
}

function parseCorsOrigin(value: string): true | string | string[] {
  if (value === "*") {
    return true;
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length <= 1 ? origins[0] ?? value : origins;
}

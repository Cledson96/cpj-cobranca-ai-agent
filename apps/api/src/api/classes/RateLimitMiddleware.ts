import rateLimit from "@fastify/rate-limit";
import type { FastifyError, FastifyInstance, FastifyRequest } from "fastify";
import type { AppEnv } from "../../config/env.js";

export class RateLimitMiddleware {
  static registerGlobal(app: FastifyInstance, env: AppEnv): void {
    app.register(rateLimit, {
      global: true,
      nameSpace: "global",
      max: env.RATE_LIMIT_MAX,
      timeWindow: env.RATE_LIMIT_WINDOW,
      allowList: (request) => shouldSkipGlobalRateLimit(request),
      errorResponseBuilder: () =>
        createRateLimitError("rate_limit_exceeded", "Muitas requisicoes. Tente novamente em instantes."),
    });
  }

  static registerAdmin(app: FastifyInstance, env: AppEnv, adminToken: string): void {
    app.register(rateLimit, {
      global: true,
      nameSpace: "admin",
      max: env.ADMIN_RATE_LIMIT_MAX,
      timeWindow: env.ADMIN_RATE_LIMIT_WINDOW,
      allowList: (request) => request.headers["x-admin-token"] !== adminToken,
      errorResponseBuilder: () =>
        createRateLimitError(
          "admin_rate_limit_exceeded",
          "Muitas requisicoes administrativas. Tente novamente em instantes.",
        ),
    });
  }
}

function shouldSkipGlobalRateLimit(request: FastifyRequest): boolean {
  return request.url === "/health" || request.url.startsWith("/api/admin");
}

function createRateLimitError(code: string, message: string): FastifyError {
  const error = new Error(message) as FastifyError;
  error.code = code;
  error.statusCode = 429;

  return error;
}

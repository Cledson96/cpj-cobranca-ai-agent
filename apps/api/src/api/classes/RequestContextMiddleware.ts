import type { FastifyInstance, FastifyRequest } from "fastify";

const startedAtByRequest = new WeakMap<FastifyRequest, number>();

export class RequestContextMiddleware {
  static register(app: FastifyInstance): void {
    app.addHook("onRequest", async (request, reply) => {
      startedAtByRequest.set(request, Date.now());
      reply.header("x-request-id", request.id);
    });

    app.addHook("onResponse", async (request, reply) => {
      const startedAt = startedAtByRequest.get(request);
      const durationMs = startedAt ? Date.now() - startedAt : undefined;

      request.log.info(
        {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          durationMs,
        },
        "request completed",
      );
    });
  }
}

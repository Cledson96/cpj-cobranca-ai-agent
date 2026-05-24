import compress from "@fastify/compress";
import type { FastifyInstance } from "fastify";

export class CompressionMiddleware {
  static register(app: FastifyInstance): void {
    app.register(compress, {
      global: true,
      threshold: 0,
    });
  }
}

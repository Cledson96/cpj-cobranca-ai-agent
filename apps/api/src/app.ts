import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { CompressionMiddleware } from "./api/classes/compression.middleware.js";
import { ErrorHandlerMiddleware } from "./api/classes/error-handler.middleware.js";
import { RateLimitMiddleware } from "./api/classes/rate-limit.middleware.js";
import { RequestContextMiddleware } from "./api/classes/request-context.middleware.js";
import { SecurityMiddleware } from "./api/classes/security.middleware.js";
import { type AppEnv, loadEnv } from "./config/env.js";
import { registerPrismaPlugin } from "./plugins/prisma.js";
import { registerAdminRoutes, type AdminRouteDependencies } from "./routes/admin.routes.js";
import { registerAgentRoutes, type AgentRouteDependencies } from "./routes/agent.routes.js";
import { registerHistoryRoutes, type HistoryRouteDependencies } from "./routes/history.routes.js";
import { registerHealthRoutes } from "./routes/health.routes.js";

export type AppDependencies = AgentRouteDependencies & HistoryRouteDependencies & AdminRouteDependencies;

export type AppOptions = {
  serverOptions?: FastifyServerOptions;
  dependencies?: AppDependencies;
  env?: AppEnv | undefined;
};

export class App {
  private readonly app: FastifyInstance;
  private readonly dependencies: AppDependencies;
  private readonly env: AppEnv;

  constructor(options: AppOptions = {}) {
    this.env = options.env ?? loadEnv();
    this.dependencies = options.dependencies ?? {};
    this.app = Fastify({
      bodyLimit: this.env.BODY_LIMIT_BYTES,
      requestTimeout: this.env.REQUEST_TIMEOUT_MS,
      ...options.serverOptions,
    });

    RequestContextMiddleware.register(this.app);
    ErrorHandlerMiddleware.register(this.app);

    this.registerMiddlewares();
    this.registerPlugins();
    this.registerRoutes();
  }

  get instance(): FastifyInstance {
    return this.app;
  }

  async start(): Promise<void> {
    await this.app.listen({ port: this.env.PORT, host: this.env.HOST });
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  private registerMiddlewares(): void {
    SecurityMiddleware.register(this.app, this.env);
    CompressionMiddleware.register(this.app);
    RateLimitMiddleware.registerGlobal(this.app, this.env);
  }

  private registerPlugins(): void {
    this.app.register(registerPrismaPlugin);
  }

  private registerRoutes(): void {
    this.app.register(registerHealthRoutes);
    this.app.register(registerAgentRoutes, this.dependencies);
    this.app.register(registerHistoryRoutes, this.dependencies);
    this.app.register(registerAdminRoutes, {
      ...this.dependencies,
      env: this.env,
    });
  }
}

export function buildApp(
  options: FastifyServerOptions = {},
  dependencies: AppDependencies = {},
  env?: AppEnv,
): FastifyInstance {
  return new App({
    serverOptions: options,
    dependencies,
    env,
  }).instance;
}

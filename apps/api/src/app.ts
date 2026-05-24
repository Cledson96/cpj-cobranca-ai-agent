import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import { type AppEnv, loadEnv } from "@/shared/config/index.js";
import {
  CompressionMiddleware,
  ErrorHandlerMiddleware,
  RateLimitMiddleware,
  RequestContextMiddleware,
  SecurityMiddleware,
} from "@/shared/middlewares/index.js";
import { registerPrismaPlugin } from "@/infrastructure/database/index.js";
import { registerAdminRoutes, type AdminRouteDependencies } from "@/modules/admin/index.js";
import { registerAgentRoutes, type AgentRouteDependencies } from "@/modules/agent/index.js";
import { registerHistoryRoutes, type HistoryRouteDependencies } from "@/modules/history/index.js";
import { registerHealthRoutes } from "@/modules/health/index.js";

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

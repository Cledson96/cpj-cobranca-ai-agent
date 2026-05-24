import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadLocalEnvFiles();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  CORS_ORIGIN: z.string().trim().min(1).default("http://localhost:3001"),
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1048576),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW: z.string().trim().min(1).default("1 minute"),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  ADMIN_RATE_LIMIT_WINDOW: z.string().trim().min(1).default("1 minute"),
  DATABASE_URL: z.string().trim().default("file:./dev.db"),
  OPENROUTER_API_KEY: z.string().trim().default(""),
  OPENROUTER_DEFAULT_MODEL: z.string().trim().min(1).default("openai/gpt-4o-mini"),
  OPENROUTER_SITE_URL: z.string().trim().min(1).default("http://localhost:3001"),
  OPENROUTER_APP_TITLE: z.string().trim().min(1).default("CPJ Cobranca AI Agent"),
  OPENROUTER_FETCH_GENERATION_STATS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  ADMIN_TOKEN: z.string().trim().min(1).default("change-me-local-admin-token"),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  return new Env(source).values;
}

export class Env {
  readonly values: AppEnv;

  constructor(source: NodeJS.ProcessEnv = process.env) {
    this.values = envSchema.parse(source);
  }

  get NODE_ENV(): AppEnv["NODE_ENV"] {
    return this.values.NODE_ENV;
  }

  get HOST(): string {
    return this.values.HOST;
  }

  get PORT(): number {
    return this.values.PORT;
  }

  get LOG_LEVEL(): AppEnv["LOG_LEVEL"] {
    return this.values.LOG_LEVEL;
  }
}

function loadLocalEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", "..", ".env"),
  ];

  for (const envPath of [...new Set(candidates)]) {
    if (existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false });
    }
  }
}

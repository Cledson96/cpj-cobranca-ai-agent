import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
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
  return envSchema.parse(source);
}

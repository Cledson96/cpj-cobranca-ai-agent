import { App } from "@/app.js";
import { loadEnv } from "@/shared/config/index.js";

const env = loadEnv();
const app = new App({
  env,
  serverOptions: {
    logger: {
      level: env.LOG_LEVEL,
    },
  },
});

try {
  await app.start();
} catch (error) {
  app.instance.log.error(error);
  process.exit(1);
}

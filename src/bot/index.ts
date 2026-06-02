import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { closeDatabase } from "../db/client.js";
import { createBot } from "./bot.js";

const bot = createBot();

try {
  await bot.api.setChatMenuButton({
    menu_button: {
      type: "web_app",
      text: "Swap",
      web_app: {
        url: env.MINI_APP_PUBLIC_URL
      }
    }
  });
} catch (error) {
  logger.warn({ message: error instanceof Error ? error.message : String(error) }, "failed to set Telegram menu button");
}

bot.catch((error) => {
  logger.error({ error }, "telegram bot error");
});

process.once("SIGINT", async () => {
  bot.stop();
  await closeDatabase();
});
process.once("SIGTERM", async () => {
  bot.stop();
  await closeDatabase();
});

logger.info("telegram bot starting");
await bot.start();

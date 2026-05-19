import { Bot } from "grammy";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { closeDatabase } from "../db/client.js";
import { registerCommands } from "./commands.js";

if (!env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required for the bot");
}

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
registerCommands(bot);

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

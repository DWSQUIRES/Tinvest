import { Bot } from "grammy";
import { env } from "../config/env.js";
import { registerCommands } from "./commands.js";

export function createBot(): Bot {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is required for the bot");
  }

  const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
  registerCommands(bot);
  return bot;
}

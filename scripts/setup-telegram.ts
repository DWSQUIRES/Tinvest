import "dotenv/config";
import { createBot } from "../src/bot/bot.js";
import { env } from "../src/config/env.js";
import { closeDatabase } from "../src/db/client.js";

const bot = createBot();
const webhookUrl = new URL("/api/telegram/webhook", env.MINI_APP_PUBLIC_URL).toString();

await bot.api.setWebhook(webhookUrl, {
  secret_token: env.TELEGRAM_WEBHOOK_SECRET || undefined
});
await bot.api.setChatMenuButton({
  menu_button: {
    type: "web_app",
    text: "Swap",
    web_app: {
      url: env.MINI_APP_PUBLIC_URL
    }
  }
});

console.log(JSON.stringify({ ok: true, webhookUrl, menuUrl: env.MINI_APP_PUBLIC_URL }, null, 2));
await closeDatabase();

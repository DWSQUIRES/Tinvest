import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createBot } from "../../src/bot/bot.js";
import { env } from "../../src/config/env.js";
import { requireAdminSecret } from "../_utils/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!requireAdminSecret(req, res)) {
    return;
  }

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

  res.status(200).json({ ok: true, webhookUrl, menuUrl: env.MINI_APP_PUBLIC_URL });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { webhookCallback } from "grammy";
import { createBot } from "../../src/bot/bot.js";
import { env } from "../../src/config/env.js";

const webhook = webhookCallback(createBot(), "next-js", {
  onTimeout: "return",
  timeoutMilliseconds: 9_000,
  secretToken: env.TELEGRAM_WEBHOOK_SECRET || undefined
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  return webhook(req, res);
}

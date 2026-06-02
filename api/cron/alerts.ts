import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Bot } from "grammy";
import { env } from "../../src/config/env.js";
import { prisma } from "../../src/db/client.js";
import { AlertService } from "../../src/services/alerts.js";
import { requireCronSecret } from "../_utils/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!requireCronSecret(req, res)) {
    return;
  }

  if (!env.TELEGRAM_BOT_TOKEN) {
    res.status(500).json({ error: "TELEGRAM_BOT_TOKEN is not configured" });
    return;
  }

  const result = await new AlertService(prisma, new Bot(env.TELEGRAM_BOT_TOKEN)).runOnce();
  res.status(200).json({ ok: true, result });
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Bot } from "grammy";
import { env } from "../../src/config/env.js";
import { prisma } from "../../src/db/client.js";
import { AlertService } from "../../src/services/alerts.js";
import { CollectorService } from "../../src/services/collector.js";
import { ScoringService } from "../../src/services/scoring.js";
import { StonfiClient } from "../../src/stonfi/client.js";
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

  const collector = new CollectorService(
    prisma,
    new StonfiClient({
      baseUrl: env.STONFI_API_BASE_URL,
      requestTimeoutMs: env.STONFI_REQUEST_TIMEOUT_MS,
      requestRetries: env.STONFI_REQUEST_RETRIES,
      maxPools: env.STONFI_MAX_POOLS
    })
  );
  const collectorResult = await collector.runOnce();
  const scorerResult = await new ScoringService(prisma).runOnce();
  const alertsResult = env.TELEGRAM_BOT_TOKEN
    ? await new AlertService(prisma, new Bot(env.TELEGRAM_BOT_TOKEN)).runOnce()
    : { skipped: true, reason: "TELEGRAM_BOT_TOKEN is not configured" };

  res.status(200).json({
    ok: true,
    result: {
      collector: collectorResult,
      scorer: scorerResult,
      alerts: alertsResult
    }
  });
}

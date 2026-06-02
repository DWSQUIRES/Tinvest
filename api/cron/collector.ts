import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "../../src/config/env.js";
import { prisma } from "../../src/db/client.js";
import { CollectorService } from "../../src/services/collector.js";
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

  const service = new CollectorService(
    prisma,
    new StonfiClient({
      baseUrl: env.STONFI_API_BASE_URL,
      requestTimeoutMs: env.STONFI_REQUEST_TIMEOUT_MS,
      requestRetries: env.STONFI_REQUEST_RETRIES,
      maxPools: env.STONFI_MAX_POOLS
    })
  );
  const result = await service.runOnce();
  res.status(200).json({ ok: true, result });
}

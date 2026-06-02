import type { VercelRequest, VercelResponse } from "@vercel/node";
import { env } from "../../src/config/env.js";

export function requireAdminSecret(req: VercelRequest, res: VercelResponse): boolean {
  if (!env.ADMIN_SECRET) {
    res.status(500).json({ error: "ADMIN_SECRET is not configured" });
    return false;
  }

  const authorization = req.headers.authorization;
  if (authorization !== `Bearer ${env.ADMIN_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

export function requireCronSecret(req: VercelRequest, res: VercelResponse): boolean {
  if (!env.CRON_SECRET) {
    res.status(500).json({ error: "CRON_SECRET is not configured" });
    return false;
  }

  const authorization = req.headers.authorization;
  if (authorization !== `Bearer ${env.CRON_SECRET}`) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

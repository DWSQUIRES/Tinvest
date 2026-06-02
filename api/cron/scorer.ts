import type { VercelRequest, VercelResponse } from "@vercel/node";
import { prisma } from "../../src/db/client.js";
import { ScoringService } from "../../src/services/scoring.js";
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

  const result = await new ScoringService(prisma).runOnce();
  res.status(200).json({ ok: true, result });
}

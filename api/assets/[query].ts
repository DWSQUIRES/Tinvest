import type { VercelRequest, VercelResponse } from "@vercel/node";
import { apiError, assetResponse } from "../../src/server/handlers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const query = Array.isArray(req.query.query) ? req.query.query[0] : req.query.query;
  if (!query) {
    res.status(400).json({ error: "Missing asset query" });
    return;
  }

  try {
    res.status(200).json(await assetResponse(query));
  } catch (error) {
    const result = apiError(error);
    res.status(result.status).json(result.body);
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { aiSwapCheckResponse, apiError } from "../../src/server/handlers.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    res.status(200).json(await aiSwapCheckResponse(req.body));
  } catch (error) {
    const result = apiError(error);
    res.status(result.status).json(result.body);
  }
}

import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { prisma } from "../db/client.js";
import { AssetRepository } from "../repositories/assets.js";
import { ScoreRepository } from "../repositories/scores.js";
import { StonfiSwapService } from "../services/swap/stonfi-swap.js";

const app = express();
const swap = new StonfiSwapService(prisma);
const assets = new AssetRepository(prisma);
const scores = new ScoreRepository(prisma);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(__dirname, "../../miniapp");

app.use(express.json({ limit: "32kb" }));
app.use(express.static(staticDir));

app.get("/tonconnect-manifest.json", (_req, res) => {
  res.json({
    url: env.MINI_APP_PUBLIC_URL,
    name: env.MINI_APP_NAME,
    iconUrl: env.MINI_APP_ICON_URL
  });
});

app.get("/api/config", (_req, res) => {
  res.json({
    manifestUrl: new URL("/tonconnect-manifest.json", env.MINI_APP_PUBLIC_URL).toString(),
    defaultSlippage: env.DEFAULT_SWAP_SLIPPAGE
  });
});

app.get("/api/assets/:query", async (req, res) => {
  try {
    const asset = await assets.findAssetByQuery(req.params.query);
    if (!asset) {
      res.status(404).json({ error: "Token not found" });
      return;
    }

    const score = await scores.latestForAsset(asset.id);
    res.json({
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      decimals: asset.decimals,
      score: score
        ? {
            opportunityScore: score.opportunityScore,
            riskScore: score.riskScore,
            rank: score.rank
          }
        : null
    });
  } catch (error) {
    sendError(res, error);
  }
});

const quoteSchema = z.object({
  token: z.string().min(1),
  amountTon: z.string().regex(/^\d+(\.\d+)?$/),
  slippageTolerance: z.string().regex(/^0(\.\d+)?$|^1(\.0+)?$/).optional()
});

app.post("/api/swap/quote", async (req, res) => {
  try {
    const input = quoteSchema.parse(req.body);
    res.json(await swap.quote(input));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/swap/transaction", async (req, res) => {
  try {
    const input = quoteSchema
      .extend({
        walletAddress: z.string().min(30)
      })
      .parse(req.body);
    res.json(await swap.transaction(input));
  } catch (error) {
    sendError(res, error);
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(staticDir, "index.html"));
});

app.listen(env.SERVER_PORT, () => {
  logger.info({ port: env.SERVER_PORT }, "mini app server listening");
});

function sendError(res: express.Response, error: unknown): void {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = error instanceof z.ZodError ? 400 : message.includes("not found") ? 404 : 500;
  logger.warn({ error }, "request failed");
  res.status(status).json({ error: message });
}

import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  aiSwapCheckResponse,
  apiError,
  assetResponse,
  configResponse,
  swapQuoteResponse,
  swapTransactionResponse,
  tonconnectManifestResponse
} from "./handlers.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.resolve(__dirname, "../../miniapp");

app.use(express.json({ limit: "32kb" }));
app.use(express.static(staticDir));

app.get("/tonconnect-manifest.json", (_req, res) => {
  res.json(tonconnectManifestResponse());
});

app.get("/api/config", (_req, res) => {
  res.json(configResponse());
});

app.get("/api/assets/:query", async (req, res) => {
  try {
    res.json(await assetResponse(req.params.query));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/swap/quote", async (req, res) => {
  try {
    res.json(await swapQuoteResponse(req.body));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/swap/transaction", async (req, res) => {
  try {
    res.json(await swapTransactionResponse(req.body));
  } catch (error) {
    sendError(res, error);
  }
});

app.post("/api/ai/swap-check", async (req, res) => {
  try {
    res.json(await aiSwapCheckResponse(req.body));
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
  const result = apiError(error);
  res.status(result.status).json(result.body);
}

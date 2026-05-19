import { logger } from "../config/logger.js";
import { sleep } from "../utils/time.js";
import { extractCollection, normalizeAsset, normalizePool } from "./normalizers.js";
import type { StonfiAsset, StonfiPool, StonfiSnapshot } from "./types.js";

export type StonfiClientOptions = {
  baseUrl?: string;
  requestTimeoutMs?: number;
  requestRetries?: number;
  maxPools?: number;
};

export class StonfiClient {
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly requestRetries: number;
  private readonly maxPools: number;

  constructor(options: StonfiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? process.env.STONFI_API_BASE_URL ?? "https://api.ston.fi";
    this.requestTimeoutMs = options.requestTimeoutMs ?? Number(process.env.STONFI_REQUEST_TIMEOUT_MS ?? 30_000);
    this.requestRetries = options.requestRetries ?? Number(process.env.STONFI_REQUEST_RETRIES ?? 3);
    this.maxPools = options.maxPools ?? Number(process.env.STONFI_MAX_POOLS ?? 1_000);
  }

  async fetchSnapshot(): Promise<StonfiSnapshot> {
    const [assets, pools] = await Promise.all([this.fetchAssets(), this.fetchPools()]);
    const byId = new Map(assets.map((asset) => [asset.id, asset]));
    const enrichedPools = pools.map((pool) => ({
      ...pool,
      baseAsset: byId.get(pool.baseAsset.id) ?? pool.baseAsset,
      quoteAsset: pool.quoteAsset ? byId.get(pool.quoteAsset.id) ?? pool.quoteAsset : undefined
    }));

    return { assets, pools: enrichedPools };
  }

  async fetchAssets(): Promise<StonfiAsset[]> {
    const payload = await this.getJson("/v1/assets");
    return extractCollection(payload, ["assets"]).map((row) => normalizeAsset(row)).filter((asset): asset is StonfiAsset => Boolean(asset));
  }

  async fetchPools(): Promise<StonfiPool[]> {
    const payload = await this.getJson("/v1/pools");
    const pools = extractCollection(payload, ["pools"])
      .map(normalizePool)
      .filter((pool): pool is StonfiPool => Boolean(pool))
      .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))
      .slice(0, this.maxPools);

    if (pools.length === 0) {
      logger.warn("STON.fi pools response normalized to zero pools");
    }

    return pools;
  }

  private async getJson(path: string): Promise<unknown> {
    const url = new URL(path, this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`);
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.requestRetries; attempt += 1) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(this.requestTimeoutMs),
          headers: {
            accept: "application/json",
            "user-agent": "ton-economic-watchers/0.1.0"
          }
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`STON.fi request failed ${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
        }

        return response.json();
      } catch (error) {
        lastError = error;
        logger.warn({ path, attempt, error }, "STON.fi request attempt failed");
        if (attempt < this.requestRetries) {
          await sleep(attempt * 1_000);
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`STON.fi request failed for ${path}`);
  }
}

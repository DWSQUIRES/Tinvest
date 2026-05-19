import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { logger } from "../config/logger.js";
import { AssetRepository } from "../repositories/assets.js";
import { JobRepository } from "../repositories/jobs.js";
import { MetricsRepository } from "../repositories/metrics.js";
import type { StonfiClient } from "../stonfi/client.js";
import type { StonfiAsset, StonfiPool } from "../stonfi/types.js";

export type CollectorResult = {
  assets: number;
  pools: number;
  snapshots: number;
};

export class CollectorService {
  private readonly assets: AssetRepository;
  private readonly metrics: MetricsRepository;
  private readonly jobs: JobRepository;

  constructor(
    private readonly db: PrismaClient,
    private readonly stonfi: StonfiClient
  ) {
    this.assets = new AssetRepository(db);
    this.metrics = new MetricsRepository(db);
    this.jobs = new JobRepository(db);
  }

  async runOnce(): Promise<CollectorResult> {
    const jobId = await this.jobs.start("collector");
    try {
      const snapshot = await this.stonfi.fetchSnapshot();
      const assetMap = new Map<string, StonfiAsset>();

      for (const pool of snapshot.pools) {
        assetMap.set(pool.baseAsset.id, pool.baseAsset);
        if (pool.quoteAsset) {
          assetMap.set(pool.quoteAsset.id, pool.quoteAsset);
        }
      }

      await this.assets.upsertAssets(
        [...assetMap.values()].map((asset) => ({
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          decimals: asset.decimals,
          imageUrl: asset.imageUrl,
          metadata: asset.raw as Prisma.InputJsonObject
        }))
      );

      await this.assets.upsertPools(snapshot.pools.map((pool) => this.poolInput(pool)));
      await this.metrics.createPoolSnapshots(snapshot.pools.map((pool) => this.snapshotInput(pool)));

      const result = { assets: assetMap.size, pools: snapshot.pools.length, snapshots: snapshot.pools.length };
      await this.jobs.finish(jobId, "SUCCESS", undefined, result);
      logger.info(result, "collector completed");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.jobs.finish(jobId, "FAILED", message);
      logger.error({ error }, "collector failed");
      throw error;
    }
  }

  private poolInput(pool: StonfiPool) {
    return {
      id: pool.id,
      address: pool.address,
      baseAssetId: pool.baseAsset.id,
      quoteAssetId: pool.quoteAsset?.id,
      lpFeeBps: pool.lpFeeBps,
      protocolFeeBps: pool.protocolFeeBps,
      metadata: pool.raw as Prisma.InputJsonObject
    };
  }

  private snapshotInput(pool: StonfiPool) {
    return {
      poolId: pool.id,
      liquidityUsd: pool.liquidityUsd,
      volume24hUsd: pool.volume24hUsd,
      volume7dUsd: pool.volume7dUsd,
      priceUsd: pool.priceUsd,
      txCount24h: pool.txCount24h,
      raw: pool.raw as Prisma.InputJsonObject
    };
  }
}

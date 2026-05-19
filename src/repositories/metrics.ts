import type { PoolMetricSnapshot, Prisma, PrismaClient } from "@prisma/client";

export type CreatePoolMetricSnapshotInput = {
  poolId: string;
  capturedAt?: Date;
  liquidityUsd?: number;
  volume24hUsd?: number;
  volume7dUsd?: number;
  priceUsd?: number;
  txCount24h?: number;
  raw: Prisma.InputJsonValue;
};

export class MetricsRepository {
  constructor(private readonly db: PrismaClient) {}

  async createPoolSnapshot(input: CreatePoolMetricSnapshotInput): Promise<PoolMetricSnapshot> {
    return this.db.poolMetricSnapshot.create({
      data: {
        poolId: input.poolId,
        capturedAt: input.capturedAt,
        liquidityUsd: input.liquidityUsd,
        volume24hUsd: input.volume24hUsd,
        volume7dUsd: input.volume7dUsd,
        priceUsd: input.priceUsd,
        txCount24h: input.txCount24h,
        raw: input.raw
      }
    });
  }

  async createPoolSnapshots(inputs: CreatePoolMetricSnapshotInput[], batchSize = 250): Promise<void> {
    for (let index = 0; index < inputs.length; index += batchSize) {
      const batch = inputs.slice(index, index + batchSize);
      await this.db.poolMetricSnapshot.createMany({
        data: batch.map((input) => ({
          poolId: input.poolId,
          capturedAt: input.capturedAt,
          liquidityUsd: input.liquidityUsd,
          volume24hUsd: input.volume24hUsd,
          volume7dUsd: input.volume7dUsd,
          priceUsd: input.priceUsd,
          txCount24h: input.txCount24h,
          raw: input.raw
        }))
      });
    }
  }

  async latestSnapshotByPool(poolId: string): Promise<PoolMetricSnapshot | null> {
    return this.db.poolMetricSnapshot.findFirst({
      where: { poolId },
      orderBy: { capturedAt: "desc" }
    });
  }

  async latestSnapshotsByAsset(assetId: string, limit = 20) {
    return this.db.poolMetricSnapshot.findMany({
      where: {
        pool: {
          baseAssetId: assetId
        }
      },
      include: {
        pool: {
          include: {
            baseAsset: true,
            quoteAsset: true
          }
        }
      },
      orderBy: { capturedAt: "desc" },
      take: limit
    });
  }

  async latestPoolSnapshots(limit = 250) {
    const pools = await this.db.pool.findMany({
      include: {
        baseAsset: true,
        quoteAsset: true,
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1
        }
      },
      take: limit
    });

    return pools
      .map((pool) => ({ pool, snapshot: pool.snapshots[0] }))
      .filter((item) => item.snapshot !== undefined);
  }
}

import type { Asset, Pool, Prisma, PrismaClient } from "@prisma/client";

export type UpsertAssetInput = {
  id: string;
  symbol: string;
  name?: string;
  decimals?: number;
  imageUrl?: string;
  metadata?: Prisma.InputJsonValue;
};

export type UpsertPoolInput = {
  id: string;
  address?: string;
  baseAssetId: string;
  quoteAssetId?: string;
  lpFeeBps?: number;
  protocolFeeBps?: number;
  metadata?: Prisma.InputJsonValue;
};

export class AssetRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertAsset(input: UpsertAssetInput): Promise<Asset> {
    return this.db.asset.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        symbol: input.symbol,
        name: input.name,
        decimals: input.decimals,
        imageUrl: input.imageUrl,
        metadata: input.metadata ?? {}
      },
      update: {
        symbol: input.symbol,
        name: input.name,
        decimals: input.decimals,
        imageUrl: input.imageUrl,
        metadata: input.metadata ?? {}
      }
    });
  }

  async upsertAssets(inputs: UpsertAssetInput[], batchSize = 100): Promise<void> {
    for (let index = 0; index < inputs.length; index += batchSize) {
      const batch = inputs.slice(index, index + batchSize);
      await this.db.$transaction(
        batch.map((input) =>
          this.db.asset.upsert({
            where: { id: input.id },
            create: {
              id: input.id,
              symbol: input.symbol,
              name: input.name,
              decimals: input.decimals,
              imageUrl: input.imageUrl,
              metadata: input.metadata ?? {}
            },
            update: {
              symbol: input.symbol,
              name: input.name,
              decimals: input.decimals,
              imageUrl: input.imageUrl,
              metadata: input.metadata ?? {}
            }
          })
        )
      );
    }
  }

  async upsertPool(input: UpsertPoolInput): Promise<Pool> {
    return this.db.pool.upsert({
      where: { id: input.id },
      create: {
        id: input.id,
        address: input.address,
        baseAssetId: input.baseAssetId,
        quoteAssetId: input.quoteAssetId,
        lpFeeBps: input.lpFeeBps,
        protocolFeeBps: input.protocolFeeBps,
        metadata: input.metadata ?? {}
      },
      update: {
        address: input.address,
        baseAssetId: input.baseAssetId,
        quoteAssetId: input.quoteAssetId,
        lpFeeBps: input.lpFeeBps,
        protocolFeeBps: input.protocolFeeBps,
        metadata: input.metadata ?? {}
      }
    });
  }

  async upsertPools(inputs: UpsertPoolInput[], batchSize = 100): Promise<void> {
    for (let index = 0; index < inputs.length; index += batchSize) {
      const batch = inputs.slice(index, index + batchSize);
      await this.db.$transaction(
        batch.map((input) =>
          this.db.pool.upsert({
            where: { id: input.id },
            create: {
              id: input.id,
              address: input.address,
              baseAssetId: input.baseAssetId,
              quoteAssetId: input.quoteAssetId,
              lpFeeBps: input.lpFeeBps,
              protocolFeeBps: input.protocolFeeBps,
              metadata: input.metadata ?? {}
            },
            update: {
              address: input.address,
              baseAssetId: input.baseAssetId,
              quoteAssetId: input.quoteAssetId,
              lpFeeBps: input.lpFeeBps,
              protocolFeeBps: input.protocolFeeBps,
              metadata: input.metadata ?? {}
            }
          })
        )
      );
    }
  }

  async findAssetByQuery(query: string): Promise<Asset | null> {
    const normalized = query.trim();
    if (!normalized) {
      return null;
    }

    const byId = await this.db.asset.findUnique({ where: { id: normalized } });
    if (byId) {
      return byId;
    }

    return this.db.asset.findFirst({
      where: {
        symbol: {
          equals: normalized.toUpperCase(),
          mode: "insensitive"
        }
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  async listAssetsBySymbols(symbols: string[]): Promise<Asset[]> {
    return this.db.asset.findMany({
      where: {
        symbol: {
          in: symbols
        }
      }
    });
  }
}

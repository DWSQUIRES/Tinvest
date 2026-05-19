import { Prisma, type PrismaClient, type ScoreSnapshot } from "@prisma/client";

export type CreateScoreSnapshotInput = {
  assetId: string;
  capturedAt?: Date;
  rank?: number;
  opportunityScore: number;
  riskScore: number;
  liquidityScore: number;
  activityScore: number;
  marketHealthScore: number;
  stabilityScore: number;
  ecosystemScore: number;
  reasons: Prisma.InputJsonValue;
  metrics: Prisma.InputJsonValue;
};

export class ScoreRepository {
  constructor(private readonly db: PrismaClient) {}

  async createScore(input: CreateScoreSnapshotInput): Promise<ScoreSnapshot> {
    return this.db.scoreSnapshot.create({
      data: input
    });
  }

  async updateRanks(scores: Array<{ id: string; rank: number }>): Promise<void> {
    await this.db.$transaction(
      scores.map((score) =>
        this.db.scoreSnapshot.update({
          where: { id: score.id },
          data: { rank: score.rank }
        })
      )
    );
  }

  async latestForAsset(assetId: string): Promise<ScoreSnapshot | null> {
    return this.db.scoreSnapshot.findFirst({
      where: { assetId },
      orderBy: { capturedAt: "desc" }
    });
  }

  async previousForAsset(assetId: string, before: Date): Promise<ScoreSnapshot | null> {
    return this.db.scoreSnapshot.findFirst({
      where: {
        assetId,
        capturedAt: {
          lt: before
        }
      },
      orderBy: { capturedAt: "desc" }
    });
  }

  async top(limit: number): Promise<Array<ScoreSnapshot & { asset: { symbol: string; name: string | null } }>> {
    return this.topByLatestRanks(limit);
  }

  async topByLatestRanks(limit: number): Promise<Array<ScoreSnapshot & { asset: { symbol: string; name: string | null } }>> {
    return this.latestPerAsset("rank", limit);
  }

  async highestRiskLatest(limit: number): Promise<Array<ScoreSnapshot & { asset: { symbol: string; name: string | null } }>> {
    return this.latestPerAsset("risk", limit);
  }

  async latestScoresForWatchedAssets(userId: string) {
    const watched = await this.db.watchlist.findMany({
      where: { userId },
      include: {
        asset: true
      },
      orderBy: { createdAt: "desc" }
    });

    const rows = await Promise.all(
      watched.map(async (item) => ({
        watchlist: item,
        score: await this.latestForAsset(item.assetId)
      }))
    );

    return rows;
  }

  private async latestPerAsset(
    sort: "rank" | "risk",
    limit: number
  ): Promise<Array<ScoreSnapshot & { asset: { symbol: string; name: string | null } }>> {
    const orderBy =
      sort === "rank"
        ? Prisma.sql`latest."rank" ASC NULLS LAST, latest."opportunityScore" DESC`
        : Prisma.sql`latest."riskScore" DESC, latest."opportunityScore" DESC`;

    return this.db.$queryRaw<Array<ScoreSnapshot & { asset: { symbol: string; name: string | null } }>>`
      SELECT
        latest.*,
        json_build_object('symbol', a."symbol", 'name', a."name") AS asset
      FROM (
        SELECT DISTINCT ON (ss."assetId")
          ss.*
        FROM "ScoreSnapshot" ss
        ORDER BY ss."assetId", ss."capturedAt" DESC
      ) latest
      JOIN "Asset" a ON a."id" = latest."assetId"
      WHERE latest."rank" IS NOT NULL
        AND a."symbol" NOT IN ('UNKNOWN', 'ASSET0', 'ASSET1')
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `;
  }
}

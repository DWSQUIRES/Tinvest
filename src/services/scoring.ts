import type { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { JobRepository } from "../repositories/jobs.js";
import { ScoreRepository } from "../repositories/scores.js";
import { aggregatePoolMetrics, scoreAsset } from "../scoring/scorer.js";
import { hoursAgo } from "../utils/time.js";

export type ScoringResult = {
  scoredAssets: number;
};

export class ScoringService {
  private readonly jobs: JobRepository;
  private readonly scores: ScoreRepository;

  constructor(private readonly db: PrismaClient) {
    this.jobs = new JobRepository(db);
    this.scores = new ScoreRepository(db);
  }

  async runOnce(): Promise<ScoringResult> {
    const jobId = await this.jobs.start("scorer");
    try {
      const latestRows = await this.latestRows();
      const previousRows = await this.previousRows();
      const aggregates = aggregatePoolMetrics(latestRows, previousRows);
      const scored = aggregates
        .map((aggregate) => scoreAsset(aggregate, env.MIN_LIQUIDITY_USD))
        .sort((a, b) => b.opportunityScore - a.opportunityScore || a.riskScore - b.riskScore);

      const created = [];
      for (const score of scored) {
        const saved = await this.scores.createScore({
          assetId: score.assetId,
          opportunityScore: score.opportunityScore,
          riskScore: score.riskScore,
          liquidityScore: score.liquidityScore,
          activityScore: score.activityScore,
          marketHealthScore: score.marketHealthScore,
          stabilityScore: score.stabilityScore,
          ecosystemScore: score.ecosystemScore,
          reasons: score.reasons,
          metrics: score.metrics
        });
        created.push(saved);
      }

      await this.scores.updateRanks(created.map((score, index) => ({ id: score.id, rank: index + 1 })));

      const result = { scoredAssets: created.length };
      await this.jobs.finish(jobId, "SUCCESS", undefined, result);
      logger.info(result, "scoring completed");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.jobs.finish(jobId, "FAILED", message);
      logger.error({ error }, "scoring failed");
      throw error;
    }
  }

  private async latestRows() {
    const pools = await this.db.pool.findMany({
      include: {
        baseAsset: true,
        snapshots: {
          orderBy: { capturedAt: "desc" },
          take: 1
        }
      }
    });

    return pools
      .map((pool) => ({ pool, snapshot: pool.snapshots[0] }))
      .filter((row): row is Exclude<typeof row, { snapshot: undefined }> => Boolean(row.snapshot));
  }

  private async previousRows() {
    const before = hoursAgo(20);
    const pools = await this.db.pool.findMany({
      include: {
        baseAsset: true,
        snapshots: {
          where: {
            capturedAt: {
              lte: before
            }
          },
          orderBy: { capturedAt: "desc" },
          take: 1
        }
      }
    });

    return pools
      .map((pool) => ({ pool, snapshot: pool.snapshots[0] }))
      .filter((row): row is Exclude<typeof row, { snapshot: undefined }> => Boolean(row.snapshot));
  }
}

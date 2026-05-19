import type { Asset, PrismaClient, ScoreSnapshot } from "@prisma/client";
import { ReportGenerator } from "../llm/reporter.js";
import { ReportRepository } from "../repositories/reports.js";

export class ReportService {
  private readonly reports: ReportRepository;
  private readonly generator: ReportGenerator;

  constructor(private readonly db: PrismaClient) {
    this.reports = new ReportRepository(db);
    this.generator = new ReportGenerator();
  }

  async latestOrGenerate(asset: Asset, score: ScoreSnapshot): Promise<string> {
    const recent = await this.reports.latest(asset.id);
    if (recent && Date.now() - recent.createdAt.getTime() < 10 * 60_000) {
      return recent.body;
    }

    const generated = await this.generator.generate({
      symbol: asset.symbol,
      name: asset.name,
      rank: score.rank,
      opportunityScore: score.opportunityScore,
      riskScore: score.riskScore,
      components: {
        liquidityScore: score.liquidityScore,
        activityScore: score.activityScore,
        marketHealthScore: score.marketHealthScore,
        stabilityScore: score.stabilityScore,
        ecosystemScore: score.ecosystemScore
      },
      reasons: score.reasons,
      metrics: score.metrics
    });

    await this.reports.create({
      assetId: asset.id,
      scoreSnapshotId: score.id,
      body: generated.body,
      model: generated.model
    });

    return generated.body;
  }
}

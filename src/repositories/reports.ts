import type { PrismaClient } from "@prisma/client";

export class ReportRepository {
  constructor(private readonly db: PrismaClient) {}

  async latest(assetId: string) {
    return this.db.generatedReport.findFirst({
      where: { assetId },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(input: { assetId: string; scoreSnapshotId?: string; body: string; model?: string }) {
    return this.db.generatedReport.create({
      data: input
    });
  }
}

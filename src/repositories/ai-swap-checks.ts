import type { Prisma, PrismaClient } from "@prisma/client";

export class AiSwapCheckRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    assetId: string;
    scoreSnapshotId?: string;
    amountTon: string;
    slippageTolerance: string;
    quote: Prisma.InputJsonValue;
    promptInput: Prisma.InputJsonValue;
    output: Prisma.InputJsonValue;
    body: string;
    model?: string;
  }) {
    return this.db.aiSwapCheck.create({
      data: input
    });
  }

  async latestForAsset(assetId: string) {
    return this.db.aiSwapCheck.findFirst({
      where: { assetId },
      orderBy: { createdAt: "desc" }
    });
  }
}

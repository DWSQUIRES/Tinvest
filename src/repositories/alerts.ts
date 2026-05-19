import type { AlertType, PrismaClient } from "@prisma/client";

export class AlertRepository {
  constructor(private readonly db: PrismaClient) {}

  async wasSent(userId: string, fingerprint: string): Promise<boolean> {
    const count = await this.db.sentAlert.count({
      where: {
        userId,
        fingerprint
      }
    });
    return count > 0;
  }

  async recordSent(input: {
    userId: string;
    assetId: string;
    type: AlertType;
    fingerprint: string;
    message: string;
  }): Promise<void> {
    await this.db.sentAlert.create({
      data: input
    });
  }
}

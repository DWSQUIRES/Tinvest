import type { AlertType, PrismaClient, TelegramUser } from "@prisma/client";

export type TelegramUserInput = {
  telegramId: number;
  username?: string;
  firstName?: string;
};

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertTelegramUser(input: TelegramUserInput): Promise<TelegramUser> {
    return this.db.telegramUser.upsert({
      where: { telegramId: BigInt(input.telegramId) },
      create: {
        telegramId: BigInt(input.telegramId),
        username: input.username,
        firstName: input.firstName
      },
      update: {
        username: input.username,
        firstName: input.firstName
      }
    });
  }

  async addWatch(userId: string, assetId: string) {
    return this.db.watchlist.upsert({
      where: {
        userId_assetId: {
          userId,
          assetId
        }
      },
      create: {
        userId,
        assetId
      },
      update: {}
    });
  }

  async removeWatch(userId: string, assetId: string): Promise<boolean> {
    const result = await this.db.watchlist.deleteMany({
      where: {
        userId,
        assetId
      }
    });
    return result.count > 0;
  }

  async watchesForUser(userId: string) {
    return this.db.watchlist.findMany({
      where: { userId },
      include: { asset: true },
      orderBy: { createdAt: "desc" }
    });
  }

  async activeUsersWithWatchlists() {
    return this.db.telegramUser.findMany({
      where: {
        watchlists: {
          some: {}
        }
      },
      include: {
        watchlists: {
          include: {
            asset: true
          }
        }
      }
    });
  }

  async ensureDefaultAlertRules(userId: string, thresholds: { score: number; risk: number; rankTopN: number }) {
    const rules: Array<{ type: AlertType; threshold: number }> = [
      { type: "SCORE_ABOVE", threshold: thresholds.score },
      { type: "RISK_ABOVE", threshold: thresholds.risk },
      { type: "RANK_TOP", threshold: thresholds.rankTopN },
      { type: "LIQUIDITY_DROP", threshold: 35 },
      { type: "VOLUME_SPIKE", threshold: 150 }
    ];

    await this.db.$transaction(
      rules.map((rule) =>
        this.db.alertRule.upsert({
          where: {
            id: `${userId}:${rule.type}`
          },
          create: {
            id: `${userId}:${rule.type}`,
            userId,
            type: rule.type,
            threshold: rule.threshold
          },
          update: {
            threshold: rule.threshold
          }
        })
      )
    );
  }

  async alertRulesForUser(userId: string) {
    return this.db.alertRule.findMany({
      where: {
        userId,
        status: "ACTIVE"
      },
      orderBy: { type: "asc" }
    });
  }
}

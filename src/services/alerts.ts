import type { AlertRule, AlertType, PrismaClient, ScoreSnapshot, TelegramUser } from "@prisma/client";
import type { Bot } from "grammy";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AlertRepository } from "../repositories/alerts.js";
import { JobRepository } from "../repositories/jobs.js";
import { ScoreRepository } from "../repositories/scores.js";
import { UserRepository } from "../repositories/users.js";
import { formatPercent, formatUsd } from "../utils/numbers.js";

export type AlertDispatchResult = {
  evaluatedUsers: number;
  sent: number;
};

export class AlertService {
  private readonly users: UserRepository;
  private readonly scores: ScoreRepository;
  private readonly alerts: AlertRepository;
  private readonly jobs: JobRepository;

  constructor(
    private readonly db: PrismaClient,
    private readonly bot?: Bot
  ) {
    this.users = new UserRepository(db);
    this.scores = new ScoreRepository(db);
    this.alerts = new AlertRepository(db);
    this.jobs = new JobRepository(db);
  }

  async runOnce(): Promise<AlertDispatchResult> {
    const jobId = await this.jobs.start("alerts");
    try {
      const users = await this.users.activeUsersWithWatchlists();
      let sent = 0;

      for (const user of users) {
        const rules = await this.users.alertRulesForUser(user.id);
        for (const watched of user.watchlists) {
          const score = await this.scores.latestForAsset(watched.assetId);
          if (!score) {
            continue;
          }

          const messages = this.evaluateRules(user, watched.asset, score, rules);
          for (const message of messages) {
            const wasSent = await this.alerts.wasSent(user.id, message.fingerprint);
            if (wasSent) {
              continue;
            }

            if (this.bot) {
              await this.bot.api.sendMessage(Number(user.telegramId), `${message.text}\n\nNot financial advice.`);
            }

            await this.alerts.recordSent({
              userId: user.id,
              assetId: watched.assetId,
              type: message.type,
              fingerprint: message.fingerprint,
              message: message.text
            });
            sent += 1;
          }
        }
      }

      const result = { evaluatedUsers: users.length, sent };
      await this.jobs.finish(jobId, "SUCCESS", undefined, result);
      logger.info(result, "alerts completed");
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.jobs.finish(jobId, "FAILED", message);
      logger.error({ error }, "alerts failed");
      throw error;
    }
  }

  private evaluateRules(
    user: TelegramUser,
    asset: { id: string; symbol: string },
    score: ScoreSnapshot,
    rules: AlertRule[]
  ): Array<{ type: AlertType; fingerprint: string; text: string }> {
    const messages: Array<{ type: AlertType; fingerprint: string; text: string }> = [];
    const metrics = parseMetrics(score.metrics);

    for (const rule of rules) {
      const threshold = Number(rule.threshold ?? 0);

      if (rule.type === "SCORE_ABOVE" && score.opportunityScore >= threshold) {
        messages.push({
          type: rule.type,
          fingerprint: `${rule.type}:${asset.id}:${score.id}`,
          text: `${asset.symbol} opportunity alert\nScore is ${score.opportunityScore}/100, above your ${threshold || env.SCORE_ALERT_THRESHOLD} threshold.`
        });
      }

      if (rule.type === "RISK_ABOVE" && score.riskScore >= threshold) {
        messages.push({
          type: rule.type,
          fingerprint: `${rule.type}:${asset.id}:${score.id}`,
          text: `${asset.symbol} risk alert\nRisk is ${score.riskScore}/100, above your ${threshold || env.RISK_ALERT_THRESHOLD} threshold.`
        });
      }

      if (rule.type === "RANK_TOP" && score.rank && score.rank <= threshold) {
        messages.push({
          type: rule.type,
          fingerprint: `${rule.type}:${asset.id}:${score.id}`,
          text: `${asset.symbol} ranking alert\nNow ranked #${score.rank} by the watcher score.`
        });
      }

      if (
        rule.type === "LIQUIDITY_DROP" &&
        metrics.liquidityChange24h !== undefined &&
        metrics.liquidityChange24h <= -Math.abs(threshold || 35)
      ) {
        messages.push({
          type: rule.type,
          fingerprint: `${rule.type}:${asset.id}:${score.id}`,
          text: `${asset.symbol} liquidity alert\nLiquidity is ${formatUsd(metrics.liquidityUsd)} and changed ${formatPercent(metrics.liquidityChange24h)}.`
        });
      }

      if (
        rule.type === "VOLUME_SPIKE" &&
        metrics.volumeChange24h !== undefined &&
        metrics.volumeChange24h >= Math.abs(threshold || 150)
      ) {
        messages.push({
          type: rule.type,
          fingerprint: `${rule.type}:${asset.id}:${score.id}`,
          text: `${asset.symbol} volume alert\n24h volume is ${formatUsd(metrics.volume24hUsd)} and changed ${formatPercent(metrics.volumeChange24h)}.`
        });
      }
    }

    logger.debug({ userId: user.id, assetId: asset.id, messages: messages.length }, "evaluated alerts");
    return messages;
  }
}

function parseMetrics(value: unknown): {
  liquidityUsd?: number;
  volume24hUsd?: number;
  liquidityChange24h?: number;
  volumeChange24h?: number;
} {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  return {
    liquidityUsd: numberValue(source.liquidityUsd),
    volume24hUsd: numberValue(source.volume24hUsd),
    liquidityChange24h: numberValue(source.liquidityChange24h),
    volumeChange24h: numberValue(source.volumeChange24h)
  };
}

function numberValue(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : undefined;
  return parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined;
}

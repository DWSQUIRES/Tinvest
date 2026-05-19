import type { Context } from "grammy";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { UserRepository } from "../repositories/users.js";

const users = new UserRepository(prisma);

export async function ensureUser(ctx: Context) {
  if (!ctx.from) {
    throw new Error("Telegram user context is missing");
  }

  const user = await users.upsertTelegramUser({
    telegramId: ctx.from.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name
  });

  await users.ensureDefaultAlertRules(user.id, {
    score: env.SCORE_ALERT_THRESHOLD,
    risk: env.RISK_ALERT_THRESHOLD,
    rankTopN: env.RANK_ALERT_TOP_N
  });

  return user;
}

export function commandArgument(ctx: Context): string {
  const text = ctx.message && "text" in ctx.message ? (ctx.message.text ?? "") : "";
  return text.split(/\s+/).slice(1).join(" ").trim();
}

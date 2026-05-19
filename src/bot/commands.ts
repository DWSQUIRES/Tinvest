import type { Bot } from "grammy";
import { env } from "../config/env.js";
import { prisma } from "../db/client.js";
import { AssetRepository } from "../repositories/assets.js";
import { ScoreRepository } from "../repositories/scores.js";
import { UserRepository } from "../repositories/users.js";
import { ReportService } from "../services/reports.js";
import { commandArgument, ensureUser } from "./context.js";
import { disclaimer, formatReport, formatRules, formatScoreLine, formatWatchlistLine } from "./formatters.js";

const assets = new AssetRepository(prisma);
const scores = new ScoreRepository(prisma);
const users = new UserRepository(prisma);
const reports = new ReportService(prisma);

export function registerCommands(bot: Bot): void {
  bot.command("start", async (ctx) => {
    await ensureUser(ctx);
    await ctx.reply(
      [
        "TON Economic Watchers",
        "I monitor STON.fi market data for TON assets and rank assets by deterministic opportunity and risk scores.",
        "",
        "Commands:",
        "/top - top ranked assets",
        "/risk - highest risk assets",
        "/watch <symbol or address> - add an asset",
        "/unwatch <symbol or address> - remove an asset",
        "/watchlist - your watched assets",
        "/report <symbol or address> - explain latest score",
        "/alerts - show active alert rules",
        "",
        disclaimer
      ].join("\n"),
    );
  });

  bot.command("top", async (ctx) => {
    await ensureUser(ctx);
    const rows = await scores.topByLatestRanks(env.TOP_LIST_SIZE);
    if (rows.length === 0) {
      await ctx.reply("No scores are available yet. Run the collector and scorer workers first.");
      return;
    }

    await ctx.reply(["Top watcher scores", ...rows.map((row, index) => formatScoreLine(row, index + 1)), "", disclaimer].join("\n"));
  });

  bot.command("risk", async (ctx) => {
    await ensureUser(ctx);
    const rows = await scores.highestRiskLatest(env.TOP_LIST_SIZE);

    if (rows.length === 0) {
      await ctx.reply("No scores are available yet. Run the collector and scorer workers first.");
      return;
    }

    await ctx.reply(["Highest risk watched universe", ...rows.map((row, index) => formatScoreLine(row, index + 1)), "", disclaimer].join("\n"));
  });

  bot.command("watch", async (ctx) => {
    const user = await ensureUser(ctx);
    const query = commandArgument(ctx);
    if (!query) {
      await ctx.reply("Usage: /watch <symbol or token address>");
      return;
    }

    const asset = await assets.findAssetByQuery(query);
    if (!asset) {
      await ctx.reply(`I could not find ${query} in the collected STON.fi asset set.`);
      return;
    }

    await users.addWatch(user.id, asset.id);
    await ctx.reply(`Watching ${asset.symbol}.`);
  });

  bot.command("unwatch", async (ctx) => {
    const user = await ensureUser(ctx);
    const query = commandArgument(ctx);
    if (!query) {
      await ctx.reply("Usage: /unwatch <symbol or token address>");
      return;
    }

    const asset = await assets.findAssetByQuery(query);
    if (!asset) {
      await ctx.reply(`I could not find ${query} in the collected STON.fi asset set.`);
      return;
    }

    const removed = await users.removeWatch(user.id, asset.id);
    await ctx.reply(removed ? `Stopped watching ${asset.symbol}.` : `${asset.symbol} was not on your watchlist.`);
  });

  bot.command("watchlist", async (ctx) => {
    const user = await ensureUser(ctx);
    const rows = await scores.latestScoresForWatchedAssets(user.id);
    if (rows.length === 0) {
      await ctx.reply("Your watchlist is empty. Add one with /watch <symbol or address>.");
      return;
    }

    await ctx.reply(
      ["Your watchlist", ...rows.map((row) => formatWatchlistLine(row.watchlist.asset, row.score)), "", disclaimer].join("\n")
    );
  });

  bot.command("report", async (ctx) => {
    await ensureUser(ctx);
    const query = commandArgument(ctx);
    if (!query) {
      await ctx.reply("Usage: /report <symbol or token address>");
      return;
    }

    const asset = await assets.findAssetByQuery(query);
    if (!asset) {
      await ctx.reply(`I could not find ${query} in the collected STON.fi asset set.`);
      return;
    }

    const score = await scores.latestForAsset(asset.id);
    if (!score) {
      await ctx.reply(`No score is available for ${asset.symbol} yet.`);
      return;
    }

    const body = await reports.latestOrGenerate(asset, score);
    await ctx.reply(formatReport(body));
  });

  bot.command("alerts", async (ctx) => {
    const user = await ensureUser(ctx);
    const rules = await users.alertRulesForUser(user.id);
    await ctx.reply(["Active alert rules", formatRules(rules), "", disclaimer].join("\n"));
  });
}

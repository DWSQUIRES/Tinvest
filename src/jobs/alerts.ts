import { Bot } from "grammy";
import { env } from "../config/env.js";
import { closeDatabase, prisma } from "../db/client.js";
import { AlertService } from "../services/alerts.js";
import { runLoop } from "./runner.js";

if (!env.TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required for the alert worker");
}

const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
const service = new AlertService(prisma, bot);

if (process.argv.includes("--once")) {
  await service.runOnce();
} else {
  await runLoop("alerts", env.ALERT_INTERVAL_MS, () => service.runOnce());
}

await closeDatabase();

import { env } from "../config/env.js";
import { prisma, closeDatabase } from "../db/client.js";
import { JobRepository } from "../repositories/jobs.js";

const jobs = new JobRepository(prisma);

const [dbResult, collector, scorer] = await Promise.all([
  prisma.$queryRaw`SELECT 1 AS ok`,
  jobs.latest("collector"),
  jobs.latest("scorer")
]);

const now = Date.now();
const collectorAge = collector?.finishedAt ? now - collector.finishedAt.getTime() : undefined;
const scorerAge = scorer?.finishedAt ? now - scorer.finishedAt.getTime() : undefined;
const healthy =
  Array.isArray(dbResult) &&
  collector?.status === "SUCCESS" &&
  scorer?.status === "SUCCESS" &&
  collectorAge !== undefined &&
  scorerAge !== undefined &&
  collectorAge < env.MARKET_STALE_AFTER_MS &&
  scorerAge < env.MARKET_STALE_AFTER_MS * 2;

console.log(
  JSON.stringify(
    {
      healthy,
      database: "ok",
      collector: collector
        ? {
            status: collector.status,
            finishedAt: collector.finishedAt,
            ageMs: collectorAge
          }
        : null,
      scorer: scorer
        ? {
            status: scorer.status,
            finishedAt: scorer.finishedAt,
            ageMs: scorerAge
          }
        : null
    },
    null,
    2
  )
);

await closeDatabase();
process.exit(healthy ? 0 : 1);

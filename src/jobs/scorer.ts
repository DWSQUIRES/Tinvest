import { env } from "../config/env.js";
import { closeDatabase, prisma } from "../db/client.js";
import { ScoringService } from "../services/scoring.js";
import { runLoop } from "./runner.js";

const service = new ScoringService(prisma);

if (process.argv.includes("--once")) {
  await service.runOnce();
} else {
  await runLoop("scorer", env.SCORER_INTERVAL_MS, () => service.runOnce());
}

await closeDatabase();

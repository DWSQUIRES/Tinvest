import { env } from "../config/env.js";
import { closeDatabase, prisma } from "../db/client.js";
import { CollectorService } from "../services/collector.js";
import { StonfiClient } from "../stonfi/client.js";
import { runLoop } from "./runner.js";

const service = new CollectorService(
  prisma,
  new StonfiClient({
    baseUrl: env.STONFI_API_BASE_URL,
    requestTimeoutMs: env.STONFI_REQUEST_TIMEOUT_MS,
    requestRetries: env.STONFI_REQUEST_RETRIES,
    maxPools: env.STONFI_MAX_POOLS
  })
);

if (process.argv.includes("--once")) {
  await service.runOnce();
} else {
  await runLoop("collector", env.COLLECTOR_INTERVAL_MS, () => service.runOnce());
}

await closeDatabase();

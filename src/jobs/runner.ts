import { logger } from "../config/logger.js";
import { sleep } from "../utils/time.js";

export async function runLoop(name: string, intervalMs: number, task: () => Promise<unknown>): Promise<void> {
  logger.info({ name, intervalMs }, "job loop started");

  let shuttingDown = false;
  const shutdown = () => {
    shuttingDown = true;
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  while (!shuttingDown) {
    const startedAt = Date.now();
    try {
      await task();
    } catch (error) {
      logger.error({ error, name }, "job iteration failed");
    }

    const elapsed = Date.now() - startedAt;
    await sleep(Math.max(1_000, intervalMs - elapsed));
  }

  logger.info({ name }, "job loop stopped");
}

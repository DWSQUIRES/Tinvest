import type { Prisma, PrismaClient } from "@prisma/client";

export class JobRepository {
  constructor(private readonly db: PrismaClient) {}

  async start(name: string, metadata?: Prisma.InputJsonValue): Promise<string> {
    const run = await this.db.jobRun.create({
      data: {
        name,
        status: "RUNNING",
        metadata
      }
    });

    return run.id;
  }

  async finish(id: string, status: "SUCCESS" | "FAILED", message?: string, metadata?: Prisma.InputJsonValue): Promise<void> {
    await this.db.jobRun.update({
      where: { id },
      data: {
        status,
        finishedAt: new Date(),
        message,
        metadata
      }
    });
  }

  async latest(name: string) {
    return this.db.jobRun.findFirst({
      where: { name },
      orderBy: { startedAt: "desc" }
    });
  }
}

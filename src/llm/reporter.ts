import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { deterministicReport, type ReportInput } from "./deterministic-report.js";
import { createOpenAiClient, createTextResponse } from "./openai-client.js";

export class ReportGenerator {
  private readonly client = createOpenAiClient();

  constructor() {}

  async generate(input: ReportInput): Promise<{ body: string; model?: string }> {
    if (!this.client) {
      return { body: deterministicReport(input) };
    }

    try {
      const body = await createTextResponse({
        client: this.client,
        system:
          "You explain deterministic crypto market scores using only supplied JSON. Do not invent metrics, prices, partnerships, audits, or advice. Keep it concise and include risk.",
        user: input
      });

      if (!body) {
        return { body: deterministicReport(input) };
      }

      return { body, model: env.OPENAI_MODEL };
    } catch (error) {
      logger.warn({ error }, "LLM report generation failed; falling back");
      return { body: deterministicReport(input) };
    }
  }
}

export { deterministicReport };

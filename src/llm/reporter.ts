import OpenAI from "openai";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { deterministicReport, type ReportInput } from "./deterministic-report.js";

export class ReportGenerator {
  private readonly client: OpenAI | undefined;

  constructor() {
    this.client = env.OPENAI_API_KEY
      ? new OpenAI({
          apiKey: env.OPENAI_API_KEY,
          baseURL: env.OPENAI_BASE_URL
        })
      : undefined;
  }

  async generate(input: ReportInput): Promise<{ body: string; model?: string }> {
    if (!this.client) {
      return { body: deterministicReport(input) };
    }

    try {
      if (env.OPENAI_WIRE_API === "responses") {
        return await this.generateWithResponsesApi(input);
      }

      const completion = await this.client.chat.completions.create({
        model: env.OPENAI_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You explain deterministic crypto market scores using only supplied JSON. Do not invent metrics, prices, partnerships, audits, or advice. Keep it concise and include risk."
          },
          {
            role: "user",
            content: JSON.stringify(input)
          }
        ]
      });

      const body = completion.choices[0]?.message.content?.trim();
      if (!body) {
        return { body: deterministicReport(input) };
      }

      return { body, model: env.OPENAI_MODEL };
    } catch (error) {
      logger.warn({ error }, "LLM report generation failed; falling back");
      return { body: deterministicReport(input) };
    }
  }

  private async generateWithResponsesApi(input: ReportInput): Promise<{ body: string; model?: string }> {
    if (!this.client) {
      return { body: deterministicReport(input) };
    }

    const response = await this.client.responses.create({
      model: env.OPENAI_MODEL,
      store: !env.OPENAI_DISABLE_RESPONSE_STORAGE,
      ...(env.OPENAI_REASONING_EFFORT
        ? {
            reasoning: {
              effort: env.OPENAI_REASONING_EFFORT as never
            }
          }
        : {}),
      input: [
        {
          role: "system",
          content:
            "You explain deterministic crypto market scores using only supplied JSON. Do not invent metrics, prices, partnerships, audits, or advice. Keep it concise and include risk."
        },
        {
          role: "user",
          content: JSON.stringify(input)
        }
      ]
    });

    const body = extractResponseText(response);
    if (!body) {
      return { body: deterministicReport(input) };
    }

    return { body, model: env.OPENAI_MODEL };
  }
}

function extractResponseText(response: unknown): string | undefined {
  const candidate = response as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof candidate.output_text === "string" && candidate.output_text.trim().length > 0) {
    return candidate.output_text.trim();
  }

  const text = candidate.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n")
    .trim();

  return text || undefined;
}

export { deterministicReport };

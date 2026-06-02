import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { createOpenAiClient, createTextResponse } from "./openai-client.js";

export type AiSwapCheckVerdict = "Favorable" | "Mixed" | "High risk" | "Insufficient data";
export type AiSwapCheckConfidence = "Low" | "Medium" | "High";

export type AiSwapCheck = {
  verdict: AiSwapCheckVerdict;
  confidence: AiSwapCheckConfidence;
  summary: string;
  positiveSignals: string[];
  riskSignals: string[];
  invalidationSignals: string[];
  notAdvice: string;
};

export type AiSwapCheckInput = {
  token: {
    symbol: string;
    name?: string | null;
    address: string;
  };
  quote: {
    offerAmount: string;
    askAmount: string;
    minAskAmount: string;
    slippageTolerance: string;
    swapRate: string;
    priceImpact: string;
    poolAddress: string;
  };
  score?: {
    rank?: number | null;
    opportunityScore: number;
    riskScore: number;
    liquidityScore?: number;
    activityScore?: number;
    marketHealthScore?: number;
    stabilityScore?: number;
    ecosystemScore?: number;
    reasons?: unknown;
    metrics?: unknown;
  };
};

const fallbackNotice = "This is an informational risk check using STON.fi/watcher data only, not financial advice.";

export class SwapCheckGenerator {
  private readonly client = createOpenAiClient();

  async generate(input: AiSwapCheckInput): Promise<{ check: AiSwapCheck; model?: string }> {
    if (!this.client) {
      return { check: deterministicSwapCheck(input) };
    }

    try {
      const text = await createTextResponse({
        client: this.client,
        system: [
          "You are the AI risk layer for a non-custodial TON swap Mini App.",
          "Use only the JSON supplied by the user. Do not invent news, audits, partnerships, holder data, revenue, or predictions.",
          "Do not recommend buying or selling. Do not call anything guaranteed, safe, or risk-free.",
          "Return only valid JSON with keys: verdict, confidence, summary, positiveSignals, riskSignals, invalidationSignals, notAdvice.",
          `The notAdvice value must be exactly: ${fallbackNotice}`,
          "verdict must be one of: Favorable, Mixed, High risk, Insufficient data.",
          "confidence must be one of: Low, Medium, High.",
          "Use 1 short summary sentence and 2-4 concise bullets per list."
        ].join(" "),
        user: input
      });

      const parsed = parseSwapCheck(text);
      return {
        check: parsed ?? deterministicSwapCheck(input),
        model: parsed ? env.OPENAI_MODEL : undefined
      };
    } catch (error) {
      logger.warn({ error }, "AI swap check generation failed; falling back");
      return { check: deterministicSwapCheck(input) };
    }
  }
}

export function deterministicSwapCheck(input: AiSwapCheckInput): AiSwapCheck {
  const score = input.score;
  const priceImpact = Number(input.quote.priceImpact);
  const riskScore = score?.riskScore;
  const opportunityScore = score?.opportunityScore;

  const riskSignals: string[] = [];
  const positiveSignals: string[] = [];
  const invalidationSignals: string[] = [];

  if (opportunityScore !== undefined && opportunityScore >= 70) {
    positiveSignals.push(`Watcher score is ${opportunityScore}/100.`);
  }
  if (riskScore !== undefined && riskScore <= 35) {
    positiveSignals.push(`Watcher risk score is ${riskScore}/100.`);
  }
  if (Number.isFinite(priceImpact) && priceImpact <= 1) {
    positiveSignals.push(`Quoted price impact is low at ${priceImpact.toFixed(3)}%.`);
  }

  if (riskScore !== undefined && riskScore >= 65) {
    riskSignals.push(`Watcher risk score is elevated at ${riskScore}/100.`);
  }
  if (Number.isFinite(priceImpact) && priceImpact > 3) {
    riskSignals.push(`Price impact is high at ${priceImpact.toFixed(3)}%.`);
  }
  if (!score) {
    riskSignals.push("No watcher score is available for this token.");
  }

  invalidationSignals.push("Watcher score drops below 65.");
  invalidationSignals.push("Liquidity falls sharply or volume dries up in future snapshots.");
  invalidationSignals.push("Quoted price impact rises materially for the same trade size.");

  const verdict = chooseVerdict({ score, priceImpact });
  return {
    verdict,
    confidence: score ? "Medium" : "Low",
    summary: `${input.token.symbol} has a ${verdict.toLowerCase()} setup based on the current STON.fi quote and watcher metrics.`,
    positiveSignals: positiveSignals.length > 0 ? positiveSignals : ["No strong positive signal stood out in the supplied data."],
    riskSignals: riskSignals.length > 0 ? riskSignals : ["No severe supplied-data risk flag triggered."],
    invalidationSignals,
    notAdvice: fallbackNotice
  };
}

export function formatSwapCheck(check: AiSwapCheck): string {
  return [
    `Verdict: ${check.verdict} (${check.confidence} confidence)`,
    check.summary,
    "",
    "Positive signals:",
    ...check.positiveSignals.map((item) => `- ${item}`),
    "",
    "Risks:",
    ...check.riskSignals.map((item) => `- ${item}`),
    "",
    "Invalidation signals:",
    ...check.invalidationSignals.map((item) => `- ${item}`),
    "",
    check.notAdvice
  ].join("\n");
}

function chooseVerdict(input: { score?: AiSwapCheckInput["score"]; priceImpact: number }): AiSwapCheckVerdict {
  if (!input.score) {
    return "Insufficient data";
  }

  if (input.score.riskScore >= 65 || (Number.isFinite(input.priceImpact) && input.priceImpact > 3)) {
    return "High risk";
  }

  if (input.score.opportunityScore >= 70 && input.score.riskScore <= 35) {
    return "Favorable";
  }

  return "Mixed";
}

function parseSwapCheck(text?: string): AiSwapCheck | undefined {
  if (!text) {
    return undefined;
  }

  const jsonText = extractJson(text);
  if (!jsonText) {
    return undefined;
  }

  try {
    const value = JSON.parse(jsonText) as Partial<AiSwapCheck>;
    if (!isVerdict(value.verdict) || !isConfidence(value.confidence) || typeof value.summary !== "string") {
      return undefined;
    }

    return {
      verdict: value.verdict,
      confidence: value.confidence,
      summary: value.summary,
      positiveSignals: arrayOfStrings(value.positiveSignals),
      riskSignals: arrayOfStrings(value.riskSignals),
      invalidationSignals: arrayOfStrings(value.invalidationSignals),
      notAdvice: fallbackNotice
    };
  } catch {
    return undefined;
  }
}

function extractJson(text: string): string | undefined {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : undefined;
}

function isVerdict(value: unknown): value is AiSwapCheckVerdict {
  return value === "Favorable" || value === "Mixed" || value === "High risk" || value === "Insufficient data";
}

function isConfidence(value: unknown): value is AiSwapCheckConfidence {
  return value === "Low" || value === "Medium" || value === "High";
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value.slice(0, 4) : [];
}

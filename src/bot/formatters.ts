import type { Asset, AlertRule, ScoreSnapshot } from "@prisma/client";
import { formatPercent, formatUsd } from "../utils/numbers.js";

export const disclaimer = "_Not financial advice. Scores use STON.fi market data only._";

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}

export function formatScoreLine(
  score: ScoreSnapshot & { asset?: { symbol: string; name?: string | null } },
  index?: number
): string {
  const symbol = score.asset?.symbol ?? "UNKNOWN";
  const metrics = parseMetrics(score.metrics);
  const rank = score.rank ?? index;
  const volumeChange = formatPercent(metrics.volumeChange24h);
  return `#${rank ?? "-"} ${symbol}  score ${score.opportunityScore}/100  risk ${score.riskScore}/100  volume ${formatUsd(metrics.volume24hUsd)}  change ${volumeChange}`;
}

export function formatWatchlistLine(asset: Asset, score: ScoreSnapshot | null): string {
  if (!score) {
    return `${asset.symbol}  no score yet`;
  }

  return formatScoreLine({ ...score, asset });
}

export function formatReport(body: string): string {
  return `${body}\n\n${disclaimer}`;
}

export function formatRules(rules: AlertRule[]): string {
  if (rules.length === 0) {
    return "No active alert rules found.";
  }

  return rules.map((rule) => `- ${rule.type}: ${rule.threshold?.toString() ?? "default"}`).join("\n");
}

export function parseMetrics(value: unknown): {
  liquidityUsd?: number;
  volume24hUsd?: number;
  liquidityChange24h?: number;
  volumeChange24h?: number;
} {
  if (!value || typeof value !== "object") {
    return {};
  }

  const source = value as Record<string, unknown>;
  return {
    liquidityUsd: numberValue(source.liquidityUsd),
    volume24hUsd: numberValue(source.volume24hUsd),
    liquidityChange24h: numberValue(source.liquidityChange24h),
    volumeChange24h: numberValue(source.volumeChange24h)
  };
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

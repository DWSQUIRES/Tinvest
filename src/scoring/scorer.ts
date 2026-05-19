import { clamp, formatPercent, formatUsd, percentChange, roundScore } from "../utils/numbers.js";
import type { AssetMetricAggregate, ScoreReasons, ScoreResult } from "./types.js";

export function aggregatePoolMetrics(
  latestRows: Array<{
    pool: {
      baseAsset: { id: string; symbol: string; name: string | null };
    };
    snapshot: {
      capturedAt: Date;
      liquidityUsd: unknown;
      volume24hUsd: unknown;
      volume7dUsd: unknown;
      priceUsd: unknown;
      txCount24h: number | null;
    };
  }>,
  previousRows: Array<{
    pool: {
      baseAsset: { id: string };
    };
    snapshot: {
      liquidityUsd: unknown;
      volume24hUsd: unknown;
    };
  }> = []
): AssetMetricAggregate[] {
  const grouped = new Map<string, AssetMetricAggregate>();
  const previous = new Map<string, { liquidityUsd: number; volume24hUsd: number }>();

  for (const row of previousRows) {
    const assetId = row.pool.baseAsset.id;
    const existing = previous.get(assetId) ?? { liquidityUsd: 0, volume24hUsd: 0 };
    existing.liquidityUsd += Number(row.snapshot.liquidityUsd ?? 0);
    existing.volume24hUsd += Number(row.snapshot.volume24hUsd ?? 0);
    previous.set(assetId, existing);
  }

  for (const row of latestRows) {
    const asset = row.pool.baseAsset;
    const current = grouped.get(asset.id) ?? {
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      poolCount: 0,
      liquidityUsd: 0,
      volume24hUsd: 0,
      volume7dUsd: 0,
      txCount24h: 0,
      capturedAt: row.snapshot.capturedAt
    };

    current.poolCount += 1;
    current.liquidityUsd = (current.liquidityUsd ?? 0) + Number(row.snapshot.liquidityUsd ?? 0);
    current.volume24hUsd = (current.volume24hUsd ?? 0) + Number(row.snapshot.volume24hUsd ?? 0);
    current.volume7dUsd = (current.volume7dUsd ?? 0) + Number(row.snapshot.volume7dUsd ?? 0);
    current.txCount24h = (current.txCount24h ?? 0) + (row.snapshot.txCount24h ?? 0);
    current.priceUsd ??= row.snapshot.priceUsd === null ? undefined : Number(row.snapshot.priceUsd);
    current.capturedAt = row.snapshot.capturedAt > current.capturedAt ? row.snapshot.capturedAt : current.capturedAt;
    grouped.set(asset.id, current);
  }

  for (const aggregate of grouped.values()) {
    const old = previous.get(aggregate.assetId);
    aggregate.liquidityChange24h = percentChange(aggregate.liquidityUsd, old?.liquidityUsd);
    aggregate.volumeChange24h = percentChange(aggregate.volume24hUsd, old?.volume24hUsd);
  }

  return [...grouped.values()];
}

export function scoreAsset(metric: AssetMetricAggregate, minLiquidityUsd: number): ScoreResult {
  const liquidity = metric.liquidityUsd ?? 0;
  const volume24h = metric.volume24hUsd ?? 0;
  const volume7d = metric.volume7dUsd ?? 0;
  const txCount = metric.txCount24h ?? 0;
  const turnover = liquidity > 0 ? volume24h / liquidity : 0;

  const liquidityScore = roundScore((Math.log10(Math.max(liquidity, 1)) / 7) * 100);
  const volumeScore = roundScore((Math.log10(Math.max(volume24h, 1)) / 7) * 100);
  const txScore = roundScore((Math.log10(Math.max(txCount, 1)) / 5) * 100);
  const activityScore = roundScore(volumeScore * 0.75 + txScore * 0.25);

  const turnoverPenalty = turnover > 8 ? Math.min(30, (turnover - 8) * 4) : 0;
  const lowLiquidityPenalty = liquidity < minLiquidityUsd ? 35 : 0;
  const liquidityDropPenalty = metric.liquidityChange24h !== undefined && metric.liquidityChange24h < -35 ? 25 : 0;
  const volumeSpikePenalty = metric.volumeChange24h !== undefined && metric.volumeChange24h > 300 && liquidity < minLiquidityUsd * 3 ? 20 : 0;
  const marketHealthScore = roundScore(100 - turnoverPenalty - lowLiquidityPenalty - liquidityDropPenalty - volumeSpikePenalty);

  const stabilityScore = roundScore(
    clamp(metric.poolCount * 18, 0, 45) +
      (volume7d > volume24h * 2 ? 25 : 8) +
      (metric.liquidityChange24h === undefined ? 10 : metric.liquidityChange24h > -10 ? 25 : 5)
  );

  const ecosystemScore = roundScore(metric.poolCount >= 3 ? 80 : metric.poolCount === 2 ? 65 : 50);

  const opportunityScore = roundScore(
    liquidityScore * 0.4 +
      activityScore * 0.25 +
      marketHealthScore * 0.15 +
      stabilityScore * 0.1 +
      ecosystemScore * 0.1
  );

  const riskScore = roundScore(
    lowLiquidityPenalty +
      liquidityDropPenalty +
      volumeSpikePenalty +
      turnoverPenalty +
      (marketHealthScore < 50 ? 15 : 0)
  );

  return {
    assetId: metric.assetId,
    opportunityScore,
    riskScore,
    liquidityScore,
    activityScore,
    marketHealthScore,
    stabilityScore,
    ecosystemScore,
    reasons: buildReasons(metric, {
      liquidityScore,
      activityScore,
      marketHealthScore,
      stabilityScore,
      ecosystemScore,
      riskScore
    }),
    metrics: metric
  };
}

function buildReasons(
  metric: AssetMetricAggregate,
  scores: {
    liquidityScore: number;
    activityScore: number;
    marketHealthScore: number;
    stabilityScore: number;
    ecosystemScore: number;
    riskScore: number;
  }
): ScoreReasons {
  const positives: string[] = [];
  const risks: string[] = [];
  const changes: string[] = [];

  if (scores.liquidityScore >= 60) {
    positives.push(`Liquidity is meaningful at ${formatUsd(metric.liquidityUsd)}.`);
  }
  if (scores.activityScore >= 60) {
    positives.push(`Trading activity is strong with ${formatUsd(metric.volume24hUsd)} in 24h volume.`);
  }
  if (metric.poolCount > 1) {
    positives.push(`Asset appears across ${metric.poolCount} monitored STON.fi pools.`);
  }
  if (scores.marketHealthScore >= 70) {
    positives.push("Market health looks stable relative to current liquidity and volume.");
  }

  if ((metric.liquidityUsd ?? 0) <= 0) {
    risks.push("No usable liquidity was detected in the latest snapshot.");
  } else if (scores.liquidityScore < 35) {
    risks.push(`Liquidity is thin at ${formatUsd(metric.liquidityUsd)}.`);
  }
  if (metric.liquidityChange24h !== undefined && metric.liquidityChange24h < -35) {
    risks.push(`Liquidity dropped ${formatPercent(metric.liquidityChange24h)} versus the prior comparison snapshot.`);
  }
  if (metric.volumeChange24h !== undefined && metric.volumeChange24h > 300) {
    risks.push(`Volume spiked ${formatPercent(metric.volumeChange24h)}, which may be temporary or manipulated.`);
  }
  if (scores.riskScore >= 65) {
    risks.push("Composite risk is elevated.");
  }

  if (metric.liquidityChange24h !== undefined) {
    changes.push(`Liquidity change: ${formatPercent(metric.liquidityChange24h)}.`);
  }
  if (metric.volumeChange24h !== undefined) {
    changes.push(`24h volume change: ${formatPercent(metric.volumeChange24h)}.`);
  }

  return {
    positives: positives.length > 0 ? positives : ["No major positive signal stood out in the latest STON.fi snapshot."],
    risks: risks.length > 0 ? risks : ["No severe STON.fi-derived risk flag triggered."],
    changes: changes.length > 0 ? changes : ["Not enough historical snapshots yet to compare changes."]
  };
}

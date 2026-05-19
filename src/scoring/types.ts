export type AssetMetricAggregate = {
  assetId: string;
  symbol: string;
  name?: string | null;
  poolCount: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  volume7dUsd?: number;
  priceUsd?: number;
  txCount24h?: number;
  liquidityChange24h?: number;
  volumeChange24h?: number;
  capturedAt: Date;
};

export type ScoreReasons = {
  positives: string[];
  risks: string[];
  changes: string[];
};

export type ScoreResult = {
  assetId: string;
  opportunityScore: number;
  riskScore: number;
  liquidityScore: number;
  activityScore: number;
  marketHealthScore: number;
  stabilityScore: number;
  ecosystemScore: number;
  reasons: ScoreReasons;
  metrics: AssetMetricAggregate;
};

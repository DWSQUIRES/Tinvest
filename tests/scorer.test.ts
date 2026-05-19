import { describe, expect, it } from "vitest";
import { aggregatePoolMetrics, scoreAsset } from "../src/scoring/scorer.js";

describe("scorer", () => {
  it("aggregates pool snapshots by base asset and computes change", () => {
    const latest = [
      {
        pool: { baseAsset: { id: "asset-1", symbol: "AAA", name: "Asset A" } },
        snapshot: {
          capturedAt: new Date("2026-05-19T10:00:00Z"),
          liquidityUsd: "200000",
          volume24hUsd: "50000",
          volume7dUsd: "250000",
          priceUsd: "1.2",
          txCount24h: 100
        }
      },
      {
        pool: { baseAsset: { id: "asset-1", symbol: "AAA", name: "Asset A" } },
        snapshot: {
          capturedAt: new Date("2026-05-19T10:01:00Z"),
          liquidityUsd: "100000",
          volume24hUsd: "20000",
          volume7dUsd: "90000",
          priceUsd: null,
          txCount24h: 50
        }
      }
    ];
    const previous = [
      {
        pool: { baseAsset: { id: "asset-1" } },
        snapshot: {
          liquidityUsd: "150000",
          volume24hUsd: "35000"
        }
      }
    ];

    const [metric] = aggregatePoolMetrics(latest, previous);

    expect(metric.liquidityUsd).toBe(300000);
    expect(metric.volume24hUsd).toBe(70000);
    expect(metric.poolCount).toBe(2);
    expect(metric.liquidityChange24h).toBeCloseTo(100);
    expect(metric.volumeChange24h).toBeCloseTo(100);
  });

  it("keeps high-liquidity assets lower risk than thin spike assets", () => {
    const stable = scoreAsset(
      {
        assetId: "stable",
        symbol: "AAA",
        poolCount: 3,
        liquidityUsd: 1_000_000,
        volume24hUsd: 150_000,
        volume7dUsd: 900_000,
        txCount24h: 1000,
        liquidityChange24h: 5,
        volumeChange24h: 20,
        capturedAt: new Date()
      },
      10_000
    );

    const risky = scoreAsset(
      {
        assetId: "risky",
        symbol: "BBB",
        poolCount: 1,
        liquidityUsd: 2_000,
        volume24hUsd: 200_000,
        volume7dUsd: 210_000,
        txCount24h: 20,
        liquidityChange24h: -50,
        volumeChange24h: 800,
        capturedAt: new Date()
      },
      10_000
    );

    expect(stable.opportunityScore).toBeGreaterThan(risky.opportunityScore);
    expect(risky.riskScore).toBeGreaterThan(stable.riskScore);
    expect(risky.reasons.risks.length).toBeGreaterThan(0);
  });
});

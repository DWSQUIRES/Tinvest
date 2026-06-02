import { describe, expect, it } from "vitest";
import { deterministicSwapCheck, formatSwapCheck } from "../src/llm/swap-check.js";
import { buildPromptInput } from "../src/services/ai-swap-check.js";
import type { SwapQuote } from "../src/services/swap/stonfi-swap.js";

const quote: SwapQuote = {
  offerAddress: "TON",
  askAddress: "TOKEN",
  offerUnits: "100000000",
  askUnits: "300000000",
  minAskUnits: "297000000",
  offerAmount: "0.1",
  askAmount: "0.3",
  minAskAmount: "0.297",
  slippageTolerance: "0.01",
  swapRate: "3",
  priceImpact: "0.1",
  routerAddress: "router",
  poolAddress: "pool",
  gasForward: "185000000",
  target: {
    symbol: "AAA",
    name: "Asset A",
    address: "TOKEN",
    decimals: 9
  },
  score: {
    opportunityScore: 75,
    riskScore: 20,
    rank: 4
  }
};

describe("AI swap check", () => {
  it("produces a favorable deterministic fallback for strong score and low impact", () => {
    const check = deterministicSwapCheck({
      token: quote.target,
      quote,
      score: {
        opportunityScore: 75,
        riskScore: 20
      }
    });

    expect(check.verdict).toBe("Favorable");
    expect(check.positiveSignals.join(" ")).toContain("75/100");
    expect(formatSwapCheck(check)).toContain("Verdict: Favorable");
  });

  it("flags high risk when risk score is elevated", () => {
    const check = deterministicSwapCheck({
      token: quote.target,
      quote,
      score: {
        opportunityScore: 50,
        riskScore: 80
      }
    });

    expect(check.verdict).toBe("High risk");
    expect(check.riskSignals.join(" ")).toContain("80/100");
  });

  it("builds prompt input from quote and score without wallet data", () => {
    const input = buildPromptInput(quote, {
      id: "score-id",
      assetId: "TOKEN",
      capturedAt: new Date(),
      rank: 4,
      opportunityScore: 75,
      riskScore: 20,
      liquidityScore: 80,
      activityScore: 70,
      marketHealthScore: 90,
      stabilityScore: 65,
      ecosystemScore: 60,
      reasons: {},
      metrics: {}
    });

    expect(input.token.symbol).toBe("AAA");
    expect(input.quote.offerAmount).toBe("0.1");
    expect(JSON.stringify(input)).not.toContain("wallet");
  });
});

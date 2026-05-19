import { describe, expect, it } from "vitest";
import { deterministicReport } from "../src/llm/deterministic-report.js";

describe("deterministicReport", () => {
  it("formats supplied score details without needing an LLM", () => {
    const report = deterministicReport({
      symbol: "AAA",
      name: "Asset A",
      rank: 2,
      opportunityScore: 78,
      riskScore: 24,
      components: {
        liquidityScore: 80,
        activityScore: 70,
        marketHealthScore: 90,
        stabilityScore: 65,
        ecosystemScore: 50
      },
      metrics: {},
      reasons: {
        positives: ["Liquidity is meaningful."],
        risks: ["No severe risk flag triggered."],
        changes: ["Volume changed +5.0%."]
      }
    });

    expect(report).toContain("AAA (Asset A)");
    expect(report).toContain("Opportunity: 78/100");
    expect(report).toContain("Why it ranks this way:");
    expect(report).toContain("Volume changed +5.0%.");
  });
});

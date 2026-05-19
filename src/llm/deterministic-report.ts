export type ReportInput = {
  symbol: string;
  name?: string | null;
  rank?: number | null;
  opportunityScore: number;
  riskScore: number;
  components: {
    liquidityScore: number;
    activityScore: number;
    marketHealthScore: number;
    stabilityScore: number;
    ecosystemScore: number;
  };
  reasons: unknown;
  metrics: unknown;
};

export function deterministicReport(input: ReportInput): string {
  const reasons = parseReasons(input.reasons);
  return [
    `${input.symbol}${input.name ? ` (${input.name})` : ""}`,
    `Rank: ${input.rank ?? "n/a"} | Opportunity: ${input.opportunityScore}/100 | Risk: ${input.riskScore}/100`,
    "",
    "Why it ranks this way:",
    ...reasons.positives.map((reason) => `- ${reason}`),
    "",
    "Risks:",
    ...reasons.risks.map((reason) => `- ${reason}`),
    "",
    "What to watch next:",
    ...reasons.changes.map((reason) => `- ${reason}`)
  ].join("\n");
}

function parseReasons(value: unknown): { positives: string[]; risks: string[]; changes: string[] } {
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return {
      positives: arrayOfStrings(source.positives),
      risks: arrayOfStrings(source.risks),
      changes: arrayOfStrings(source.changes)
    };
  }

  return {
    positives: ["The score is based on the latest STON.fi liquidity and activity snapshot."],
    risks: ["No detailed risk reasons were available."],
    changes: ["No comparison data was available."]
  };
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
}

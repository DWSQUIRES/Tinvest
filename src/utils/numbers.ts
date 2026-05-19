export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

export function percentChange(current?: number, previous?: number): number | undefined {
  if (current === undefined || previous === undefined || previous === 0) {
    return undefined;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
}

export function formatUsd(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 10 ? 0 : 4
  }).format(value);
}

export function formatPercent(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "n/a";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function decimalToUnits(amount: string, decimals: number): string {
  const normalized = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Amount must be a positive decimal number");
  }

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Amount has more than ${decimals} decimal places`);
  }

  const units = `${whole}${fraction.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
  return units === "" ? "0" : units;
}

export function unitsToDecimal(units: string, decimals: number, maxFractionDigits = 6): string {
  const value = BigInt(units);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionText = fraction.toString().padStart(decimals, "0").slice(0, maxFractionDigits).replace(/0+$/, "");
  return fractionText.length > 0 ? `${whole}.${fractionText}` : whole.toString();
}

export function isPositiveDecimal(amount: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(amount.trim())) {
    return false;
  }

  return Number(amount) > 0;
}

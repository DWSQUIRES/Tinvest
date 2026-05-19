import { describe, expect, it } from "vitest";
import { decimalToUnits, isPositiveDecimal, unitsToDecimal } from "../../src/services/swap/units.js";

describe("swap unit helpers", () => {
  it("converts TON decimals to nanotons", () => {
    expect(decimalToUnits("1", 9)).toBe("1000000000");
    expect(decimalToUnits("0.25", 9)).toBe("250000000");
    expect(decimalToUnits("1.000000001", 9)).toBe("1000000001");
  });

  it("converts units to display decimals", () => {
    expect(unitsToDecimal("1000000000", 9)).toBe("1");
    expect(unitsToDecimal("1234567890", 9)).toBe("1.234567");
  });

  it("validates positive decimal strings", () => {
    expect(isPositiveDecimal("0.1")).toBe(true);
    expect(isPositiveDecimal("0")).toBe(false);
    expect(isPositiveDecimal("abc")).toBe(false);
  });

  it("rejects too many decimal places", () => {
    expect(() => decimalToUnits("0.0000000001", 9)).toThrow(/decimal places/);
  });
});

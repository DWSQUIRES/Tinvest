import { describe, expect, it } from "vitest";
import { extractCollection, normalizeAsset, normalizePool } from "../src/stonfi/normalizers.js";

describe("STON.fi normalizers", () => {
  it("extracts asset lists from the live API envelope shape", () => {
    const rows = extractCollection({ asset_list: [{ contract_address: "EQ1", symbol: "TON" }] }, ["assets"]);

    expect(rows).toHaveLength(1);
    expect(normalizeAsset(rows[0])?.symbol).toBe("TON");
  });

  it("normalizes pool liquidity from lp_total_supply_usd", () => {
    const pool = normalizePool({
      address: "pool-1",
      token0_address: "asset-1",
      token0_symbol: "AAA",
      token1_address: "asset-2",
      token1_symbol: "BBB",
      lp_total_supply_usd: "120000.55",
      volume_24h_usd: "34000.12",
      lp_fee: "7",
      protocol_fee: "3"
    });

    expect(pool).toMatchObject({
      id: "pool-1",
      liquidityUsd: 120000.55,
      volume24hUsd: 34000.12,
      lpFeeBps: 7,
      protocolFeeBps: 3
    });
    expect(pool?.baseAsset.symbol).toBe("AAA");
    expect(pool?.quoteAsset?.symbol).toBe("BBB");
  });
});

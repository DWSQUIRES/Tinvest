import { toNumber } from "../utils/numbers.js";
import type { StonfiAsset, StonfiPool } from "./types.js";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }

  return undefined;
}

function stringField(source: JsonObject, names: string[]): string | undefined {
  for (const name of names) {
    const value = source[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function numberField(source: JsonObject, names: string[]): number | undefined {
  for (const name of names) {
    const value = toNumber(source[name]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

export function extractCollection(payload: unknown, names: string[]): JsonObject[] {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean).filter((item) => typeof item === "object") as JsonObject[];
  }

  const root = asObject(payload);
  if (!root) {
    return [];
  }

  for (const name of [...names, "data", "items", "result", "results"]) {
    const candidate = root[name];
    if (Array.isArray(candidate)) {
      return candidate.filter(Boolean).filter((item) => typeof item === "object") as JsonObject[];
    }
  }

  for (const value of Object.values(root)) {
    if (Array.isArray(value)) {
      return value.filter(Boolean).filter((item) => typeof item === "object") as JsonObject[];
    }
  }

  return [];
}

export function normalizeAsset(raw: JsonObject, fallbackSymbol = "UNKNOWN"): StonfiAsset | undefined {
  const id = stringField(raw, [
    "contract_address",
    "address",
    "jetton_address",
    "wallet_address",
    "asset",
    "id"
  ]);

  if (!id) {
    return undefined;
  }

  const symbol = stringField(raw, ["symbol", "ticker", "display_symbol"]) ?? fallbackSymbol;

  return {
    id,
    symbol: symbol.toUpperCase(),
    name: stringField(raw, ["name", "display_name"]),
    decimals: numberField(raw, ["decimals"]),
    imageUrl: stringField(raw, ["image_url", "image", "logo_url", "icon"]),
    raw
  };
}

function nestedAsset(raw: JsonObject, names: string[], fallbackSymbol: string): StonfiAsset | undefined {
  for (const name of names) {
    const candidate = asObject(raw[name]);
    if (candidate) {
      const asset = normalizeAsset(candidate, fallbackSymbol);
      if (asset) {
        return asset;
      }
    }
  }

  const address = stringField(raw, names.map((name) => `${name}_address`));
  if (!address) {
    return undefined;
  }

  const symbol = stringField(raw, names.map((name) => `${name}_symbol`)) ?? fallbackSymbol;
  return normalizeAsset({ address, symbol }, fallbackSymbol);
}

export function normalizePool(raw: JsonObject): StonfiPool | undefined {
  const address = stringField(raw, ["address", "pool_address", "contract_address", "id"]);
  const baseAsset =
    nestedAsset(raw, ["asset0", "token0", "base_asset", "baseAsset"], "ASSET0") ??
    normalizeAsset(
      {
        address: stringField(raw, ["asset0_address", "token0_address", "base_asset_address"]),
        symbol: stringField(raw, ["asset0_symbol", "token0_symbol", "base_asset_symbol"])
      },
      "ASSET0"
    );

  if (!address || !baseAsset) {
    return undefined;
  }

  const quoteAsset =
    nestedAsset(raw, ["asset1", "token1", "quote_asset", "quoteAsset"], "ASSET1") ??
    normalizeAsset(
      {
        address: stringField(raw, ["asset1_address", "token1_address", "quote_asset_address"]),
        symbol: stringField(raw, ["asset1_symbol", "token1_symbol", "quote_asset_symbol"])
      },
      "ASSET1"
    );

  return {
    id: address,
    address,
    baseAsset,
    quoteAsset,
    lpFeeBps: numberField(raw, ["lp_fee_bps", "lpFeeBps", "lp_fee"]),
    protocolFeeBps: numberField(raw, ["protocol_fee_bps", "protocolFeeBps", "protocol_fee"]),
    liquidityUsd: numberField(raw, ["liquidity_usd", "liquidityUsd", "tvl_usd", "tvlUsd", "reserve_usd", "lp_total_supply_usd"]),
    volume24hUsd: numberField(raw, ["volume_24h_usd", "volume24hUsd", "volume_usd_24h", "volume24h"]),
    volume7dUsd: numberField(raw, ["volume_7d_usd", "volume7dUsd", "volume_usd_7d", "volume7d"]),
    priceUsd: numberField(raw, ["price_usd", "priceUsd", "asset0_price_usd", "token0_price_usd"]),
    txCount24h: numberField(raw, ["tx_count_24h", "txCount24h", "transactions_24h", "swaps_24h"]),
    raw
  };
}

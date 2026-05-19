export type StonfiAsset = {
  id: string;
  symbol: string;
  name?: string;
  decimals?: number;
  imageUrl?: string;
  raw: Record<string, unknown>;
};

export type StonfiPool = {
  id: string;
  address?: string;
  baseAsset: StonfiAsset;
  quoteAsset?: StonfiAsset;
  lpFeeBps?: number;
  protocolFeeBps?: number;
  liquidityUsd?: number;
  volume24hUsd?: number;
  volume7dUsd?: number;
  priceUsd?: number;
  txCount24h?: number;
  raw: Record<string, unknown>;
};

export type StonfiSnapshot = {
  assets: StonfiAsset[];
  pools: StonfiPool[];
};

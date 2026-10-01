export type CoinSort =
  | "last_trade_timestamp"
  | "created_timestamp"
  | "market_cap";

export type PumpCoin = {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image_uri?: string;
  created_timestamp: number;
  last_trade_timestamp?: number;
  market_cap_usd?: number;
  usd_market_cap?: number;
  ath_market_cap?: number;
  reply_count?: number;
  complete?: boolean;
  nsfw?: boolean;
  king_of_the_hill_timestamp?: number;
  username?: string;
  profile_image?: string;
};

export type DexPairStats = {
  volume24h?: number;
  txns24h?: number;
  priceChange1h?: number;
  priceChange6h?: number;
  priceChange24h?: number;
  traders?: number;
};

export type EnrichedCoin = PumpCoin & {
  rank: number;
  marketCapUsd: number;
  athUsd: number;
  stats: DexPairStats;
  pumpUrl: string;
};

export const PUMP_API = "https://frontend-api-v3.pump.fun/coins";

export function coinMarketCapUsd(coin: PumpCoin): number {
  return coin.usd_market_cap ?? coin.market_cap_usd ?? 0;
}

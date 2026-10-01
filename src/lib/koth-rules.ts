export const MAX_LEADERBOARD_MARKET_CAP_USD = 200_000;
export const HILL_TENURE_MS = 10 * 60 * 1000;

export function isEligibleLeaderboardMarketCap(marketCapUsd: number): boolean {
  return marketCapUsd > 0 && marketCapUsd <= MAX_LEADERBOARD_MARKET_CAP_USD;
}

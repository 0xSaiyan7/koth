import { HILL_TENURE_MS } from "@/lib/koth-rules";
import type { EnrichedCoin } from "@/lib/pump";

type HillState = {
  mint: string;
  crownedAt: number;
  coin: EnrichedCoin;
};

let activeHill: HillState | null = null;

function pickNewHill(eligible: EnrichedCoin[]): EnrichedCoin | null {
  if (eligible.length === 0) return null;

  return eligible.reduce<EnrichedCoin | null>((best, coin) => {
    if (!best) return coin;
    const vol = coin.stats.volume24h ?? 0;
    const bestVol = best.stats.volume24h ?? 0;
    if (vol !== bestVol) return vol > bestVol ? coin : best;
    return coin.marketCapUsd > best.marketCapUsd ? coin : best;
  }, null);
}

export type HillResolution = {
  hill: EnrichedCoin | null;
  crownedAt: number | null;
  expiresAt: number | null;
};

export function resolveHill(
  enriched: EnrichedCoin[],
  eligible: EnrichedCoin[],
): HillResolution {
  const now = Date.now();
  const freshByMint = new Map(enriched.map((coin) => [coin.mint, coin]));

  if (activeHill && now - activeHill.crownedAt < HILL_TENURE_MS) {
    const fresh = freshByMint.get(activeHill.mint);
    if (fresh) {
      activeHill = {
        ...activeHill,
        coin: { ...fresh, rank: activeHill.coin.rank },
      };
    }
    return {
      hill: activeHill.coin,
      crownedAt: activeHill.crownedAt,
      expiresAt: activeHill.crownedAt + HILL_TENURE_MS,
    };
  }

  const next = pickNewHill(eligible);
  if (!next) {
    activeHill = null;
    return { hill: null, crownedAt: null, expiresAt: null };
  }

  activeHill = { mint: next.mint, crownedAt: now, coin: next };
  return {
    hill: next,
    crownedAt: now,
    expiresAt: now + HILL_TENURE_MS,
  };
}

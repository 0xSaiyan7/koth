import { NextRequest, NextResponse } from "next/server";
import {
  PUMP_API,
  type CoinSort,
  type DexPairStats,
  type EnrichedCoin,
  type PumpCoin,
  coinMarketCapUsd,
} from "@/lib/pump";

const SORTS: CoinSort[] = [
  "last_trade_timestamp",
  "created_timestamp",
  "market_cap",
];

type DexTokenResponse = {
  chainId: string;
  dexId: string;
  baseToken: { address: string };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  priceChange?: { h1?: number; h6?: number; h24?: number };
};

type CacheEntry = { expires: number; payload: PumpCoin[] };
const listCache = new Map<string, CacheEntry>();

async function fetchPumpCoins(
  sort: CoinSort,
  offset: number,
  limit: number,
): Promise<PumpCoin[]> {
  const cacheKey = `${sort}:${offset}:${limit}`;
  const cached = listCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.payload;
  }

  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    sort,
    order: "DESC",
    includeNsfw: "false",
  });

  const url = `${PUMP_API}?${params}`;
  const headers = {
    Accept: "application/json",
    Origin: "https://pump.fun",
    Referer: "https://pump.fun/",
  };

  let lastError = "Pump.fun request failed";

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers, cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as PumpCoin[];
      const payload = Array.isArray(data) ? data : [];
      listCache.set(cacheKey, {
        payload,
        expires: Date.now() + 15_000,
      });
      return payload;
    }

    const text = await res.text();
    lastError = `Pump.fun API ${res.status}: ${text.slice(0, 200)}`;

    if (res.status === 429) {
      let waitMs = 250 * (attempt + 1);
      try {
        const parsed = JSON.parse(text) as { retryAfterMs?: number };
        if (parsed.retryAfterMs) waitMs = parsed.retryAfterMs + 50;
      } catch {
        // use default backoff
      }
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    throw new Error(lastError);
  }

  if (cached) return cached.payload;
  throw new Error(lastError);
}

async function fetchDexStats(mints: string[]): Promise<Map<string, DexPairStats>> {
  const map = new Map<string, DexPairStats>();
  if (mints.length === 0) return map;

  const chunkSize = 30;
  for (let i = 0; i < mints.length; i += chunkSize) {
    const chunk = mints.slice(i, i + chunkSize);
    const url = `https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`;
    try {
      const res = await fetch(url, { next: { revalidate: 0 } });
      if (!res.ok) continue;
      const pairs = (await res.json()) as DexTokenResponse[];
      if (!Array.isArray(pairs)) continue;

      for (const pair of pairs) {
        const mint = pair.baseToken?.address;
        if (!mint) continue;
        const isPump =
          pair.dexId === "pumpfun" ||
          pair.dexId === "pumpswap" ||
          pair.chainId === "solana";
        if (!isPump) continue;

        const existing = map.get(mint);
        const vol = pair.volume?.h24 ?? 0;
        if (existing && (existing.volume24h ?? 0) > vol) continue;

        const buys = pair.txns?.h24?.buys ?? 0;
        const sells = pair.txns?.h24?.sells ?? 0;
        map.set(mint, {
          volume24h: vol,
          txns24h: buys + sells,
          priceChange1h: pair.priceChange?.h1,
          priceChange6h: pair.priceChange?.h6,
          priceChange24h: pair.priceChange?.h24,
        });
      }
    } catch {
      // Dex enrichment is best-effort; pump list remains primary.
    }
  }

  return map;
}

function withVolumeOnly(coins: PumpCoin[]): PumpCoin[] {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return coins.filter((coin) => {
    const lastTrade = coin.last_trade_timestamp ?? 0;
    return lastTrade >= weekAgo;
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sortParam = searchParams.get("sort") ?? "last_trade_timestamp";
  const sort = SORTS.includes(sortParam as CoinSort)
    ? (sortParam as CoinSort)
    : "last_trade_timestamp";
  const offset = Math.max(0, Number(searchParams.get("offset") ?? "0") || 0);
  const limit = Math.min(50, Math.max(10, Number(searchParams.get("limit") ?? "30") || 30));
  const requireVolume = searchParams.get("volume") !== "false";

  try {
    let coins = await fetchPumpCoins(sort, offset, limit);
    if (requireVolume) {
      coins = withVolumeOnly(coins);
    }

    const dex = await fetchDexStats(coins.map((c) => c.mint));

    const enriched: EnrichedCoin[] = coins.map((coin, index) => {
      const marketCapUsd = coinMarketCapUsd(coin);
      const athUsd = coin.ath_market_cap ?? marketCapUsd;
      return {
        ...coin,
        rank: offset + index + 1,
        marketCapUsd,
        athUsd,
        stats: dex.get(coin.mint) ?? {},
        pumpUrl: `https://pump.fun/coin/${coin.mint}`,
      };
    });

    if (sort === "market_cap") {
      enriched.sort((a, b) => b.marketCapUsd - a.marketCapUsd);
      enriched.forEach((c, i) => {
        c.rank = offset + i + 1;
      });
    }

    const hill =
      enriched.reduce<EnrichedCoin | null>((best, coin) => {
        if (!best) return coin;
        const vol = coin.stats.volume24h ?? 0;
        const bestVol = best.stats.volume24h ?? 0;
        if (vol !== bestVol) return vol > bestVol ? coin : best;
        return coin.marketCapUsd > best.marketCapUsd ? coin : best;
      }, null) ?? enriched[0] ?? null;

    return NextResponse.json({
      coins: enriched,
      hill,
      fetchedAt: Date.now(),
      source: "pump.fun",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

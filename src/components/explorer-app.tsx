"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CoinSort, EnrichedCoin } from "@/lib/pump";
import { formatAge, formatCompact, formatPct, formatUsd } from "@/lib/format";
import { Sparkline } from "@/components/sparkline";

type TabId = "movers" | "new" | "marketcap";

const TAB_SORT: Record<TabId, CoinSort> = {
  movers: "last_trade_timestamp",
  new: "created_timestamp",
  marketcap: "market_cap",
};

const TAB_LABEL: Record<TabId, string> = {
  movers: "Movers",
  new: "New",
  marketcap: "Market cap",
};

export function ExplorerApp() {
  const [tab, setTab] = useState<TabId>("movers");
  const [coins, setCoins] = useState<EnrichedCoin[]>([]);
  const [hill, setHill] = useState<EnrichedCoin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [hillExpiresAt, setHillExpiresAt] = useState<number | null>(null);

  const load = useCallback(async (activeTab: TabId) => {
    setLoading(true);
    setError(null);
    try {
      const sort = TAB_SORT[activeTab];
      const res = await fetch(`/api/coins?sort=${sort}&limit=40`, {
        cache: "no-store",
      });
      const body = (await res.json()) as {
        coins?: EnrichedCoin[];
        hill?: EnrichedCoin | null;
        hillExpiresAt?: number | null;
        error?: string;
        fetchedAt?: number;
      };
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to load coins");
      }
      setCoins(body.coins ?? []);
      setHill(body.hill ?? null);
      setHillExpiresAt(body.hillExpiresAt ?? null);
      setFetchedAt(body.fetchedAt ?? Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load coins");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
    const id = window.setInterval(() => void load(tab), 20_000);
    return () => window.clearInterval(id);
  }, [tab, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return coins;
    return coins.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q) ||
        c.mint.toLowerCase().includes(q),
    );
  }, [coins, query]);

  const toggleFavorite = (mint: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(mint)) next.delete(mint);
      else next.add(mint);
      return next;
    });
  };

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] text-white">
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-white/5 bg-[#080808] py-4 md:flex">
        <NavIcon label="Explore" active>
          <HomeIcon />
        </NavIcon>
        <NavIcon label="Trending">
          <FireIcon />
        </NavIcon>
        <NavIcon label="Launch">
          <RocketIcon />
        </NavIcon>
        <a
          href="https://pump.fun"
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-lg bg-[#39ff14] text-black transition hover:bg-[#5dff3f]"
          title="Create on pump.fun"
        >
          <span className="text-xl font-bold leading-none">+</span>
        </a>
        <div className="mt-auto flex flex-col gap-3">
          <NavIcon label="Support">
            <HeadsetIcon />
          </NavIcon>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-white/5 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="KOTH" width={36} height={36} className="rounded-md" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold tracking-tight">KOTH</p>
                <p className="text-[11px] text-white/45">King Of The Hill</p>
              </div>
            </div>
            <div className="mx-auto w-full max-w-xl">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search live pump.fun coins..."
                className="w-full rounded-full border border-white/10 bg-[#141414] px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-[#39ff14]/50"
              />
            </div>
            <button
              type="button"
              className="hidden rounded-lg border border-[#39ff14]/60 px-4 py-2 text-sm font-medium text-[#39ff14] sm:block"
            >
              Sign in
            </button>
          </div>
        </header>

        {hill ? (
          <section className="border-b border-[#39ff14]/15 bg-gradient-to-r from-[#39ff14]/10 via-transparent to-transparent px-4 py-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-[#39ff14]">
                  On the hill
                </p>
                <h1 className="mt-1 text-lg font-semibold md:text-xl">
                  {hill.name}{" "}
                  <span className="text-white/45">${hill.symbol}</span>
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-white/55">
                  Crowned from coins at or under $200K market cap (top 24h volume
                  in this feed). While on the hill for 10 minutes, market cap can
                  run above $200K. $KOTH creator fees buy back into this coin.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {hill.image_uri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hill.image_uri}
                    alt=""
                    className="h-14 w-14 rounded-full border border-[#39ff14]/30 object-cover"
                  />
                ) : null}
                <div className="text-right">
                  <p className="text-sm text-white/45">Market cap</p>
                  <p className="text-lg font-semibold text-[#39ff14]">
                    {formatUsd(hill.marketCapUsd)}
                  </p>
                  {hillExpiresAt ? (
                    <p className="text-xs text-white/45">
                      Hill time left: {formatHillTimeLeft(hillExpiresAt)}
                    </p>
                  ) : null}
                  <a
                    href={hill.pumpUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-white/60 underline-offset-2 hover:text-white hover:underline"
                  >
                    View on pump.fun
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <main className="flex-1 px-4 py-4 md:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {(Object.keys(TAB_SORT) as TabId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  tab === id
                    ? "bg-[#39ff14] font-medium text-black"
                    : "bg-[#141414] text-white/70 hover:bg-[#1c1c1c]"
                }`}
              >
                {TAB_LABEL[id]}
              </button>
            ))}
            <span className="ml-auto text-xs text-white/35">
              {fetchedAt
                ? `Updated ${formatAge(fetchedAt)} ago · pump.fun · leaderboard max $200K mcap`
                : "Loading pump.fun..."}
            </span>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0f0f0f]">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-xs text-white/40">
                  <th className="px-3 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">COIN</th>
                  <th className="px-3 py-3 font-medium">GRAPH</th>
                  <th className="px-3 py-3 font-medium">MCAP</th>
                  <th className="px-3 py-3 font-medium">ATH</th>
                  <th className="px-3 py-3 font-medium">AGE</th>
                  <th className="px-3 py-3 font-medium">TXNS</th>
                  <th className="px-3 py-3 font-medium">24H VOL</th>
                  <th className="px-3 py-3 font-medium">1H</th>
                  <th className="px-3 py-3 font-medium">6H</th>
                  <th className="px-3 py-3 font-medium">24H</th>
                  <th className="px-3 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-10 text-center text-white/45">
                      Pulling live coins from pump.fun...
                    </td>
                  </tr>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-10 text-center text-white/45">
                      No coins match your search.
                    </td>
                  </tr>
                ) : null}
                {filtered.map((coin) => {
                  const athRatio =
                    coin.athUsd > 0 ? coin.marketCapUsd / coin.athUsd : 0;
                  const change24 = coin.stats.priceChange24h;
                  const positive = (change24 ?? 0) >= 0;
                  const isHill = hill?.mint === coin.mint;

                  return (
                    <tr
                      key={coin.mint}
                      className={`border-b border-white/5 transition hover:bg-white/[0.02] ${
                        isHill ? "bg-[#39ff14]/[0.04]" : ""
                      }`}
                    >
                      <td className="px-3 py-3 text-white/50">{coin.rank}</td>
                      <td className="px-3 py-3">
                        <a
                          href={coin.pumpUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2.5"
                        >
                          {coin.image_uri ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={coin.image_uri}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-[#1a1a1a]" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {coin.name}
                              {isHill ? (
                                <span className="ml-2 rounded bg-[#39ff14]/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[#39ff14]">
                                  Hill
                                </span>
                              ) : null}
                            </p>
                            <p className="text-xs text-white/40">${coin.symbol}</p>
                          </div>
                        </a>
                      </td>
                      <td className="px-3 py-3">
                        <Sparkline progress={athRatio} positive={positive} />
                      </td>
                      <td className="px-3 py-3 font-medium text-[#39ff14]">
                        {formatUsd(coin.marketCapUsd)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-[100px] flex-col gap-1">
                          <span className="text-xs text-white/55">
                            {formatUsd(coin.athUsd)}
                          </span>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-[#39ff14]"
                              style={{ width: `${Math.min(100, athRatio * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-white/55">
                        {formatAge(coin.created_timestamp)}
                      </td>
                      <td className="px-3 py-3 text-white/55">
                        {coin.stats.txns24h !== undefined
                          ? formatCompact(coin.stats.txns24h)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-white/55">
                        {coin.stats.volume24h !== undefined
                          ? formatUsd(coin.stats.volume24h)
                          : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <PctPill value={coin.stats.priceChange1h} />
                      </td>
                      <td className="px-3 py-3">
                        <PctPill value={coin.stats.priceChange6h} />
                      </td>
                      <td className="px-3 py-3">
                        <PctPill value={coin.stats.priceChange24h} />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(coin.mint)}
                          className="text-white/30 hover:text-[#39ff14]"
                          aria-label="Favorite"
                        >
                          <StarIcon filled={favorites.has(coin.mint)} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

function PctPill({ value }: { value?: number }) {
  if (value === undefined || !Number.isFinite(value)) {
    return <span className="text-white/35">—</span>;
  }
  const up = value >= 0;
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${
        up ? "bg-[#39ff14]/15 text-[#39ff14]" : "bg-red-500/10 text-red-400"
      }`}
    >
      {formatPct(value)}
    </span>
  );
}

function NavIcon({
  children,
  label,
  active,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
        active ? "bg-white/10 text-[#39ff14]" : "text-white/45 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function FireIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22c4-2 7-6 7-11a7 7 0 0 0-14 0c0 5 3 9 7 11z" />
    </svg>
  );
}

function RocketIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4.5 16.5c8.5-1 12-4.5 13.5-13.5-9 1.5-12.5 5-13.5 13.5z" />
      <path d="M12 12 8 16" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14a8 8 0 0 1 16 0" />
      <path d="M4 14v3a2 2 0 0 0 2 2h1v-5H4zM20 14v3a2 2 0 0 1-2 2h-1v-5h3z" />
    </svg>
  );
}

function formatHillTimeLeft(expiresAt: number): string {
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "0m";
  const minutes = Math.ceil(ms / 60_000);
  return `${minutes}m`;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      className={filled ? "text-[#39ff14]" : undefined}
    >
      <path d="m12 2 3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
    </svg>
  );
}

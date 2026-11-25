import { and, asc, desc, eq, gt, lte, sql } from "drizzle-orm";
import { db, price } from "@/db";
import { getUser } from "./user";
import type { Bar } from "./patterns";

// Provider: Twelve Data (free key, no credit card). Checked on 2026-11-25: daily bars for AAPL back to 2007.
// Well-known names Pattern Lab draws its past charts from. Watchlist tickers are added on top.
export const LAB_TICKERS = ["SPY", "AAPL", "MSFT", "NVDA", "AMZN", "TSLA"];
export const SHOWN = 120; // trading days shown before the cut-off
export const HIDDEN = 30; // trading days revealed afterwards (about six weeks)
const PER_RUN = 7; // stay under the free plan's per-minute request limit

export const validTicker = (s: string) => /^[A-Z][A-Z.\-]{0,7}$/.test(s);

export async function fetchSeries(symbol: string, outputsize: number): Promise<Bar[]> {
  const key = process.env.MARKET_DATA_API_KEY;
  if (!key) throw new Error("MARKET_DATA_API_KEY is not set");
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=${outputsize}&apikey=${encodeURIComponent(key)}`;
  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();
  if (j.status !== "ok" || !Array.isArray(j.values)) throw new Error(j.message || `Twelve Data error ${r.status}`);
  return (j.values as Record<string, string>[])
    .map((v) => ({ day: v.datetime.slice(0, 10), open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: +(v.volume ?? 0) }))
    .filter((b) => Number.isFinite(b.close) && b.close > 0)
    .reverse();
}

// Pulls end-of-day prices for the Pattern Lab tickers and the watchlist. Run once a day by the cron.
// The first pull for a ticker loads its full history. Later pulls only top up the latest days.
export async function syncPrices() {
  const d = db();
  const u = await getUser();
  const symbols = [...new Set([...LAB_TICKERS, ...u.watchlist.filter(validTicker)])];
  const latest = await d.select({ symbol: price.symbol, day: sql<string>`max(${price.day})` }).from(price).groupBy(price.symbol);
  const last = new Map(latest.map((l) => [l.symbol, l.day]));
  // Stalest first, so a long list still gets fully covered over a couple of runs.
  const order = symbols.sort((a, b) => (last.get(a) ?? "").localeCompare(last.get(b) ?? "")).slice(0, PER_RUN);

  const updated: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const symbol of order) {
    try {
      const bars = await fetchSeries(symbol, last.has(symbol) ? 30 : 5000);
      for (let i = 0; i < bars.length; i += 500) {
        await d
          .insert(price)
          .values(bars.slice(i, i + 500).map((b) => ({ symbol, ...b })))
          .onConflictDoUpdate({
            target: [price.symbol, price.day],
            set: { open: sql`excluded.open`, high: sql`excluded.high`, low: sql`excluded.low`, close: sql`excluded.close`, volume: sql`excluded.volume` },
          });
      }
      updated[symbol] = bars.length;
    } catch (e) {
      errors[symbol] = (e as Error).message;
    }
  }
  return { updated, errors, waiting: symbols.filter((s) => !order.includes(s)) };
}

const toBar = (r: typeof price.$inferSelect): Bar => ({ day: r.day, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume });

// A random past window from a random ticker that has enough history.
export async function pickRound() {
  const d = db();
  const counts = await d.select({ symbol: price.symbol, n: sql<number>`count(*)::int` }).from(price).groupBy(price.symbol);
  const usable = counts.filter((c) => c.n >= SHOWN + HIDDEN + 20);
  if (!usable.length) return null;
  const pick = usable[Math.floor(Math.random() * usable.length)];
  const offset = Math.floor(Math.random() * (pick.n - SHOWN - HIDDEN + 1));
  const rows = await d.select().from(price).where(eq(price.symbol, pick.symbol)).orderBy(asc(price.day)).offset(offset).limit(SHOWN);
  return { symbol: pick.symbol, shown: rows.map(toBar) };
}

export async function roundBars(symbol: string, endDay: string) {
  const d = db();
  const before = await d.select().from(price).where(and(eq(price.symbol, symbol), lte(price.day, endDay))).orderBy(desc(price.day)).limit(SHOWN);
  const after = await d.select().from(price).where(and(eq(price.symbol, symbol), gt(price.day, endDay))).orderBy(asc(price.day)).limit(HIDDEN);
  return { shown: before.reverse().map(toBar), after: after.map(toBar) };
}

// The latest stretch for each watchlist ticker, for the "Current market" cards.
export async function currentCharts() {
  const d = db();
  const u = await getUser();
  const symbols = u.watchlist.filter(validTicker).length ? u.watchlist.filter(validTicker) : ["SPY"];
  const out: { symbol: string; bars: Bar[] }[] = [];
  for (const symbol of symbols.slice(0, 6)) {
    const rows = await d.select().from(price).where(eq(price.symbol, symbol)).orderBy(desc(price.day)).limit(SHOWN);
    if (rows.length >= 30) out.push({ symbol, bars: rows.reverse().map(toBar) });
  }
  return { charts: out, missing: symbols.filter((s) => !out.some((o) => o.symbol === s)) };
}

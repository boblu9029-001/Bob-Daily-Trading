import type { OHLCV, Timeframe } from "./types";
import {
  detectAssetClass,
  toBinanceSymbol,
  toYahooSymbol,
} from "./symbols";

const memoryCache = new Map<string, { at: number; bars: OHLCV[] }>();
const TTL_MS = 60_000;

function cacheKey(symbol: string, tf: Timeframe) {
  return `${symbol}:${tf}`;
}

function getCached(symbol: string, tf: Timeframe): OHLCV[] | null {
  const hit = memoryCache.get(cacheKey(symbol, tf));
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) return null;
  return hit.bars;
}

function setCache(symbol: string, tf: Timeframe, bars: OHLCV[]) {
  memoryCache.set(cacheKey(symbol, tf), { at: Date.now(), bars });
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

/** Alpaca Market Data (optional keys). */
async function fetchAlpacaBars(
  symbol: string,
  timeframe: Timeframe
): Promise<OHLCV[] | null> {
  const key = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_API_SECRET;
  if (!key || !secret) return null;

  const tf = timeframe === "5m" ? "5Min" : "1Day";
  const limit = timeframe === "5m" ? 500 : 400;
  const url = `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(
    symbol
  )}/bars?timeframe=${tf}&limit=${limit}&adjustment=split`;

  try {
    const data = await fetchJson<{
      bars: {
        t: string;
        o: number;
        h: number;
        l: number;
        c: number;
        v: number;
      }[];
    }>(url, {
      headers: {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
      },
    });
    if (!data.bars?.length) return null;
    return data.bars.map((b) => ({
      time: Math.floor(new Date(b.t).getTime() / 1000),
      open: b.o,
      high: b.h,
      low: b.l,
      close: b.c,
      volume: b.v,
    }));
  } catch {
    return null;
  }
}

/** Binance public klines for crypto. */
async function fetchBinanceBars(
  symbol: string,
  timeframe: Timeframe
): Promise<OHLCV[] | null> {
  const pair = toBinanceSymbol(symbol);
  const interval = timeframe === "5m" ? "5m" : "1d";
  const limit = timeframe === "5m" ? 500 : 400;
  const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
  try {
    const rows = await fetchJson<
      [number, string, string, string, string, string][]
    >(url);
    return rows.map((r) => ({
      time: Math.floor(r[0] / 1000),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }));
  } catch {
    return null;
  }
}

/** Yahoo Chart API — works without keys for equities & crypto. */
async function fetchYahooBars(
  symbol: string,
  timeframe: Timeframe
): Promise<OHLCV[] | null> {
  const ysym = toYahooSymbol(symbol);
  const range = timeframe === "5m" ? "5d" : "2y";
  const interval = timeframe === "5m" ? "5m" : "1d";
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ysym
  )}?range=${range}&interval=${interval}&includePrePost=false`;

  try {
    const data = await fetchJson<{
      chart: {
        result: {
          timestamp: number[];
          indicators: {
            quote: {
              open: (number | null)[];
              high: (number | null)[];
              low: (number | null)[];
              close: (number | null)[];
              volume: (number | null)[];
            }[];
          };
        }[];
      };
    }>(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 BobDailyTrading/1.0",
      },
    });
    const result = data.chart?.result?.[0];
    if (!result?.timestamp?.length) return null;
    const q = result.indicators.quote[0];
    const bars: OHLCV[] = [];
    for (let i = 0; i < result.timestamp.length; i++) {
      const o = q.open[i];
      const h = q.high[i];
      const l = q.low[i];
      const c = q.close[i];
      if (o == null || h == null || l == null || c == null) continue;
      bars.push({
        time: result.timestamp[i],
        open: o,
        high: h,
        low: l,
        close: c,
        volume: q.volume[i] ?? 0,
      });
    }
    return bars;
  } catch {
    return null;
  }
}

/** CoinGecko simple price (optional enrichment). */
export async function fetchCoinGeckoChange(
  id: string
): Promise<number | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
    const data = await fetchJson<Record<string, { usd_24h_change?: number }>>(
      url
    );
    return data[id]?.usd_24h_change ?? null;
  } catch {
    return null;
  }
}

export async function getBars(
  symbol: string,
  timeframe: Timeframe = "1D"
): Promise<OHLCV[]> {
  const sym = symbol.trim().toUpperCase();
  const cached = getCached(sym, timeframe);
  if (cached) return cached;

  const asset = detectAssetClass(sym);
  let bars: OHLCV[] | null = null;

  if (asset === "crypto") {
    bars = await fetchBinanceBars(sym, timeframe);
    if (!bars?.length) bars = await fetchYahooBars(sym, timeframe);
  } else {
    bars = await fetchAlpacaBars(sym, timeframe);
    if (!bars?.length) bars = await fetchYahooBars(sym, timeframe);
  }

  if (!bars?.length) {
    throw new Error(`無法取得 ${sym} 行情資料`);
  }

  // ensure ascending unique times
  const dedup = new Map<number, OHLCV>();
  for (const b of bars) dedup.set(b.time, b);
  const sorted = [...dedup.values()].sort((a, b) => a.time - b.time);
  setCache(sym, timeframe, sorted);
  return sorted;
}

export async function getLastPrice(symbol: string): Promise<number> {
  const bars = await getBars(symbol, "1D");
  return bars[bars.length - 1].close;
}

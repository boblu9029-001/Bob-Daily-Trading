import type { OHLCV } from "./types";

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

export function emaSeries(
  bars: OHLCV[],
  period: number
): { time: number; value: number }[] {
  const closes = bars.map((b) => b.close);
  const series = ema(closes, period);
  const result: { time: number; value: number }[] = [];
  for (let i = 0; i < bars.length; i++) {
    const v = series[i];
    if (v != null) result.push({ time: bars[i].time, value: round(v, 6) });
  }
  return result;
}

/** Anchored VWAP from first bar (or optional anchor index). */
export function anchoredVwap(
  bars: OHLCV[],
  anchorIndex = 0
): { time: number; value: number }[] {
  let cumPV = 0;
  let cumV = 0;
  const out: { time: number; value: number }[] = [];
  for (let i = Math.max(0, anchorIndex); i < bars.length; i++) {
    const b = bars[i];
    const typical = (b.high + b.low + b.close) / 3;
    const vol = Math.max(b.volume, 1e-9);
    cumPV += typical * vol;
    cumV += vol;
    out.push({ time: b.time, value: round(cumPV / cumV, 6) });
  }
  return out;
}

export function lastEma(bars: OHLCV[], period: number): number | null {
  const s = emaSeries(bars, period);
  return s.length ? s[s.length - 1].value : null;
}

export function ema9DeviationPct(price: number, ema9: number): number {
  if (!ema9) return 0;
  return ((price - ema9) / ema9) * 100;
}

/** 20-day Average Daily Range % */
export function adr20Pct(bars: OHLCV[]): number {
  const daily = bars.slice(-21);
  if (daily.length < 2) return 0;
  const ranges: number[] = [];
  for (let i = 1; i < daily.length; i++) {
    const prevClose = daily[i - 1].close;
    if (!prevClose) continue;
    ranges.push(((daily[i].high - daily[i].low) / prevClose) * 100);
  }
  if (!ranges.length) return 0;
  const n = Math.min(20, ranges.length);
  const slice = ranges.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function isEmaStackBullish(
  ema9: number,
  ema21: number,
  ema50: number
): boolean {
  return ema9 > ema21 && ema21 > ema50;
}

export function changePct(current: number, previous: number): number {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function round(n: number, digits = 2): number {
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Highest high over lookback (for 52w approx). */
export function highestHigh(bars: OHLCV[], lookback = 252): number {
  const slice = bars.slice(-lookback);
  if (!slice.length) return 0;
  return Math.max(...slice.map((b) => b.high));
}

export function rMultiple(
  entry: number,
  stop: number,
  last: number,
  side: "long" = "long"
): number {
  const risk = Math.abs(entry - stop);
  if (risk < 1e-9) return 0;
  const pnl = side === "long" ? last - entry : entry - last;
  return pnl / risk;
}

export function riskAmount(
  entry: number,
  stop: number,
  qty: number
): number {
  return Math.abs(entry - stop) * qty;
}

import {
  adr20Pct,
  anchoredVwap,
  ema9DeviationPct,
  isEmaStackBullish,
  lastEma,
  round,
} from "./indicators";
import type { OHLCV, TradeSignal } from "./types";
import { NO_CHASE_DEV_PCT } from "./types";

const DEFAULT_STOP_PCT = 0.018; // ~1.8% hard stop suggestion

function hardStop(entry: number, floor?: number): number {
  const s = entry * (1 - DEFAULT_STOP_PCT);
  if (floor != null && floor < s) return round(floor * 0.998, 4);
  return round(s, 4);
}

function oneRPct(entry: number, stop: number): number {
  if (!entry) return 0;
  return round(((entry - stop) / entry) * 100, 2);
}

/** 🚀 Launchpad：日線回踩 9/21 EMA + 5m V-Reclaim */
function detectLaunchpad(
  daily: OHLCV[],
  bars5m: OHLCV[] | null
): Omit<TradeSignal, "id" | "symbol" | "name" | "triggeredAt"> | null {
  if (daily.length < 55) return null;
  const price = daily[daily.length - 1].close;
  const e9 = lastEma(daily, 9)!;
  const e21 = lastEma(daily, 21)!;
  const e50 = lastEma(daily, 50)!;
  if (!isEmaStackBullish(e9, e21, e50)) return null;

  const nearEma =
    (price >= e9 * 0.97 && price <= e9 * 1.03) ||
    (price >= e21 * 0.97 && price <= e21 * 1.025);
  if (!nearEma) return null;

  // 5m V-Reclaim: recent low then reclaim above prior swing / EMA9
  let vReclaim = true;
  if (bars5m && bars5m.length >= 30) {
    const slice = bars5m.slice(-24);
    const lows = slice.map((b) => b.low);
    const minIdx = lows.indexOf(Math.min(...lows));
    const trough = slice[minIdx];
    const last = slice[slice.length - 1];
    const e9_5 = lastEma(bars5m, 9) ?? last.close;
    vReclaim =
      minIdx < slice.length - 3 &&
      last.close > trough.low * 1.005 &&
      last.close >= e9_5 * 0.998;
  }
  if (!vReclaim) return null;

  const entry = round(price, 4);
  const stop = hardStop(entry, Math.min(e9, e21) * 0.99);
  return {
    pattern: "launchpad",
    label: "🚀 Launchpad Pullback",
    entry,
    stop,
    oneRRiskPct: oneRPct(entry, stop),
    adr20Pct: round(adr20Pct(daily), 2),
    price: entry,
    priority: 80,
  };
}

/** 🔥 Undercut & Reclaim */
function detectUR(
  daily: OHLCV[]
): Omit<TradeSignal, "id" | "symbol" | "name" | "triggeredAt"> | null {
  if (daily.length < 20) return null;
  const slice = daily.slice(-15);
  const prior = slice.slice(0, -2);
  const swingLow = Math.min(...prior.map((b) => b.low));
  const mid = slice[Math.floor(slice.length / 2)];
  const last = slice[slice.length - 1];
  const undercut = mid.low <= swingLow * 1.005;
  const reclaim = last.close > mid.high && last.close > swingLow;
  if (!undercut || !reclaim) return null;

  const entry = round(last.close, 4);
  const stop = hardStop(entry, mid.low);
  return {
    pattern: "ur_reversal",
    label: "🔥 Undercut & Reclaim",
    entry,
    stop,
    oneRRiskPct: oneRPct(entry, stop),
    adr20Pct: round(adr20Pct(daily), 2),
    price: entry,
    priority: 85,
  };
}

/** ⚡ Episodic Pivot：缺口 + 相對均量巨量突破 */
function detectEP(
  daily: OHLCV[]
): Omit<TradeSignal, "id" | "symbol" | "name" | "triggeredAt"> | null {
  if (daily.length < 30) return null;
  const last = daily[daily.length - 1];
  const prev = daily[daily.length - 2];
  const gapPct = ((last.open - prev.close) / prev.close) * 100;
  if (gapPct < 2.5) return null;

  const vols = daily.slice(-21, -1).map((b) => b.volume);
  const avgVol = vols.reduce((a, b) => a + b, 0) / Math.max(vols.length, 1);
  if (!avgVol || last.volume < avgVol * 1.8) return null;
  if (last.close < last.open && last.close < prev.close) return null;

  const entry = round(last.close, 4);
  const stop = hardStop(entry, Math.min(last.low, prev.close));
  return {
    pattern: "episodic_pivot",
    label: "⚡ Episodic Pivot",
    entry,
    stop,
    oneRRiskPct: oneRPct(entry, stop),
    adr20Pct: round(adr20Pct(daily), 2),
    price: entry,
    priority: 90,
  };
}

/** 🎯 AVWAP 支撐共振反彈 */
function detectAvwapBounce(
  daily: OHLCV[]
): Omit<TradeSignal, "id" | "symbol" | "name" | "triggeredAt"> | null {
  if (daily.length < 60) return null;
  const anchor = Math.max(0, daily.length - 60);
  const avwap = anchoredVwap(daily, anchor);
  if (!avwap.length) return null;
  const vw = avwap[avwap.length - 1].value;
  const last = daily[daily.length - 1];
  const prev = daily[daily.length - 2];
  const touch =
    last.low <= vw * 1.01 && last.close >= vw * 0.995 && last.close >= prev.close;
  if (!touch) return null;

  const e9 = lastEma(daily, 9)!;
  const e21 = lastEma(daily, 21)!;
  if (!(e9 > e21)) return null;

  const entry = round(last.close, 4);
  const stop = hardStop(entry, Math.min(last.low, vw * 0.985));
  return {
    pattern: "avwap_bounce",
    label: "🎯 AVWAP 支撐共振",
    entry,
    stop,
    oneRRiskPct: oneRPct(entry, stop),
    adr20Pct: round(adr20Pct(daily), 2),
    price: entry,
    priority: 75,
  };
}

/** ⚠️ 9 EMA 偏離 >15% 禁追 */
function detectNoChase(
  daily: OHLCV[]
): Omit<TradeSignal, "id" | "symbol" | "name" | "triggeredAt"> | null {
  if (daily.length < 20) return null;
  const price = daily[daily.length - 1].close;
  const e9 = lastEma(daily, 9)!;
  const dev = ema9DeviationPct(price, e9);
  if (dev <= NO_CHASE_DEV_PCT) return null;

  return {
    pattern: "no_chase",
    label: "⚠️ 9EMA 偏離>15% 禁追",
    entry: round(price, 4),
    stop: round(e9, 4),
    oneRRiskPct: round(dev, 2),
    adr20Pct: round(adr20Pct(daily), 2),
    price: round(price, 4),
    priority: 40,
  };
}

export function detectSignalsForSymbol(
  symbol: string,
  name: string,
  daily: OHLCV[],
  bars5m: OHLCV[] | null
): TradeSignal[] {
  const now = new Date().toISOString();
  const detectors = [
    detectEP(daily),
    detectUR(daily),
    detectLaunchpad(daily, bars5m),
    detectAvwapBounce(daily),
    detectNoChase(daily),
  ];

  return detectors
    .filter(Boolean)
    .map((d, i) => ({
      ...d!,
      id: `${symbol}-${d!.pattern}-${i}`,
      symbol,
      name,
      triggeredAt: now,
    }));
}

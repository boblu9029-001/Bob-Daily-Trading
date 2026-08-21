import {
  adr20Pct,
  changePct,
  clamp,
  ema9DeviationPct,
  highestHigh,
  isEmaStackBullish,
  lastEma,
  round,
} from "./indicators";
import type {
  MarketMode,
  MomentumTarget,
  OHLCV,
  PatternTag,
  Position,
  PositionAlert,
  PositionLive,
  RegimeAsset,
  RegimeBoard,
} from "./types";
import { NO_CHASE_DEV_PCT, RPT_PCT, SCALE_OUT_R } from "./types";
import { getSessionStatus } from "./market-hours";

function assetScoreFromStack(
  bullish: boolean,
  deviation: number,
  change24h: number
): number {
  let score = 0;
  score += bullish ? 55 : -45;
  // mild pullback to 9EMA is constructive; extreme extension is caution
  if (deviation >= -3 && deviation <= 8) score += 20;
  else if (deviation > 15) score -= 25;
  else if (deviation < -8) score -= 15;
  else score += 5;
  score += clamp(change24h * 2.5, -25, 25);
  return clamp(round(score), -100, 100);
}

export function classifyMode(score: number): MarketMode {
  if (score >= 55) return "做多強勢";
  if (score >= 15) return "發射台拉回";
  if (score >= -35) return "震盪防守";
  return "極端恐慌";
}

export function buildRegimeAsset(
  symbol: string,
  name: string,
  assetClass: "equity" | "crypto",
  bars: OHLCV[]
): RegimeAsset | null {
  if (bars.length < 55) return null;
  const price = bars[bars.length - 1].close;
  const e9 = lastEma(bars, 9)!;
  const e21 = lastEma(bars, 21)!;
  const e50 = lastEma(bars, 50)!;
  const bullish = isEmaStackBullish(e9, e21, e50);
  const deviation = ema9DeviationPct(price, e9);
  const prev = bars[Math.max(0, bars.length - 2)].close;
  const chg = changePct(price, prev);
  return {
    symbol,
    name,
    assetClass,
    price: round(price, assetClass === "crypto" ? 2 : 2),
    ema9: round(e9, 4),
    ema21: round(e21, 4),
    ema50: round(e50, 4),
    emaStackBullish: bullish,
    ema9DeviationPct: round(deviation, 2),
    change24hPct: round(chg, 2),
    score: assetScoreFromStack(bullish, deviation, chg),
  };
}

export function buildRegimeBoard(
  equities: RegimeAsset[],
  cryptos: RegimeAsset[]
): RegimeBoard {
  const all = [...equities, ...cryptos];
  const score = all.length
    ? round(all.reduce((a, b) => a + b.score, 0) / all.length)
    : 0;
  const session = getSessionStatus();
  return {
    score: clamp(score, -100, 100),
    mode: classifyMode(score),
    equities,
    cryptos,
    sessionLabel: session.label,
    isLive: session.isLive,
    updatedAt: new Date().toISOString(),
  };
}

function patternTags(opts: {
  emaStack: boolean;
  deviation: number;
  near52w: number;
  price: number;
  ema9: number;
  bars: OHLCV[];
}): { tags: PatternTag[]; tagLabels: string[] } {
  const tags: PatternTag[] = [];
  const tagLabels: string[] = [];

  if (opts.deviation > NO_CHASE_DEV_PCT) {
    tags.push("no_chase");
    tagLabels.push("⚠️ 偏離9EMA>15% (禁追)");
  }

  // Launchpad: bullish stack, price near/above 9EMA within small pullback
  if (
    opts.emaStack &&
    opts.deviation >= -4 &&
    opts.deviation <= 3 &&
    opts.price >= opts.ema9 * 0.97
  ) {
    tags.push("launchpad");
    tagLabels.push("🚀 Launchpad 發射台回踩");
  }

  if (opts.near52w >= 97) {
    tags.push("breakout_52w");
    tagLabels.push("🔥 52W新高主升突破");
  }

  // U&R: recent undercut of swing low then reclaim
  const slice = opts.bars.slice(-15);
  if (slice.length >= 10) {
    const lows = slice.map((b) => b.low);
    const minLow = Math.min(...lows.slice(0, -2));
    const last = slice[slice.length - 1];
    const mid = slice[Math.floor(slice.length / 2)];
    if (mid.low <= minLow * 1.01 && last.close > mid.high && opts.emaStack) {
      tags.push("ur_reversal");
      tagLabels.push("⚡ U&R 廢破反轉蓄勢");
    }
  }

  return { tags, tagLabels };
}

/**
 * Momentum score weights:
 * 30% RS + 25% ADR20 + 20% 52W proximity + 15% EMA stack + 10% EMA9 deviation protection
 */
export function scoreMomentumTarget(
  symbol: string,
  name: string,
  bars: OHLCV[],
  benchmarkBars: OHLCV[]
): MomentumTarget | null {
  if (bars.length < 55) return null;
  const price = bars[bars.length - 1].close;
  const e9 = lastEma(bars, 9)!;
  const e21 = lastEma(bars, 21)!;
  const e50 = lastEma(bars, 50)!;
  const emaStack = isEmaStackBullish(e9, e21, e50);
  const deviation = ema9DeviationPct(price, e9);
  const adr = adr20Pct(bars);
  const high52 = highestHigh(bars, 252);
  const near52w = high52 ? (price / high52) * 100 : 0;

  // Relative strength vs QQQ over ~20 bars
  const look = 21;
  const a0 = bars[Math.max(0, bars.length - look)].close;
  const b0 =
    benchmarkBars[Math.max(0, benchmarkBars.length - look)]?.close ?? a0;
  const stockRet = changePct(price, a0);
  const benchRet = changePct(
    benchmarkBars[benchmarkBars.length - 1]?.close ?? price,
    b0
  );
  const rsExcess = stockRet - benchRet;
  const rsScore = clamp((rsExcess + 15) / 30, 0, 1); // map ~-15..+15 → 0..1

  const adrScore = clamp(adr / 8, 0, 1); // 8% ADR = full
  const near52Score = clamp((near52w - 70) / 30, 0, 1);
  const emaScore = emaStack ? 1 : e9 > e21 ? 0.45 : 0.1;
  // deviation protection: best near 0–8%, penalize >15%
  let devScore = 1;
  if (deviation > NO_CHASE_DEV_PCT) devScore = 0.05;
  else if (deviation > 10) devScore = 0.35;
  else if (deviation < -8) devScore = 0.25;
  else if (deviation >= -2 && deviation <= 8) devScore = 1;
  else devScore = 0.65;

  const score =
    100 *
    (0.3 * rsScore +
      0.25 * adrScore +
      0.2 * near52Score +
      0.15 * emaScore +
      0.1 * devScore);

  const { tags, tagLabels } = patternTags({
    emaStack,
    deviation,
    near52w,
    price,
    ema9: e9,
    bars,
  });

  return {
    symbol,
    name,
    price: round(price, 2),
    score: round(score, 1),
    rsScore: round(rsExcess, 2),
    adr20Pct: round(adr, 2),
    near52wPct: round(near52w, 1),
    emaStackScore: round(emaScore * 100),
    ema9DeviationPct: round(deviation, 2),
    tags,
    tagLabels,
  };
}

export function enrichPosition(
  pos: Position,
  lastPrice: number,
  ema9: number
): PositionLive {
  const riskAmt = Math.abs(pos.entryPrice - pos.stopLoss) * pos.qty;
  const risk = Math.abs(pos.entryPrice - pos.stopLoss);
  const rMult = risk < 1e-9 ? 0 : (lastPrice - pos.entryPrice) / risk;
  const deviation = ema9DeviationPct(lastPrice, ema9);
  const alerts: PositionAlert[] = [];

  if (rMult >= SCALE_OUT_R) {
    alerts.push({
      type: "scale_50",
      label: `金色減倉 50% 警報 (+${round(rMult, 1)}R)`,
    });
  }
  if (lastPrice < ema9) {
    alerts.push({
      type: "clear_swing",
      label: "波段清倉警報：跌破日線 9 EMA",
    });
  }
  if (deviation > NO_CHASE_DEV_PCT) {
    alerts.push({
      type: "no_chase",
      label: "紅色禁追：偏離 9 EMA >15%",
    });
  }

  return {
    ...pos,
    lastPrice: round(lastPrice, 4),
    rMultiple: round(rMult, 2),
    riskAmount: round(riskAmt, 2),
    riskPct: round(RPT_PCT * 100, 2),
    ema9: round(ema9, 4),
    ema9DeviationPct: round(deviation, 2),
    alerts,
  };
}

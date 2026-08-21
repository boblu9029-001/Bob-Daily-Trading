/* Martin Luk Master System 4.0 Pro — Bob Daily Trading */

export type AssetClass = "equity" | "crypto";
export type Timeframe = "5m" | "1D";

export interface OHLCV {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorSnapshot {
  ema9: number;
  ema21: number;
  ema50: number;
  avwap?: number;
  emaStackBullish: boolean;
  ema9DeviationPct: number;
  adr20Pct: number;
  change24hPct?: number;
}

export type MarketMode =
  | "做多強勢"
  | "發射台拉回"
  | "震盪防守"
  | "極端恐慌";

export interface RegimeAsset {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  price: number;
  ema9: number;
  ema21: number;
  ema50: number;
  emaStackBullish: boolean;
  ema9DeviationPct: number;
  change24hPct: number;
  score: number; // -100 ~ +100 contribution
}

export interface RegimeBoard {
  score: number;
  mode: MarketMode;
  equities: RegimeAsset[];
  cryptos: RegimeAsset[];
  sessionLabel: string;
  isLive: boolean;
  updatedAt: string;
}

export interface Position {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  side: "long";
  entryPrice: number;
  stopLoss: number;
  qty: number;
  accountEquity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  status: "open" | "closed";
}

export interface PositionLive extends Position {
  lastPrice: number;
  rMultiple: number;
  riskAmount: number;
  riskPct: number;
  ema9: number;
  ema9DeviationPct: number;
  alerts: PositionAlert[];
}

export type PositionAlert =
  | { type: "scale_50"; label: string }
  | { type: "clear_swing"; label: string }
  | { type: "no_chase"; label: string };

export type PatternTag =
  | "launchpad"
  | "breakout_52w"
  | "ur_reversal"
  | "no_chase";

export interface MomentumTarget {
  symbol: string;
  name: string;
  price: number;
  score: number;
  rsScore: number;
  adr20Pct: number;
  near52wPct: number;
  emaStackScore: number;
  ema9DeviationPct: number;
  tags: PatternTag[];
  tagLabels: string[];
}

export interface ScanResult {
  scannedAt: string;
  targets: MomentumTarget[];
  nextAutoScanHint: string;
}

export interface ChartMeta {
  symbol: string;
  assetClass: AssetClass;
  timeframe: Timeframe;
  price: number;
  adr20Pct: number;
  ema9DeviationPct: number;
  bars: OHLCV[];
  ema9: { time: number; value: number }[];
  ema21: { time: number; value: number }[];
  ema50: { time: number; value: number }[];
  avwap: { time: number; value: number }[];
}

export const RPT_PCT = 0.003; // 0.3%
export const NO_CHASE_DEV_PCT = 15;
export const SCALE_OUT_R = 3;

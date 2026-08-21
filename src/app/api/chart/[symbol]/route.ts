import { NextResponse } from "next/server";
import { getBars } from "@/lib/market-data";
import {
  adr20Pct,
  anchoredVwap,
  ema9DeviationPct,
  emaSeries,
  lastEma,
  round,
} from "@/lib/indicators";
import { detectAssetClass, normalizeSymbol } from "@/lib/symbols";
import type { Timeframe } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = normalizeSymbol(params.symbol);
    const { searchParams } = new URL(req.url);
    const tf = (searchParams.get("tf") === "5m" ? "5m" : "1D") as Timeframe;
    const bars = await getBars(symbol, tf);
    const price = bars[bars.length - 1].close;
    const e9 = lastEma(bars, 9) ?? price;
    // For ADR use daily bars
    const daily = tf === "1D" ? bars : await getBars(symbol, "1D");

    // Anchor VWAP at ~60 bars ago or start
    const anchor = Math.max(0, bars.length - 60);

    return NextResponse.json({
      symbol,
      assetClass: detectAssetClass(symbol),
      timeframe: tf,
      price: round(price, 4),
      adr20Pct: round(adr20Pct(daily), 2),
      ema9DeviationPct: round(ema9DeviationPct(price, e9), 2),
      bars,
      ema9: emaSeries(bars, 9),
      ema21: emaSeries(bars, 21),
      ema50: emaSeries(bars, 50),
      avwap: anchoredVwap(bars, anchor),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "chart error" },
      { status: 500 }
    );
  }
}

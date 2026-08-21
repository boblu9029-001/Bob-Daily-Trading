import { NextResponse } from "next/server";
import { getBars } from "@/lib/market-data";
import { detectSignalsForSymbol } from "@/lib/signals";
import { FOCUS_UNIVERSE } from "@/lib/symbols";
import type { TradeSignal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const all: TradeSignal[] = [];

    await Promise.all(
      FOCUS_UNIVERSE.map(async (s) => {
        try {
          const daily = await getBars(s.symbol, "1D");
          let bars5m = null;
          try {
            bars5m = await getBars(s.symbol, "5m");
          } catch {
            bars5m = null;
          }
          const found = detectSignalsForSymbol(
            s.symbol,
            s.name,
            daily,
            bars5m
          );
          all.push(...found);
        } catch {
          /* skip symbol */
        }
      })
    );

    // Prefer actionable setups over no-chase; then by priority
    all.sort((a, b) => {
      if (a.pattern === "no_chase" && b.pattern !== "no_chase") return 1;
      if (b.pattern === "no_chase" && a.pattern !== "no_chase") return -1;
      return b.priority - a.priority;
    });

    return NextResponse.json({
      scannedAt: new Date().toISOString(),
      count: all.length,
      signals: all,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "signals error" },
      { status: 500 }
    );
  }
}

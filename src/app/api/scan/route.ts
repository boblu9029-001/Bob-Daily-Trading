import { NextResponse } from "next/server";
import { getBars } from "@/lib/market-data";
import { scoreMomentumTarget } from "@/lib/scoring";
import { FOCUS_UNIVERSE } from "@/lib/symbols";
import { nextAutoScanHint } from "@/lib/market-hours";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const bench = await getBars("QQQ", "1D");
    const scored = (
      await Promise.all(
        FOCUS_UNIVERSE.map(async (s) => {
          try {
            const bars = await getBars(s.symbol, "1D");
            return scoreMomentumTarget(s.symbol, s.name, bars, bench);
          } catch {
            return null;
          }
        })
      )
    )
      .filter(Boolean)
      .sort((a, b) => (b!.score ?? 0) - (a!.score ?? 0))
      .slice(0, 12);

    return NextResponse.json({
      scannedAt: new Date().toISOString(),
      targets: scored,
      nextAutoScanHint: nextAutoScanHint(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "scan error" },
      { status: 500 }
    );
  }
}

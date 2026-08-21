import { NextResponse } from "next/server";
import { getBars, fetchCoinGeckoChange } from "@/lib/market-data";
import { buildRegimeAsset, buildRegimeBoard } from "@/lib/scoring";
import { CRYPTO_REGIME, EQUITY_REGIME } from "@/lib/symbols";
import { round } from "@/lib/indicators";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const equityAssets = (
      await Promise.all(
        EQUITY_REGIME.map(async (e) => {
          const bars = await getBars(e.symbol, "1D");
          return buildRegimeAsset(e.symbol, e.name, "equity", bars);
        })
      )
    ).filter(Boolean);

    const cryptoAssets = (
      await Promise.all(
        CRYPTO_REGIME.map(async (c) => {
          const bars = await getBars(c.symbol, "1D");
          const asset = buildRegimeAsset(c.symbol, c.name, "crypto", bars);
          if (!asset) return null;
          const cg = await fetchCoinGeckoChange(c.coingeckoId);
          if (cg != null) asset.change24hPct = round(cg, 2);
          return asset;
        })
      )
    ).filter(Boolean);

    const board = buildRegimeBoard(
      equityAssets as NonNullable<(typeof equityAssets)[number]>[],
      cryptoAssets as NonNullable<(typeof cryptoAssets)[number]>[]
    );

    return NextResponse.json(board);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "regime error" },
      { status: 500 }
    );
  }
}

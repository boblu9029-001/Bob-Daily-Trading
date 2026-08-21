import { NextResponse } from "next/server";
import { z } from "zod";
import {
  closePosition,
  createPosition,
  listPositions,
  storageMode,
  updatePosition,
} from "@/lib/store";
import { getBars } from "@/lib/market-data";
import { lastEma } from "@/lib/indicators";
import { enrichPosition } from "@/lib/scoring";
import { detectAssetClass, normalizeSymbol } from "@/lib/symbols";
import { RPT_PCT } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const createSchema = z.object({
  symbol: z.string().min(1),
  entryPrice: z.number().positive(),
  stopLoss: z.number().positive(),
  qty: z.number().positive().optional(),
  accountEquity: z.number().positive().default(100000),
  notes: z.string().optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  stopLoss: z.number().positive().optional(),
  qty: z.number().positive().optional(),
  notes: z.string().optional(),
  entryPrice: z.number().positive().optional(),
  action: z.enum(["update", "close"]).default("update"),
});

export async function GET() {
  try {
    const positions = await listPositions("open");
    const live = await Promise.all(
      positions.map(async (p) => {
        try {
          const bars = await getBars(p.symbol, "1D");
          const last = bars[bars.length - 1].close;
          const e9 = lastEma(bars, 9) ?? last;
          return enrichPosition(p, last, e9);
        } catch {
          return enrichPosition(p, p.entryPrice, p.entryPrice);
        }
      })
    );
    return NextResponse.json({
      storage: storageMode(),
      rptPct: RPT_PCT * 100,
      positions: live,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "positions error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = createSchema.parse(await req.json());
    const symbol = normalizeSymbol(body.symbol);
    const riskPerShare = Math.abs(body.entryPrice - body.stopLoss);
    if (riskPerShare <= 0) {
      return NextResponse.json({ error: "止損必須異於進場價" }, { status: 400 });
    }
    // Lock RPT 0.3% of equity if qty omitted
    const riskBudget = body.accountEquity * RPT_PCT;
    const qty = body.qty ?? Math.max(1, Math.floor(riskBudget / riskPerShare));

    const pos = await createPosition({
      symbol,
      assetClass: detectAssetClass(symbol),
      side: "long",
      entryPrice: body.entryPrice,
      stopLoss: body.stopLoss,
      qty,
      accountEquity: body.accountEquity,
      notes: body.notes,
    });

    return NextResponse.json(pos, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "create failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = patchSchema.parse(await req.json());
    if (body.action === "close") {
      const closed = await closePosition(body.id);
      return NextResponse.json(closed);
    }
    const updated = await updatePosition(body.id, {
      stopLoss: body.stopLoss,
      qty: body.qty,
      notes: body.notes,
      entryPrice: body.entryPrice,
    });
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }
    const closed = await closePosition(id);
    return NextResponse.json(closed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "close failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

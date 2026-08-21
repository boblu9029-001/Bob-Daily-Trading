import { NextResponse } from "next/server";
import { storageMode } from "@/lib/store";
import { getSessionStatus } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSessionStatus();
  return NextResponse.json({
    app: "Bob - Daily Trading",
    system: "Martin Luk Master System 4.0 Pro",
    storage: storageMode(),
    session,
    time: new Date().toISOString(),
  });
}

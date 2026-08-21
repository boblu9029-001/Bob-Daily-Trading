import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getSessionStatus } from "@/lib/market-hours";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSessionStatus();
  return NextResponse.json({
    app: "Bob - Daily Trading",
    system: "Martin Luk Master System 4.0 Pro",
    storage: isSupabaseConfigured() ? "supabase" : "unconfigured",
    session,
    time: new Date().toISOString(),
  });
}

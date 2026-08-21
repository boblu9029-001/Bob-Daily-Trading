import { getSupabase } from "./supabase";
import type { Position } from "./types";

export async function listPositions(
  status: "open" | "closed" | "all" = "open"
): Promise<Position[]> {
  const sb = getSupabase();
  let q = sb.from("positions").select("*").order("created_at", {
    ascending: false,
  });
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function createPosition(
  input: Omit<Position, "id" | "createdAt" | "updatedAt" | "status" | "closedAt">
): Promise<Position> {
  const now = new Date().toISOString();
  const position: Position = {
    ...input,
    id: crypto.randomUUID(),
    status: "open",
    closedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const sb = getSupabase();
  const { data, error } = await sb
    .from("positions")
    .insert(toRow(position))
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function updatePosition(
  id: string,
  patch: Partial<Pick<Position, "stopLoss" | "qty" | "notes" | "entryPrice">>
): Promise<Position> {
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.stopLoss != null) row.stop_loss = patch.stopLoss;
  if (patch.qty != null) row.qty = patch.qty;
  if (patch.notes != null) row.notes = patch.notes;
  if (patch.entryPrice != null) row.entry_price = patch.entryPrice;

  const sb = getSupabase();
  const { data, error } = await sb
    .from("positions")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

export async function closePosition(id: string): Promise<Position> {
  const now = new Date().toISOString();
  const sb = getSupabase();
  const { data, error } = await sb
    .from("positions")
    .update({ status: "closed", closed_at: now, updated_at: now })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data);
}

function toRow(p: Position) {
  return {
    id: p.id,
    symbol: p.symbol,
    asset_class: p.assetClass,
    side: p.side,
    entry_price: p.entryPrice,
    stop_loss: p.stopLoss,
    qty: p.qty,
    account_equity: p.accountEquity ?? 0,
    notes: p.notes ?? null,
    status: p.status,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
    closed_at: p.closedAt ?? null,
  };
}

function mapRow(row: Record<string, unknown>): Position {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    assetClass: (row.asset_class as Position["assetClass"]) || "equity",
    side: "long",
    entryPrice: Number(row.entry_price),
    stopLoss: Number(row.stop_loss),
    qty: Number(row.qty),
    accountEquity: Number(row.account_equity ?? 0),
    notes: (row.notes as string) || undefined,
    status: row.status as Position["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
  };
}

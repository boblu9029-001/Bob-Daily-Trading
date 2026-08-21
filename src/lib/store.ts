import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as fs } from "fs";
import path from "path";
import type { Position } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const POSITIONS_FILE = path.join(DATA_DIR, "positions.json");

function hasSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function supabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function ensureFileStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(POSITIONS_FILE);
  } catch {
    await fs.writeFile(POSITIONS_FILE, "[]", "utf8");
  }
}

async function readFilePositions(): Promise<Position[]> {
  await ensureFileStore();
  const raw = await fs.readFile(POSITIONS_FILE, "utf8");
  return JSON.parse(raw) as Position[];
}

async function writeFilePositions(positions: Position[]) {
  await ensureFileStore();
  await fs.writeFile(POSITIONS_FILE, JSON.stringify(positions, null, 2), "utf8");
}

export async function listPositions(
  status: "open" | "closed" | "all" = "open"
): Promise<Position[]> {
  if (hasSupabase()) {
    const sb = supabaseAdmin();
    let q = sb.from("positions").select("*").order("created_at", {
      ascending: false,
    });
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  }
  const all = await readFilePositions();
  if (status === "all") return all;
  return all.filter((p) => p.status === status);
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

  if (hasSupabase()) {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("positions")
      .insert(toRow(position))
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const all = await readFilePositions();
  all.unshift(position);
  await writeFilePositions(all);
  return position;
}

export async function updatePosition(
  id: string,
  patch: Partial<Pick<Position, "stopLoss" | "qty" | "notes" | "entryPrice">>
): Promise<Position> {
  if (hasSupabase()) {
    const sb = supabaseAdmin();
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.stopLoss != null) row.stop_loss = patch.stopLoss;
    if (patch.qty != null) row.qty = patch.qty;
    if (patch.notes != null) row.notes = patch.notes;
    if (patch.entryPrice != null) row.entry_price = patch.entryPrice;
    const { data, error } = await sb
      .from("positions")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const all = await readFilePositions();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("持倉不存在");
  all[idx] = {
    ...all[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await writeFilePositions(all);
  return all[idx];
}

export async function closePosition(id: string): Promise<Position> {
  const now = new Date().toISOString();
  if (hasSupabase()) {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("positions")
      .update({ status: "closed", closed_at: now, updated_at: now })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  }

  const all = await readFilePositions();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("持倉不存在");
  all[idx] = {
    ...all[idx],
    status: "closed",
    closedAt: now,
    updatedAt: now,
  };
  await writeFilePositions(all);
  return all[idx];
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
    account_equity: p.accountEquity,
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
    assetClass: row.asset_class as Position["assetClass"],
    side: "long",
    entryPrice: Number(row.entry_price),
    stopLoss: Number(row.stop_loss),
    qty: Number(row.qty),
    accountEquity: Number(row.account_equity),
    notes: (row.notes as string) || undefined,
    status: row.status as Position["status"],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
  };
}

export function storageMode(): "supabase" | "local" {
  return hasSupabase() ? "supabase" : "local";
}

"use client";

import { useState } from "react";
import type { PositionLive } from "@/lib/types";

interface Props {
  positions: PositionLive[];
  storage: string;
  loading?: boolean;
  onRefresh: () => void;
  onCreate: (payload: {
    symbol: string;
    entryPrice: number;
    stopLoss: number;
    accountEquity: number;
    notes?: string;
  }) => Promise<void>;
  onUpdateStop: (id: string, stopLoss: number) => Promise<void>;
  onClose: (id: string) => Promise<void>;
  onSelectSymbol: (symbol: string) => void;
}

export function ActivePositions({
  positions,
  storage,
  loading,
  onRefresh,
  onCreate,
  onUpdateStop,
  onClose,
  onSelectSymbol,
}: Props) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [equity, setEquity] = useState("100000");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStop, setEditStop] = useState("");

  async function submit() {
    setBusy(true);
    try {
      await onCreate({
        symbol,
        entryPrice: Number(entry),
        stopLoss: Number(stop),
        accountEquity: Number(equity),
        notes: notes || undefined,
      });
      setOpen(false);
      setSymbol("");
      setEntry("");
      setStop("");
      setNotes("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="positions" className="card scroll-mt-20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="section-title">雲端持倉 · R-Multiple 階梯</h2>
          <p className="section-sub">
            RPT 鎖定 0.3% · 儲存：{storage === "supabase" ? "Supabase" : "本地雲端檔"}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={onRefresh}>
            同步
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setOpen((v) => !v)}
          >
            ➕ 新增持倉
          </button>
        </div>
      </div>

      {open && (
        <div className="mb-4 p-3 rounded-lg border border-terminal-border bg-terminal-bg grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <input
            className="input uppercase"
            placeholder="代碼"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
          <input
            className="input"
            placeholder="進場價"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            inputMode="decimal"
          />
          <input
            className="input"
            placeholder="止損"
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            inputMode="decimal"
          />
          <input
            className="input"
            placeholder="帳戶淨值"
            value={equity}
            onChange={(e) => setEquity(e.target.value)}
            inputMode="decimal"
          />
          <button
            type="button"
            className="btn-primary"
            disabled={busy || !symbol || !entry || !stop}
            onClick={submit}
          >
            確認建立
          </button>
          <input
            className="input sm:col-span-2 lg:col-span-5"
            placeholder="備註（可選）"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      )}

      {loading && !positions.length ? (
        <p className="text-sm text-terminal-muted font-mono">載入持倉…</p>
      ) : !positions.length ? (
        <p className="text-sm text-terminal-muted">尚無開倉部位，點擊新增開始追蹤。</p>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => (
            <article
              key={p.id}
              className="rounded-lg border border-terminal-border bg-terminal-bg/60 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => onSelectSymbol(p.symbol)}
                >
                  <span className="font-mono font-semibold text-terminal-cyan text-lg">
                    {p.symbol}
                  </span>
                  <span className="ml-2 text-xs text-terminal-muted">
                    {p.qty} 股 · 進場 {p.entryPrice} · 現價 {p.lastPrice}
                  </span>
                </button>
                <span
                  className={`font-mono text-lg font-bold ${
                    p.rMultiple >= 0
                      ? p.rMultiple >= 3
                        ? "text-terminal-gold"
                        : "text-terminal-green"
                      : "text-terminal-red"
                  }`}
                >
                  {p.rMultiple >= 0 ? "+" : ""}
                  {p.rMultiple.toFixed(1)}R
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-3 text-xs font-mono text-terminal-muted">
                <span>風險 ${p.riskAmount.toFixed(0)}（RPT {p.riskPct}%）</span>
                <span
                  className={
                    Math.abs(p.ema9DeviationPct) > 15
                      ? "text-terminal-red"
                      : ""
                  }
                >
                  距 9EMA {p.ema9DeviationPct > 0 ? "+" : ""}
                  {p.ema9DeviationPct.toFixed(2)}%
                </span>
                <span>止損 {p.stopLoss}</span>
              </div>

              {p.alerts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.alerts.map((a, i) => (
                    <span
                      key={i}
                      className={
                        a.type === "scale_50"
                          ? "badge-gold"
                          : a.type === "no_chase"
                            ? "badge-red"
                            : "badge-red"
                      }
                    >
                      {a.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {editId === p.id ? (
                  <>
                    <input
                      className="input w-28"
                      value={editStop}
                      onChange={(e) => setEditStop(e.target.value)}
                      placeholder="新止損"
                    />
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={async () => {
                        await onUpdateStop(p.id, Number(editStop));
                        setEditId(null);
                      }}
                    >
                      儲存
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setEditId(null)}
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setEditId(p.id);
                      setEditStop(String(p.stopLoss));
                    }}
                  >
                    ✏️ 修改止損
                  </button>
                )}
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => onClose(p.id)}
                >
                  🗑️ 一鍵平倉
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

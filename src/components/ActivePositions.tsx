"use client";

import { useEffect, useState } from "react";
import type { PositionLive } from "@/lib/types";

interface CreatePayload {
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  accountEquity: number;
  notes?: string;
}

interface Props {
  positions: PositionLive[];
  storage: string;
  loading?: boolean;
  onRefresh: () => void;
  onCreate: (payload: CreatePayload) => Promise<void>;
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
  const [modalOpen, setModalOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [equity, setEquity] = useState("100000");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStop, setEditStop] = useState("");

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const entryPrice = Number(entry);
      const stopLoss = Number(stop);
      if (!symbol || !(entryPrice > 0) || !(stopLoss > 0)) {
        setError("請填寫有效代碼、進場價與止損");
        return;
      }
      if (stopLoss >= entryPrice) {
        setError("做多止損必須低於進場價");
        return;
      }
      await onCreate({
        symbol,
        entryPrice,
        stopLoss,
        accountEquity: Number(equity) || 100000,
        notes: notes || undefined,
      });
      setModalOpen(false);
      setSymbol("");
      setEntry("");
      setStop("");
      setNotes("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "新增失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="positions" className="card scroll-mt-20 h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="section-title">雲端持倉 · 1R / 3R / 5R 階梯</h2>
          <p className="section-sub">
            RPT 0.3% · {storage === "supabase" ? "Supabase 即時同步" : "本地雲端檔持久化"}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" className="btn-ghost" onClick={onRefresh}>
            同步
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
          >
            ➕ 新增持倉
          </button>
        </div>
      </div>

      {loading && !positions.length ? (
        <p className="text-sm text-terminal-muted font-mono">載入持倉…</p>
      ) : !positions.length ? (
        <p className="text-sm text-terminal-muted">
          尚無開倉部位，點擊新增開始追蹤。
        </p>
      ) : (
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          {positions.map((p) => {
            const hit3R = p.rMultiple >= 3;
            return (
              <article
                key={p.id}
                className={`rounded-lg border p-3 transition-colors ${
                  hit3R
                    ? "border-terminal-gold/50 bg-terminal-gold/5"
                    : "border-terminal-border bg-terminal-bg/60"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => onSelectSymbol(p.symbol)}
                  >
                    <span className="font-mono font-semibold text-terminal-cyan text-lg">
                      {p.symbol}
                    </span>
                    <div className="text-[11px] text-terminal-muted font-mono mt-0.5">
                      {p.qty} 股 · 進場 ${p.entryPrice} · 現價 ${p.lastPrice}
                    </div>
                  </button>
                  <div className="text-right">
                    <div
                      className={`font-mono text-2xl font-bold leading-none ${
                        p.rMultiple >= 3
                          ? "text-terminal-gold"
                          : p.rMultiple >= 0
                            ? "text-terminal-green"
                            : "text-terminal-red"
                      }`}
                    >
                      {p.rMultiple >= 0 ? "+" : ""}
                      {p.rMultiple.toFixed(1)}R
                    </div>
                    <div className="text-[10px] text-terminal-muted mt-1">
                      當前浮盈 R-Multiple
                    </div>
                  </div>
                </div>

                {/* 1R / 3R / 5R ladder */}
                <div className="mt-3 grid grid-cols-1 gap-1.5 text-[11px] font-mono">
                  <div className="rounded border border-terminal-border/80 bg-terminal-card/40 px-2 py-1.5 text-terminal-muted">
                    <span className="text-terminal-red">1R 風險:</span>{" "}
                    <span className="text-terminal-text">
                      -{p.oneRRiskPct.toFixed(2)}% (-${p.oneRPerShare.toFixed(2)}
                      /股)
                    </span>
                  </div>
                  <div className="rounded border border-terminal-gold/30 bg-terminal-gold/5 px-2 py-1.5">
                    <span className="text-terminal-gold">+3R 目標:</span>{" "}
                    <span className="text-terminal-text">
                      ${p.target3R.toFixed(2)} (+{p.target3RPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="rounded border border-terminal-cyan/30 bg-terminal-cyan/5 px-2 py-1.5">
                    <span className="text-terminal-cyan">+5R 目標:</span>{" "}
                    <span className="text-terminal-text">
                      ${p.target5R.toFixed(2)} (+{p.target5RPct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-terminal-muted px-1">
                    風險金額 ${p.riskAmount.toFixed(0)} · RPT {p.riskPct}% · 距
                    9EMA{" "}
                    <span
                      className={
                        Math.abs(p.ema9DeviationPct) > 15
                          ? "text-terminal-red"
                          : "text-terminal-cyan"
                      }
                    >
                      {p.ema9DeviationPct > 0 ? "+" : ""}
                      {p.ema9DeviationPct.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {p.alerts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {p.alerts.map((a, i) => (
                      <span
                        key={i}
                        className={
                          a.type === "scale_50" ? "badge-gold" : "badge-red"
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
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 p-4"
          onClick={() => !busy && setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-terminal-border bg-terminal-card p-4 shadow-glow"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="新增持倉"
          >
            <h3 className="text-sm font-semibold text-terminal-text mb-1">
              ➕ 新增雲端持倉
            </h3>
            <p className="text-[10px] font-mono text-terminal-muted mb-3">
              保存後即時樂觀更新並同步雲端
            </p>
            <div className="grid gap-2">
              <input
                className="input uppercase"
                placeholder="代碼 (如 AAOI)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="進場價"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  inputMode="decimal"
                />
                <input
                  className="input"
                  placeholder="止損價"
                  value={stop}
                  onChange={(e) => setStop(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <input
                className="input"
                placeholder="帳戶淨值 (計算 RPT 股數)"
                value={equity}
                onChange={(e) => setEquity(e.target.value)}
                inputMode="decimal"
              />
              <input
                className="input"
                placeholder="備註（可選）"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {error && (
                <p className="text-xs text-terminal-red font-mono">{error}</p>
              )}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  className="btn-ghost flex-1"
                  disabled={busy}
                  onClick={() => setModalOpen(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  disabled={busy || !symbol || !entry || !stop}
                  onClick={submit}
                >
                  {busy ? "保存中…" : "保存 / 新增持倉"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

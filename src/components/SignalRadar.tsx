"use client";

import type { TradeSignal } from "@/lib/types";

interface Props {
  signals: TradeSignal[];
  scannedAt?: string;
  loading?: boolean;
  onRefresh: () => void;
  onSelect: (symbol: string) => void;
}

const patternTone: Record<TradeSignal["pattern"], string> = {
  launchpad: "border-l-terminal-cyan",
  ur_reversal: "border-l-terminal-green",
  episodic_pivot: "border-l-terminal-gold",
  avwap_bounce: "border-l-purple-400",
  no_chase: "border-l-terminal-red",
};

export function SignalRadar({
  signals,
  scannedAt,
  loading,
  onRefresh,
  onSelect,
}: Props) {
  return (
    <section id="radar" className="card scroll-mt-20 h-full">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="section-title">五大型態實時觸發雷達</h2>
          <p className="section-sub">
            Signal Radar · Launchpad / U&amp;R / EP / AVWAP / 禁追
          </p>
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "掃描中…" : "🔄 掃描"}
        </button>
      </div>

      {scannedAt && (
        <p className="text-[10px] font-mono text-terminal-muted mb-3">
          上次掃描 {new Date(scannedAt).toLocaleString("zh-TW")} · 點擊列載入圖表
        </p>
      )}

      {loading && !signals.length ? (
        <p className="text-sm text-terminal-muted font-mono">
          掃描主線池型態中…
        </p>
      ) : !signals.length ? (
        <p className="text-sm text-terminal-muted">
          目前無觸發信號，可稍後再掃描。
        </p>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {signals.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.symbol)}
              className={`w-full text-left rounded-lg border border-terminal-border border-l-4 ${patternTone[s.pattern]} bg-terminal-bg/70 p-3 hover:border-terminal-cyan/40 hover:shadow-glow transition-all`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-terminal-text">
                  {s.symbol}
                </span>
                <span
                  className={`text-[10px] font-mono ${
                    s.pattern === "no_chase"
                      ? "text-terminal-red"
                      : "text-terminal-cyan"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              <div className="text-[10px] text-terminal-muted mt-0.5">
                {s.name}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-terminal-muted">
                <span>
                  建議進場{" "}
                  <span className="text-terminal-text">${s.entry.toFixed(2)}</span>
                </span>
                <span>
                  硬止損{" "}
                  <span className="text-terminal-red">${s.stop.toFixed(2)}</span>
                </span>
                <span>
                  1R{" "}
                  <span className="text-terminal-text">
                    {s.pattern === "no_chase"
                      ? `偏離 ${s.oneRRiskPct}%`
                      : `-${s.oneRRiskPct}%`}
                  </span>
                </span>
                <span>
                  ADR20{" "}
                  <span className="text-terminal-cyan">{s.adr20Pct}%</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

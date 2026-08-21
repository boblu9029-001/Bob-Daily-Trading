"use client";

import type { ScanResult } from "@/lib/types";

interface Props {
  scan: ScanResult | null;
  loading?: boolean;
  onScan: () => void;
  onSelect: (symbol: string) => void;
}

export function MomentumTargets({ scan, loading, onScan, onSelect }: Props) {
  return (
    <section id="focus" className="card scroll-mt-20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="section-title">🎯 今日動量目標</h2>
          <p className="section-sub">
            Today&apos;s Focus List · RS / ADR / 52W / EMA
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onScan}
          disabled={loading}
        >
          {loading ? "掃描中…" : "🔄 立即掃描"}
        </button>
      </div>

      {scan && (
        <p className="text-[10px] font-mono text-terminal-muted mb-3">
          {scan.nextAutoScanHint} · 上次{" "}
          {new Date(scan.scannedAt).toLocaleString("zh-TW")}
        </p>
      )}

      {!scan && loading ? (
        <p className="text-sm text-terminal-muted font-mono">
          掃描主線池中…
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {(scan?.targets ?? []).map((t) => (
            <button
              key={t.symbol}
              type="button"
              onClick={() => onSelect(t.symbol)}
              className="text-left rounded-lg border border-terminal-border bg-terminal-bg/70 p-3 hover:border-terminal-cyan/50 hover:shadow-glow transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-terminal-text">
                  {t.symbol}
                </span>
                <span className="font-mono text-terminal-cyan">
                  {t.score.toFixed(1)}
                </span>
              </div>
              <div className="text-[10px] text-terminal-muted mt-0.5">
                {t.name} · ${t.price}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono text-terminal-muted">
                <span>RS超額 {t.rsScore > 0 ? "+" : ""}{t.rsScore}%</span>
                <span>ADR {t.adr20Pct}%</span>
                <span>52W {t.near52wPct}%</span>
                <span
                  className={
                    Math.abs(t.ema9DeviationPct) > 15
                      ? "text-terminal-red"
                      : ""
                  }
                >
                  偏離 {t.ema9DeviationPct > 0 ? "+" : ""}
                  {t.ema9DeviationPct}%
                </span>
              </div>
              {t.tagLabels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.tagLabels.map((label) => (
                    <span
                      key={label}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

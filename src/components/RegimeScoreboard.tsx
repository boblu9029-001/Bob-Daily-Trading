"use client";

import type { RegimeBoard } from "@/lib/types";

function ScoreBar({ score }: { score: number }) {
  const pct = ((score + 100) / 200) * 100;
  const color =
    score >= 55
      ? "#10b981"
      : score >= 15
        ? "#00f2fe"
        : score >= -35
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs font-mono text-terminal-muted mb-1">
        <span>-100</span>
        <span className="text-terminal-text">
          綜合多空：{score > 0 ? "+" : ""}
          {score}
        </span>
        <span>+100</span>
      </div>
      <div className="h-3 rounded-full bg-terminal-bg border border-terminal-border overflow-hidden relative">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/40"
          style={{ left: "50%" }}
        />
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.max(2, pct)}%`,
            background: `linear-gradient(90deg, #ef4444, ${color})`,
          }}
        />
      </div>
    </div>
  );
}

export function RegimeScoreboard({
  board,
  loading,
  onRefresh,
}: {
  board: RegimeBoard | null;
  loading?: boolean;
  onRefresh: () => void;
}) {
  return (
    <section id="regime" className="card scroll-mt-20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="section-title">雙市場中期趨勢共振儀</h2>
          <p className="section-sub">
            Market & Crypto Regime · 9 &gt; 21 &gt; 50 EMA
          </p>
        </div>
        <button type="button" className="btn-ghost" onClick={onRefresh}>
          刷新
        </button>
      </div>

      {loading && !board ? (
        <p className="text-sm text-terminal-muted font-mono">掃描大盤中…</p>
      ) : board ? (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="badge-cyan">{board.mode}</span>
            <span
              className={`text-xs font-mono ${
                board.isLive ? "text-terminal-green" : "text-terminal-muted"
              }`}
            >
              {board.sessionLabel}
            </span>
          </div>

          <ScoreBar score={board.score} />

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <AssetTable title="美股大盤" rows={board.equities} />
            <AssetTable title="加密大盤" rows={board.cryptos} />
          </div>

          <p className="mt-3 text-[10px] text-terminal-muted font-mono">
            更新於 {new Date(board.updatedAt).toLocaleString("zh-TW")}
          </p>
        </>
      ) : (
        <p className="text-sm text-terminal-red">無法載入共振儀</p>
      )}
    </section>
  );
}

function AssetTable({
  title,
  rows,
}: {
  title: string;
  rows: RegimeBoard["equities"];
}) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-terminal-muted mb-2">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-terminal-muted text-left border-b border-terminal-border">
              <th className="py-1.5 pr-2">代碼</th>
              <th className="py-1.5 pr-2">排列</th>
              <th className="py-1.5 pr-2">偏離9</th>
              <th className="py-1.5 pr-2">動能</th>
              <th className="py-1.5">分</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.symbol}
                className="border-b border-terminal-border/50 hover:bg-white/[0.02]"
              >
                <td className="py-2 pr-2 text-terminal-text font-semibold">
                  {r.symbol}
                  <div className="text-[10px] text-terminal-muted font-sans font-normal">
                    ${r.price.toLocaleString()}
                  </div>
                </td>
                <td className="py-2 pr-2">
                  {r.emaStackBullish ? (
                    <span className="text-terminal-green">9&gt;21&gt;50</span>
                  ) : (
                    <span className="text-terminal-red">非多頭</span>
                  )}
                </td>
                <td
                  className={`py-2 pr-2 ${
                    Math.abs(r.ema9DeviationPct) > 15
                      ? "text-terminal-red"
                      : "text-terminal-cyan"
                  }`}
                >
                  {r.ema9DeviationPct > 0 ? "+" : ""}
                  {r.ema9DeviationPct}%
                </td>
                <td
                  className={`py-2 pr-2 ${
                    r.change24hPct >= 0
                      ? "text-terminal-green"
                      : "text-terminal-red"
                  }`}
                >
                  {r.change24hPct > 0 ? "+" : ""}
                  {r.change24hPct}%
                </td>
                <td className="py-2">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { RegimeScoreboard } from "./RegimeScoreboard";
import { ActivePositions } from "./ActivePositions";
import { MomentumTargets } from "./MomentumTargets";
import { TvChart } from "./TvChart";
import { BottomNav } from "./BottomNav";
import type {
  ChartMeta,
  PositionLive,
  RegimeBoard,
  ScanResult,
  Timeframe,
} from "@/lib/types";

export function Dashboard() {
  const [board, setBoard] = useState<RegimeBoard | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [positions, setPositions] = useState<PositionLive[]>([]);
  const [storage, setStorage] = useState("local");
  const [symbol, setSymbol] = useState("NVDA");
  const [inputSymbol, setInputSymbol] = useState("NVDA");
  const [tf, setTf] = useState<Timeframe>("1D");
  const [chart, setChart] = useState<ChartMeta | null>(null);

  const [loadingRegime, setLoadingRegime] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingPos, setLoadingPos] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);

  const loadRegime = useCallback(async () => {
    setLoadingRegime(true);
    try {
      const res = await fetch("/api/regime");
      if (res.ok) setBoard(await res.json());
    } finally {
      setLoadingRegime(false);
    }
  }, []);

  const loadScan = useCallback(async () => {
    setLoadingScan(true);
    try {
      const res = await fetch("/api/scan");
      if (res.ok) setScan(await res.json());
    } finally {
      setLoadingScan(false);
    }
  }, []);

  const loadPositions = useCallback(async () => {
    setLoadingPos(true);
    try {
      const res = await fetch("/api/positions");
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions ?? []);
        setStorage(data.storage ?? "local");
      }
    } finally {
      setLoadingPos(false);
    }
  }, []);

  const loadChart = useCallback(async (sym: string, timeframe: Timeframe) => {
    setLoadingChart(true);
    try {
      const res = await fetch(
        `/api/chart/${encodeURIComponent(sym)}?tf=${timeframe}`
      );
      if (res.ok) setChart(await res.json());
    } finally {
      setLoadingChart(false);
    }
  }, []);

  const selectSymbol = useCallback(
    (sym: string) => {
      const s = sym.toUpperCase();
      setSymbol(s);
      setInputSymbol(s);
      loadChart(s, tf);
      document.getElementById("chart")?.scrollIntoView({ behavior: "smooth" });
    },
    [loadChart, tf]
  );

  useEffect(() => {
    loadRegime();
    loadScan();
    loadPositions();
    loadChart(symbol, tf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadChart(symbol, tf);
  }, [symbol, tf, loadChart]);

  // Auto hourly refresh during live session
  useEffect(() => {
    const id = setInterval(() => {
      if (board?.isLive) {
        loadRegime();
        loadPositions();
      }
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [board?.isLive, loadRegime, loadPositions]);

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-terminal-border bg-terminal-bg/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-terminal-text">
              Bob{" "}
              <span className="text-terminal-cyan">Daily Trading</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-terminal-muted font-mono">
              Martin Luk Master System 4.0 Pro
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-mono text-terminal-muted">
            <a href="#regime" className="hover:text-terminal-cyan">
              共振儀
            </a>
            <a href="#positions" className="hover:text-terminal-cyan">
              持倉
            </a>
            <a href="#focus" className="hover:text-terminal-cyan">
              動量
            </a>
            <a href="#chart" className="hover:text-terminal-cyan">
              圖表
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <RegimeScoreboard
          board={board}
          loading={loadingRegime}
          onRefresh={loadRegime}
        />
        <ActivePositions
          positions={positions}
          storage={storage}
          loading={loadingPos}
          onRefresh={loadPositions}
          onSelectSymbol={selectSymbol}
          onCreate={async (payload) => {
            await fetch("/api/positions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            await loadPositions();
          }}
          onUpdateStop={async (id, stopLoss) => {
            await fetch("/api/positions", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, stopLoss, action: "update" }),
            });
            await loadPositions();
          }}
          onClose={async (id) => {
            await fetch(`/api/positions?id=${id}`, { method: "DELETE" });
            await loadPositions();
          }}
        />
        <MomentumTargets
          scan={scan}
          loading={loadingScan}
          onScan={loadScan}
          onSelect={selectSymbol}
        />
        <TvChart
          data={chart}
          loading={loadingChart}
          timeframe={tf}
          onTimeframeChange={setTf}
          symbol={inputSymbol}
          onSymbolChange={setInputSymbol}
          onSubmitSymbol={(s) => {
            const v = s.trim().toUpperCase();
            if (!v) return;
            setSymbol(v);
          }}
        />
      </main>

      <BottomNav />
    </div>
  );
}

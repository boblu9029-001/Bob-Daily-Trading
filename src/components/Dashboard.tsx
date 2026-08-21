"use client";

import { useCallback, useEffect, useState } from "react";
import { RegimeScoreboard } from "./RegimeScoreboard";
import { ActivePositions } from "./ActivePositions";
import { MomentumTargets } from "./MomentumTargets";
import { SignalRadar } from "./SignalRadar";
import { TvChart } from "./TvChart";
import { BottomNav } from "./BottomNav";
import { enrichPosition, enrichPositionOptimistic } from "@/lib/scoring";
import { detectAssetClass, normalizeSymbol } from "@/lib/symbols";
import { RPT_PCT } from "@/lib/types";
import type {
  ChartMeta,
  Position,
  PositionLive,
  RegimeBoard,
  ScanResult,
  Timeframe,
  TradeSignal,
} from "@/lib/types";

export function Dashboard() {
  const [board, setBoard] = useState<RegimeBoard | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [signalsAt, setSignalsAt] = useState<string | undefined>();
  const [positions, setPositions] = useState<PositionLive[]>([]);
  const [storage, setStorage] = useState("local");
  const [symbol, setSymbol] = useState("NVDA");
  const [inputSymbol, setInputSymbol] = useState("NVDA");
  const [tf, setTf] = useState<Timeframe>("1D");
  const [chart, setChart] = useState<ChartMeta | null>(null);

  const [loadingRegime, setLoadingRegime] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingSignals, setLoadingSignals] = useState(false);
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

  const loadSignals = useCallback(async () => {
    setLoadingSignals(true);
    try {
      const res = await fetch("/api/signals");
      if (res.ok) {
        const data = await res.json();
        setSignals(data.signals ?? []);
        setSignalsAt(data.scannedAt);
      }
    } finally {
      setLoadingSignals(false);
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
    loadSignals();
    loadPositions();
    loadChart(symbol, tf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadChart(symbol, tf);
  }, [symbol, tf, loadChart]);

  useEffect(() => {
    const id = setInterval(() => {
      if (board?.isLive) {
        loadRegime();
        loadPositions();
        loadSignals();
      }
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [board?.isLive, loadRegime, loadPositions, loadSignals]);

  async function createPositionOptimistic(payload: {
    symbol: string;
    entryPrice: number;
    stopLoss: number;
    accountEquity: number;
    notes?: string;
  }) {
    const sym = normalizeSymbol(payload.symbol);
    const riskPerShare = Math.abs(payload.entryPrice - payload.stopLoss);
    const riskBudget = payload.accountEquity * RPT_PCT;
    const qty = Math.max(1, Math.floor(riskBudget / Math.max(riskPerShare, 1e-9)));
    const now = new Date().toISOString();
    const tempId = `temp-${crypto.randomUUID()}`;

    const optimisticBase: Position = {
      id: tempId,
      symbol: sym,
      assetClass: detectAssetClass(sym),
      side: "long",
      entryPrice: payload.entryPrice,
      stopLoss: payload.stopLoss,
      qty,
      accountEquity: payload.accountEquity,
      notes: payload.notes,
      status: "open",
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    };
    const optimistic = enrichPositionOptimistic(optimisticBase);

    // 1) 樂觀更新：瞬間出現在面板
    setPositions((prev) => [optimistic, ...prev]);

    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          typeof err.error === "string" ? err.error : "新增持倉失敗"
        );
      }
      // 2) 拉取最新資料（Supabase / 本地檔）覆蓋樂觀狀態
      await loadPositions();
    } catch (e) {
      // 回滾暫存卡並重新同步
      setPositions((prev) => prev.filter((p) => p.id !== tempId));
      await loadPositions();
      throw e;
    }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-40 border-b border-terminal-border bg-terminal-bg/90 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-terminal-text">
              <span>Bob</span>
              <span className="text-terminal-cyan"> Daily Trading</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-terminal-muted font-mono">
              Martin Luk Master System 4.0 Pro
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 text-[10px] font-mono text-terminal-muted">
            <a href="#regime" className="hover:text-terminal-cyan">
              共振儀
            </a>
            <a href="#positions" className="hover:text-terminal-cyan">
              持倉
            </a>
            <a href="#focus" className="hover:text-terminal-cyan">
              動量
            </a>
            <a href="#radar" className="hover:text-terminal-cyan">
              雷達
            </a>
            <a href="#chart" className="hover:text-terminal-cyan">
              圖表
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-4 py-4 space-y-4">
        {/* 頂部：雙大盤共振儀 */}
        <RegimeScoreboard
          board={board}
          loading={loadingRegime}
          onRefresh={loadRegime}
        />

        {/* 中段：左持倉+動量 / 右雷達 */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-7 space-y-4">
            <ActivePositions
              positions={positions}
              storage={storage}
              loading={loadingPos}
              onRefresh={loadPositions}
              onSelectSymbol={selectSymbol}
              onCreate={createPositionOptimistic}
              onUpdateStop={async (id, stopLoss) => {
                setPositions((prev) =>
                  prev.map((p) =>
                    p.id === id
                      ? enrichPosition({ ...p, stopLoss }, p.lastPrice, p.ema9)
                      : p
                  )
                );
                await fetch("/api/positions", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id, stopLoss, action: "update" }),
                });
                await loadPositions();
              }}
              onClose={async (id) => {
                const snapshot = positions;
                setPositions((prev) => prev.filter((p) => p.id !== id));
                try {
                  await fetch(`/api/positions?id=${id}`, { method: "DELETE" });
                  await loadPositions();
                } catch {
                  setPositions(snapshot);
                }
              }}
            />
            <MomentumTargets
              scan={scan}
              loading={loadingScan}
              onScan={loadScan}
              onSelect={selectSymbol}
            />
          </div>

          <div className="xl:col-span-5 space-y-4">
            <SignalRadar
              signals={signals}
              scannedAt={signalsAt}
              loading={loadingSignals}
              onRefresh={loadSignals}
              onSelect={selectSymbol}
            />
          </div>
        </div>

        {/* 下欄：互動 K 線 */}
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

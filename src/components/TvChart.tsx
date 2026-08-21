"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import type { ChartMeta, Timeframe } from "@/lib/types";

interface Props {
  data: ChartMeta | null;
  loading?: boolean;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  symbol: string;
  onSymbolChange: (s: string) => void;
  onSubmitSymbol: (s: string) => void;
}

export function TvChart({
  data,
  loading,
  timeframe,
  onTimeframeChange,
  symbol,
  onSymbolChange,
  onSubmitSymbol,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#8b949e",
        fontFamily: "JetBrains Mono, monospace",
      },
      grid: {
        vertLines: { color: "#1e2330" },
        horzLines: { color: "#1e2330" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#1e2330" },
      timeScale: { borderColor: "#1e2330", timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 420,
    });
    chartRef.current = chart;
    candleRef.current = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!data || !chartRef.current || !candleRef.current) return;
    const chart = chartRef.current;

    // wipe old overlays by recreating lines
    // lightweight-charts v4: removeSeries then re-add
    const existing = (chart as unknown as { _privateSeries?: unknown })._privateSeries;
    void existing;

    candleRef.current.setData(
      data.bars.map((b) => ({
        time: b.time as unknown as string,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }))
    );

    // Clear previous line series by tracking on chart via dataset attribute
    const root = containerRef.current;
    const prevIds = root?.dataset.lineIds?.split(",").filter(Boolean) ?? [];
    // We store series refs on the chart object map
    const mapKey = "__bobLines";
    type LineMap = Record<string, ISeriesApi<"Line">>;
    const store = chart as unknown as { [mapKey]?: LineMap };
    if (!store[mapKey]) store[mapKey] = {};
    for (const id of Object.keys(store[mapKey]!)) {
      try {
        chart.removeSeries(store[mapKey]![id]);
      } catch {
        /* ignore */
      }
      delete store[mapKey]![id];
    }
    void prevIds;

    const addLine = (
      id: string,
      points: { time: number; value: number }[],
      color: string,
      width = 2
    ) => {
      const s = chart.addLineSeries({
        color,
        lineWidth: width as 1 | 2 | 3 | 4,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      s.setData(
        points.map((p) => ({
          time: p.time as unknown as string,
          value: p.value,
        }))
      );
      store[mapKey]![id] = s;
    };

    addLine("ema9", data.ema9, "#facc15", 2);
    addLine("ema21", data.ema21, "#22d3ee", 2);
    addLine("ema50", data.ema50, "#fb923c", 2);
    addLine("avwap", data.avwap, "#a855f7", 2);

    chart.timeScale().fitContent();
    if (root) root.dataset.lineIds = "ema9,ema21,ema50,avwap";
  }, [data]);

  return (
    <section id="chart" className="card scroll-mt-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
        <div>
          <h2 className="section-title">互動式 K 線分析終端</h2>
          <p className="section-sub">9 / 21 / 50 EMA · Anchored VWAP</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitSymbol(symbol);
          }}
        >
          <input
            className="input w-28 sm:w-36 uppercase"
            value={symbol}
            onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
            placeholder="NVDA / BTC"
            aria-label="搜尋代碼"
          />
          <button type="submit" className="btn-primary">
            載入
          </button>
          <div className="flex rounded-md overflow-hidden border border-terminal-border">
            {(["5m", "1D"] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange(tf)}
                className={`px-3 py-1.5 text-xs font-mono ${
                  timeframe === tf
                    ? "bg-terminal-cyan/20 text-terminal-cyan"
                    : "bg-terminal-bg text-terminal-muted"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </form>
      </div>

      {data && (
        <div className="flex flex-wrap gap-3 mb-2 text-xs font-mono text-terminal-muted">
          <span className="text-terminal-text font-semibold">{data.symbol}</span>
          <span>${data.price.toFixed(2)}</span>
          <span>20日 ADR%：{data.adr20Pct.toFixed(2)}%</span>
          <span
            className={
              Math.abs(data.ema9DeviationPct) > 15
                ? "text-terminal-red"
                : "text-terminal-cyan"
            }
          >
            9EMA 偏離：{data.ema9DeviationPct > 0 ? "+" : ""}
            {data.ema9DeviationPct.toFixed(2)}%
          </span>
          <span className="text-yellow-400">黃=9</span>
          <span className="text-cyan-400">青=21</span>
          <span className="text-orange-400">橙=50</span>
          <span className="text-purple-400">紫=AVWAP</span>
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden border border-terminal-border">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-terminal-card/70 text-terminal-cyan text-sm font-mono">
            載入圖表中…
          </div>
        )}
        <div ref={containerRef} className="w-full min-h-[420px]" />
      </div>
    </section>
  );
}

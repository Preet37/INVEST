"use client";

import { useEffect, useRef } from "react";
import { CandlestickSeries, HistogramSeries, createChart, createSeriesMarkers } from "lightweight-charts";
import type { Bar } from "@/lib/patterns";

// Candles on top, volume underneath. `hideDates` blanks the time axis (used while the answer is hidden).
// `cutoff` marks the first day that was hidden, once it's revealed.
export default function PriceChart({ bars, hideDates, cutoff, height = 300 }: { bars: Bar[]; hideDates?: boolean; cutoff?: string; height?: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current || !bars.length) return;
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    const up = "#16a34a";
    const down = "#dc2626";
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { color: "transparent" }, textColor: v("--muted"), attributionLogo: false, fontSize: 12 },
      grid: { vertLines: { visible: false }, horzLines: { color: v("--line") } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, visible: !hideDates, fixLeftEdge: true, fixRightEdge: true },
      localization: hideDates ? { timeFormatter: () => "" } : undefined,
      handleScroll: false,
      handleScale: false,
    });
    const candles = chart.addSeries(CandlestickSeries, { upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false, priceLineVisible: false });
    candles.setData(bars.map((b) => ({ time: b.day, open: b.open, high: b.high, low: b.low, close: b.close })));
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 }, visible: false });
    chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.06, bottom: 0.22 } });
    volume.setData(bars.map((b) => ({ time: b.day, value: b.volume, color: b.close >= b.open ? "rgba(22,163,74,0.35)" : "rgba(220,38,38,0.35)" })));
    if (cutoff) createSeriesMarkers(candles, [{ time: cutoff, position: "aboveBar", color: v("--accent"), shape: "arrowDown", text: "Hidden part starts" }]);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [bars, hideDates, cutoff]);

  return <div ref={el} style={{ height }} className="w-full" role="img" aria-label="Price chart with daily candles and volume" />;
}

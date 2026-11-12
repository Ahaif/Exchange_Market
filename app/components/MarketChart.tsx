"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { buildCandles, type TradePoint } from "../../lib/candles.mjs";
export default function MarketChart({
  trades,
  loading,
}: {
  trades: TradePoint[];
  loading: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const price = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Area"> | null>(
    null,
  );
  const volume = useRef<ISeriesApi<"Histogram"> | null>(null);
  const fitted = useRef(0);
  const [interval, setInterval] = useState(60);
  const [style, setStyle] = useState<"candles" | "area">("candles");
  const candles = useMemo(
    () => buildCandles(trades, interval),
    [trades, interval],
  );
  const last = candles.at(-1);
  useEffect(() => {
    if (!container.current) return;
    const instance = createChart(container.current, {
      autoSize: true,
      height: 350,
      layout: {
        background: { type: ColorType.Solid, color: "#10151e" },
        textColor: "#7c879b",
        fontFamily: "Arial, sans-serif",
        fontSize: 10,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "#1b2230" },
        horzLines: { color: "#1b2230" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "#252d3b", minimumWidth: 83 },
      timeScale: {
        borderColor: "#252d3b",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      localization: { priceFormatter: (value: number) => value.toFixed(9) },
    });
    chart.current = instance;
    const format = {
      type: "price" as const,
      precision: 9,
      minMove: 0.000000001,
    };
    price.current =
      style === "candles"
        ? instance.addSeries(CandlestickSeries, {
            upColor: "#27d8a2",
            downColor: "#f16b83",
            wickUpColor: "#27d8a2",
            wickDownColor: "#f16b83",
            borderVisible: false,
            priceFormat: format,
          })
        : instance.addSeries(AreaSeries, {
            lineColor: "#27d8a2",
            topColor: "#27d8a22b",
            bottomColor: "#27d8a202",
            priceFormat: format,
          });
    volume.current = instance.addSeries(
      HistogramSeries,
      {
        priceFormat: { type: "volume" },
        priceLineVisible: false,
        lastValueVisible: false,
      },
      1,
    );
    instance.panes()[1].setHeight(65);
    fitted.current = 0;
    return () => {
      instance.remove();
      chart.current = null;
      price.current = null;
      volume.current = null;
    };
  }, [style]);
  useEffect(() => {
    if (!price.current || !volume.current || !chart.current) return;
    if (style === "candles")
      (price.current as ISeriesApi<"Candlestick">).setData(
        candles.map((c) => ({ ...c, time: c.time as UTCTimestamp })),
      );
    else
      (price.current as ISeriesApi<"Area">).setData(
        candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })),
      );
    volume.current.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "#27d8a24d" : "#f16b834d",
      })),
    );
    if (candles.length && fitted.current !== interval) {
      chart.current.timeScale().fitContent();
      fitted.current = interval;
    }
  }, [candles, style, interval]);
  return (
    <section className="panel chart-panel" aria-label="HAI ETH price chart">
      <div className="panel-heading">
        <div>
          <h2>
            HAI / ETH <span className="tag">SPOT</span>
          </h2>
          <span className="subtle">Confirmed exchange fills · UTC</span>
        </div>
        <span className="chart-live">
          <i />
          {trades.length} trades loaded
        </span>
      </div>
      <div className="chart-toolbar">
        <div className="timeframes">
          {[
            [60, "1m"],
            [300, "5m"],
            [3600, "1h"],
          ].map(([seconds, label]) => (
            <button
              key={seconds}
              aria-pressed={interval === seconds}
              className={interval === seconds ? "chosen" : ""}
              onClick={() => setInterval(Number(seconds))}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="chart-style">
          <button
            aria-pressed={style === "candles"}
            className={style === "candles" ? "chosen" : ""}
            onClick={() => setStyle("candles")}
          >
            Candles
          </button>
          <button
            aria-pressed={style === "area"}
            className={style === "area" ? "chosen" : ""}
            onClick={() => setStyle("area")}
          >
            Area
          </button>
        </div>
      </div>
      <div className="ohlc" aria-live="polite">
        {last ? (
          <>
            <span>
              O <b>{last.open.toFixed(9)}</b>
            </span>
            <span>
              H <b>{last.high.toFixed(9)}</b>
            </span>
            <span>
              L <b>{last.low.toFixed(9)}</b>
            </span>
            <span>
              C <b>{last.close.toFixed(9)}</b>
            </span>
          </>
        ) : (
          <span>
            {loading
              ? "Loading confirmed trades…"
              : "No confirmed trades in the loaded history."}
          </span>
        )}
      </div>
      <div className="chart-canvas" ref={container} />
      <div className="chart-caption">
        <span>Volume in HAI · Sparse demo history; no synthetic candles</span>
        <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">
          Charts by TradingView ↗
        </a>
      </div>
    </section>
  );
}

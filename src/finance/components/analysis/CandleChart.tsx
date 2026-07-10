import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts'
import type { Candle, HistoricalPeriod, CandleInterval } from '../../types/finance'
import type { PredictionResult } from '../../engine/predictionEngine'

type IntervalChoice = CandleInterval | 'auto'

interface Props {
  candles: Candle[]
  period: HistoricalPeriod
  onPeriodChange: (p: HistoricalPeriod) => void
  interval: IntervalChoice
  onIntervalChange: (i: IntervalChoice) => void
  chartType: 'candlestick' | 'line'
  onChartTypeChange: (t: 'candlestick' | 'line') => void
  showVolume: boolean
  prediction?: PredictionResult | null
  bollingerUpper?: (number | null)[]
  bollingerLower?: (number | null)[]
  bollingerMiddle?: (number | null)[]
}

const PERIODS: HistoricalPeriod[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y']

const INTERVALS: { value: IntervalChoice; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1m',   label: '1min' },
  { value: '5m',   label: '5min' },
  { value: '15m',  label: '15min' },
  { value: '1h',   label: '1h' },
  { value: '4h',   label: '4h' },
  { value: '1d',   label: '1D' },
  { value: '1wk',  label: '1W' },
  { value: '1mo',  label: '1M' },
]

export function CandleChart({
  candles, period, onPeriodChange, interval, onIntervalChange,
  chartType, onChartTypeChange,
  showVolume, prediction,
  bollingerUpper, bollingerLower, bollingerMiddle,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return
    const container = containerRef.current

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: '#a0a0b0',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        timeVisible: true,
        secondsVisible: false,
      },
    })
    chartRef.current = chart

    // ms → seconds pour lightweight-charts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lwCandles = candles.map(c => ({
      time: Math.floor(c.time / 1000) as unknown as import('lightweight-charts').Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    }))

    let mainSeries: ReturnType<typeof chart.addSeries>
    if (chartType === 'candlestick') {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#4cb782',
        downColor: '#eb5757',
        borderUpColor: '#4cb782',
        borderDownColor: '#eb5757',
        wickUpColor: '#4cb782',
        wickDownColor: '#eb5757',
      })
      mainSeries.setData(lwCandles)
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: '#5e6ad2',
        lineWidth: 2,
      })
      mainSeries.setData(lwCandles.map(c => ({ time: c.time, value: c.close })))
    }

    // Bollinger Bands
    if (bollingerUpper && bollingerLower) {
      const styleOpts = { color: 'rgba(94,106,210,0.4)', lineWidth: 1 as const, lineStyle: 2 as const }
      const bu = chart.addSeries(LineSeries, { ...styleOpts, title: 'BB+' })
      const bl = chart.addSeries(LineSeries, { ...styleOpts, title: 'BB-' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bu.setData(candles.reduce<any[]>((acc, c, i) => {
        if (bollingerUpper[i] != null) acc.push({ time: Math.floor(c.time / 1000) as unknown as import('lightweight-charts').Time, value: bollingerUpper[i]! })
        return acc
      }, []))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bl.setData(candles.reduce<any[]>((acc, c, i) => {
        if (bollingerLower[i] != null) acc.push({ time: Math.floor(c.time / 1000) as unknown as import('lightweight-charts').Time, value: bollingerLower[i]! })
        return acc
      }, []))
    }

    // Niveaux de Fibonacci (modèle 'fibonacci') — lignes horizontales annotées
    if (prediction?.levels?.length) {
      for (const lvl of prediction.levels) {
        mainSeries.createPriceLine({
          price: lvl.price,
          color: lvl.kind === 'retracement' ? 'rgba(226,181,80,0.75)' : 'rgba(130,143,255,0.65)',
          lineWidth: 1,
          lineStyle: lvl.ratio === 0.5 || lvl.ratio === 1 ? 0 : 2,
          axisLabelVisible: true,
          title: `Fib ${lvl.label} · ${lvl.price.toFixed(2)}`,
        })
      }
    }

    // Overlay Prédiction
    if (prediction) {
      const predLine = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: 1,
        title: prediction.label,
      })
      predLine.setData(prediction.points.map(p => ({
        time: Math.floor(p.time / 1000) as unknown as import('lightweight-charts').Time,
        value: p.value,
      })))

      if (prediction.points[0]?.upper != null) {
        const predUpper = chart.addSeries(LineSeries, { color: 'rgba(245,158,11,0.25)', lineWidth: 1 })
        predUpper.setData(prediction.points.map(p => ({
          time: Math.floor(p.time / 1000) as unknown as import('lightweight-charts').Time,
          value: p.upper!,
        })))
        const predLower = chart.addSeries(LineSeries, { color: 'rgba(245,158,11,0.25)', lineWidth: 1 })
        predLower.setData(prediction.points.map(p => ({
          time: Math.floor(p.time / 1000) as unknown as import('lightweight-charts').Time,
          value: p.lower!,
        })))
      }
    }

    // Volume en histogramme
    if (showVolume && candles[0]?.volume != null) {
      const volSeries = chart.addSeries(HistogramSeries, {
        color: 'rgba(94,106,210,0.3)',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      })
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
      volSeries.setData(candles.map(c => ({
        time: Math.floor(c.time / 1000) as unknown as import('lightweight-charts').Time,
        value: c.volume ?? 0,
        color: c.close >= c.open ? 'rgba(76,183,130,0.3)' : 'rgba(235,87,87,0.3)',
      })))
    }

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (container && chartRef.current) {
        chartRef.current.resize(container.clientWidth, container.clientHeight)
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    }
  }, [candles, chartType, showVolume, prediction,
    bollingerUpper, bollingerLower, bollingerMiddle])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {/* Sélecteur de période */}
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              style={{
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: period === p ? 600 : 400,
                background: period === p ? 'var(--primary)' : 'transparent',
                color: period === p ? '#fff' : 'var(--ink-subtle)',
                border: period === p ? 'none' : '1px solid var(--hairline)',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>
        {/* Timeframe des chandeliers (unité de temps, indépendante de la période) */}
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }} title="Unité de temps des chandeliers">
          <span style={{ fontSize: 10, color: 'var(--ink-tertiary)', marginRight: 2, textTransform: 'uppercase', letterSpacing: 0.4 }}>UT</span>
          {INTERVALS.map(iv => (
            <button
              key={iv.value}
              onClick={() => onIntervalChange(iv.value)}
              style={{
                padding: '3px 6px',
                fontSize: 10.5,
                fontFamily: 'var(--font-mono)',
                fontWeight: interval === iv.value ? 600 : 400,
                background: interval === iv.value ? 'var(--surface-4)' : 'transparent',
                color: interval === iv.value ? 'var(--ink)' : 'var(--ink-tertiary)',
                border: '1px solid ' + (interval === iv.value ? 'var(--hairline-strong)' : 'transparent'),
                borderRadius: 'var(--r-xs)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {iv.label}
            </button>
          ))}
        </div>

        {/* Type de graphique */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['candlestick', 'line'] as const).map(t => (
            <button
              key={t}
              onClick={() => onChartTypeChange(t)}
              style={{
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: chartType === t ? 600 : 400,
                background: chartType === t ? 'var(--primary)' : 'transparent',
                color: chartType === t ? '#fff' : 'var(--ink-subtle)',
                border: chartType === t ? 'none' : '1px solid var(--hairline)',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t === 'candlestick' ? '🕯 Chandeliers' : '📈 Ligne'}
            </button>
          ))}
        </div>
      </div>

      {/* Conteneur chart */}
      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, borderRadius: 8, overflow: 'hidden' }}
      />
    </div>
  )
}

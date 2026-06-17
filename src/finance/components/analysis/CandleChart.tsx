import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts'
import type { Candle, HistoricalPeriod } from '../../types/finance'
import type { PredictionResult } from '../../engine/predictionEngine'

interface Props {
  candles: Candle[]
  period: HistoricalPeriod
  onPeriodChange: (p: HistoricalPeriod) => void
  chartType: 'candlestick' | 'line'
  onChartTypeChange: (t: 'candlestick' | 'line') => void
  showVolume: boolean
  prediction?: PredictionResult | null
  sma20?: (number | null)[]
  sma50?: (number | null)[]
  ema20?: (number | null)[]
  bollingerUpper?: (number | null)[]
  bollingerLower?: (number | null)[]
  bollingerMiddle?: (number | null)[]
}

const PERIODS: HistoricalPeriod[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y']

export function CandleChart({
  candles, period, onPeriodChange, chartType, onChartTypeChange,
  showVolume, prediction, sma20, sma50, ema20,
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

    if (chartType === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#4cb782',
        downColor: '#eb5757',
        borderUpColor: '#4cb782',
        borderDownColor: '#eb5757',
        wickUpColor: '#4cb782',
        wickDownColor: '#eb5757',
      })
      series.setData(lwCandles)
    } else {
      const series = chart.addSeries(LineSeries, {
        color: '#5e6ad2',
        lineWidth: 2,
      })
      series.setData(lwCandles.map(c => ({ time: c.time, value: c.close })))
    }

    // Overlay SMA 20
    if (sma20) {
      const s = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'SMA20' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = candles.reduce<any[]>((acc, c, i) => {
        if (sma20[i] != null) acc.push({ time: Math.floor(c.time / 1000) as unknown as import('lightweight-charts').Time, value: sma20[i]! })
        return acc
      }, [])
      s.setData(data)
    }

    // Overlay SMA 50
    if (sma50) {
      const s = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, title: 'SMA50' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = candles.reduce<any[]>((acc, c, i) => {
        if (sma50[i] != null) acc.push({ time: Math.floor(c.time / 1000) as unknown as import('lightweight-charts').Time, value: sma50[i]! })
        return acc
      }, [])
      s.setData(data)
    }

    // Overlay EMA 20
    if (ema20) {
      const s = chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1, title: 'EMA20', lineStyle: 1 })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = candles.reduce<any[]>((acc, c, i) => {
        if (ema20[i] != null) acc.push({ time: Math.floor(c.time / 1000) as unknown as import('lightweight-charts').Time, value: ema20[i]! })
        return acc
      }, [])
      s.setData(data)
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
  }, [candles, chartType, showVolume, prediction, sma20, sma50, ema20,
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

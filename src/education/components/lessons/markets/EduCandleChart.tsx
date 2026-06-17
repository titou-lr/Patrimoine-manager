import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  createSeriesMarkers,
} from 'lightweight-charts'
import type { Time, ISeriesApi } from 'lightweight-charts'
import type { Candle } from '../../../../finance/types/finance'

export interface EduPriceLine {
  price: number
  color: string
  title: string
  dashed?: boolean
}

export interface EduMarker {
  index: number
  position: 'aboveBar' | 'belowBar' | 'inBar'
  color: string
  shape: 'circle' | 'arrowUp' | 'arrowDown' | 'square'
  text?: string
}

interface Props {
  candles: Candle[]
  chartType?: 'candlestick' | 'line'
  showVolume?: boolean
  height?: number
  priceLines?: EduPriceLine[]
  markers?: EduMarker[]
  sma20?: (number | null)[]
  sma50?: (number | null)[]
  ema20?: (number | null)[]
  bollingerUpper?: (number | null)[]
  bollingerLower?: (number | null)[]
}

const toTime = (ms: number) => Math.floor(ms / 1000) as unknown as Time

export function EduCandleChart({
  candles, chartType = 'candlestick', showVolume = false, height = 360,
  priceLines = [], markers = [], sma20, sma50, ema20, bollingerUpper, bollingerLower,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return
    const container = containerRef.current

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: { background: { color: 'transparent' }, textColor: '#a0a0b0' },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: false, secondsVisible: false },
    })
    chartRef.current = chart

    let mainSeries: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>

    if (chartType === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#4cb782', downColor: '#eb5757',
        borderUpColor: '#4cb782', borderDownColor: '#eb5757',
        wickUpColor: '#4cb782', wickDownColor: '#eb5757',
      })
      series.setData(candles.map(c => ({ time: toTime(c.time), open: c.open, high: c.high, low: c.low, close: c.close })))
      mainSeries = series
    } else {
      const series = chart.addSeries(LineSeries, { color: '#5e6ad2', lineWidth: 2 })
      series.setData(candles.map(c => ({ time: toTime(c.time), value: c.close })))
      mainSeries = series
    }

    if (sma20) {
      const s = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'SMA20' })
      s.setData(candles.reduce<{ time: Time; value: number }[]>((acc, c, i) => {
        if (sma20[i] != null) acc.push({ time: toTime(c.time), value: sma20[i]! })
        return acc
      }, []))
    }
    if (sma50) {
      const s = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, title: 'SMA50' })
      s.setData(candles.reduce<{ time: Time; value: number }[]>((acc, c, i) => {
        if (sma50[i] != null) acc.push({ time: toTime(c.time), value: sma50[i]! })
        return acc
      }, []))
    }
    if (ema20) {
      const s = chart.addSeries(LineSeries, { color: '#06b6d4', lineWidth: 1, title: 'EMA20', lineStyle: 1 })
      s.setData(candles.reduce<{ time: Time; value: number }[]>((acc, c, i) => {
        if (ema20[i] != null) acc.push({ time: toTime(c.time), value: ema20[i]! })
        return acc
      }, []))
    }
    if (bollingerUpper && bollingerLower) {
      const styleOpts = { color: 'rgba(94,106,210,0.4)', lineWidth: 1 as const, lineStyle: 2 as const }
      const bu = chart.addSeries(LineSeries, { ...styleOpts, title: 'BB+' })
      const bl = chart.addSeries(LineSeries, { ...styleOpts, title: 'BB-' })
      bu.setData(candles.reduce<{ time: Time; value: number }[]>((acc, c, i) => {
        if (bollingerUpper[i] != null) acc.push({ time: toTime(c.time), value: bollingerUpper[i]! })
        return acc
      }, []))
      bl.setData(candles.reduce<{ time: Time; value: number }[]>((acc, c, i) => {
        if (bollingerLower[i] != null) acc.push({ time: toTime(c.time), value: bollingerLower[i]! })
        return acc
      }, []))
    }

    if (showVolume && candles[0]?.volume != null) {
      const volSeries = chart.addSeries(HistogramSeries, {
        color: 'rgba(94,106,210,0.3)', priceFormat: { type: 'volume' }, priceScaleId: 'volume',
      })
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
      volSeries.setData(candles.map(c => ({
        time: toTime(c.time), value: c.volume ?? 0,
        color: c.close >= c.open ? 'rgba(76,183,130,0.3)' : 'rgba(235,87,87,0.3)',
      })))
    }

    priceLines.forEach(pl => {
      mainSeries.createPriceLine({
        price: pl.price, color: pl.color, lineWidth: 2,
        lineStyle: pl.dashed ? 2 : 0, axisLabelVisible: true, title: pl.title,
      })
    })

    if (markers.length > 0) {
      const seriesMarkers = createSeriesMarkers(
        mainSeries,
        markers
          .filter(m => candles[m.index])
          .map(m => ({
            time: toTime(candles[m.index].time),
            position: m.position, color: m.color, shape: m.shape, text: m.text,
          }))
      )
      void seriesMarkers
    }

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (container && chartRef.current) chartRef.current.resize(container.clientWidth, container.clientHeight)
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    }
  }, [candles, chartType, showVolume, priceLines, markers, sma20, sma50, ema20, bollingerUpper, bollingerLower])

  return <div ref={containerRef} style={{ width: '100%', height, borderRadius: 8, overflow: 'hidden' }} />
}

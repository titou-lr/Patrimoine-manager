import { useEffect, useMemo, useRef } from 'react'
import { createChart, LineSeries } from 'lightweight-charts'
import type { Candle } from '../../types/finance'
import { rsi as calcRsi, stochRsi as calcStochRsi } from '../../services/indicatorsService'

type Time = import('lightweight-charts').Time

interface SeriesDef {
  values: (number | null)[]
  color: string
  title?: string
}

interface OscChartProps {
  candles: Candle[]
  series: SeriesDef[]
  bands: { value: number; color: string }[]   // lignes horizontales (30/70, 20/80)
  height: number
}

/** Mini-chart 0-100 (lightweight-charts) pour un oscillateur */
function OscChart({ candles, series, bands, height }: OscChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return
    const container = containerRef.current

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: { background: { color: 'transparent' }, textColor: '#8a8f98', fontSize: 10 },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.1)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
    })
    chartRef.current = chart

    let bandHost: ReturnType<typeof chart.addSeries> | null = null
    for (const def of series) {
      const s = chart.addSeries(LineSeries, {
        color: def.color, lineWidth: 1, title: def.title,
        priceLineVisible: false, lastValueVisible: true,
        autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
      })
      const data = candles.reduce<{ time: Time; value: number }[]>((acc, c, i) => {
        const v = def.values[i]
        if (v != null) acc.push({ time: Math.floor(c.time / 1000) as unknown as Time, value: v })
        return acc
      }, [])
      s.setData(data)
      if (!bandHost) bandHost = s
    }

    if (bandHost) {
      for (const b of bands) {
        bandHost.createPriceLine({
          price: b.value, color: b.color, lineWidth: 1, lineStyle: 2,
          axisLabelVisible: false, title: '',
        })
      }
    }

    chart.timeScale().fitContent()

    const ro = new ResizeObserver(() => {
      if (container && chartRef.current) chartRef.current.resize(container.clientWidth, height)
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null }
    }
  }, [candles, series, bands, height])

  return <div ref={containerRef} style={{ width: '100%', height }} />
}

interface Props {
  candles: Candle[]
}

/**
 * Sous-graphiques d'oscillateurs sous le chart principal (style TradingView) :
 *  - RSI(14) avec zones 30/70
 *  - Stochastic RSI(14,14,3,3) — %K / %D avec zones 20/80
 */
export function OscillatorPanel({ candles }: Props) {
  const closes = useMemo(() => candles.map(c => c.close), [candles])
  const rsiVals = useMemo(() => calcRsi(closes, 14), [closes])
  const stoch = useMemo(() => calcStochRsi(closes, 14, 14, 3, 3), [closes])

  const rsiSeries = useMemo<SeriesDef[]>(
    () => [{ values: rsiVals, color: '#828fff', title: 'RSI 14' }],
    [rsiVals]
  )
  const stochSeries = useMemo<SeriesDef[]>(
    () => [
      { values: stoch.k, color: '#4cb782', title: '%K' },
      { values: stoch.d, color: '#e2b550', title: '%D' },
    ],
    [stoch]
  )
  const rsiBands = useMemo(() => [
    { value: 70, color: 'rgba(235,87,87,0.45)' },
    { value: 30, color: 'rgba(76,183,130,0.45)' },
  ], [])
  const stochBands = useMemo(() => [
    { value: 80, color: 'rgba(235,87,87,0.45)' },
    { value: 20, color: 'rgba(76,183,130,0.45)' },
  ], [])

  if (candles.length === 0) return null

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="panel" style={{ padding: '8px 12px 4px' }}>
        <div className="row" style={{ gap: 8, marginBottom: 2 }}>
          <span className="eyebrow">RSI (14)</span>
          <span className="caption" style={{ fontSize: 10 }}>30 survente · 70 surachat</span>
        </div>
        <OscChart candles={candles} series={rsiSeries} bands={rsiBands} height={110} />
      </div>
      <div className="panel" style={{ padding: '8px 12px 4px' }}>
        <div className="row" style={{ gap: 8, marginBottom: 2 }}>
          <span className="eyebrow">Stoch RSI (14, 3, 3)</span>
          <span className="row" style={{ gap: 10, fontSize: 10 }}>
            <span style={{ color: '#4cb782' }}>%K</span>
            <span style={{ color: '#e2b550' }}>%D</span>
          </span>
        </div>
        <OscChart candles={candles} series={stochSeries} bands={stochBands} height={110} />
      </div>
    </div>
  )
}

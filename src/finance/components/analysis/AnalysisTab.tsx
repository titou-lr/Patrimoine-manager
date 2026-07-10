import { useEffect, useState, useMemo } from 'react'
import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { fetchHistorical, fetchQuotes } from '../../services/priceService'
import { bollinger } from '../../services/indicatorsService'
import type { Candle, HistoricalPeriod, CandleInterval } from '../../types/finance'
import type { PredictionResult } from '../../engine/predictionEngine'
import type { ActiveOverlays } from './IndicatorPanel'
import { CandleChart } from './CandleChart'
import { IndicatorPanel } from './IndicatorPanel'
import { OscillatorPanel } from './OscillatorPanel'
import { PredictionOverlay } from './PredictionOverlay'
import { formatPrice } from '../../../utils/format'

export default function AnalysisTab() {
  const { selectedAssetId, setActiveTab } = useFinanceStore()
  const asset = selectedAssetId ? getAssetById(selectedAssetId) : null

  const [candles, setCandles] = useState<Candle[]>([])
  const [period, setPeriod] = useState<HistoricalPeriod>('1M')
  const [interval, setInterval] = useState<CandleInterval | 'auto'>('auto')
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')
  const [activeOverlays, setActiveOverlays] = useState<ActiveOverlays>({
    bollinger: false, volume: false,
  })
  const [activePrediction, setActivePrediction] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [price, setPrice] = useState<{ value: number; changePct: number } | null>(null)

  // Fetch candles on asset, period or timeframe change
  useEffect(() => {
    if (!asset) return
    setLoading(true)
    setCandles([])
    setActivePrediction(null)
    fetchHistorical(asset.ticker, period, interval === 'auto' ? undefined : interval).then(data => {
      setCandles(data)
      setLoading(false)
    })
  }, [asset?.ticker, period, interval])

  // Fetch quote for header price
  useEffect(() => {
    if (!asset) return
    fetchQuotes([asset.ticker]).then(quotes => {
      const q = quotes[0]
      if (q) setPrice({ value: q.price, changePct: q.changePct })
    })
  }, [asset?.ticker])

  // Overlays calculés
  const closes = useMemo(() => candles.map(c => c.close), [candles])

  const bollVals = useMemo(() => activeOverlays.bollinger ? bollinger(closes, 20, 2) : null, [closes, activeOverlays.bollinger])

  if (!asset) {
    return (
      <div className="panel" style={{ padding: 48, textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <div className="title" style={{ marginBottom: 8 }}>Aucun actif sélectionné</div>
        <p className="caption" style={{ marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>
          Sélectionne un actif depuis l'onglet Marché pour l'analyser ici.
        </p>
        <button
          className="btn"
          onClick={() => setActiveTab('market')}
          style={{ fontSize: 13 }}
        >
          Aller au Marché →
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header actif */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>{asset.name}</h2>
          <span style={{ fontSize: 11, color: 'var(--ink-subtle)', fontFamily: 'var(--font-mono)' }}>{asset.ticker}</span>
        </div>
        {price && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 27, fontWeight: 600, letterSpacing: '-0.8px', color: 'var(--ink)', lineHeight: 1.15 }}>
              {formatPrice(price.value, asset.currency)}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: price.changePct >= 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              {price.changePct >= 0 ? '+' : ''}{price.changePct.toFixed(2)}% <span style={{ color: 'var(--ink-tertiary)', fontWeight: 400, fontSize: 11 }}>24h</span>
            </div>
          </div>
        )}
      </div>

      {/* Layout 2 colonnes */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Colonne gauche : graphique (70%) */}
        <div style={{ flex: '7', minWidth: 0 }}>
          {loading ? (
            <div
              className="panel"
              style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 28, height: 28, border: '2px solid var(--primary)',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', margin: '0 auto 10px',
                }} />
                <span className="caption">Chargement des données…</span>
              </div>
            </div>
          ) : candles.length === 0 ? (
            <div
              className="panel"
              style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <p className="caption">Aucune donnée disponible pour cette période.</p>
            </div>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              <div className="panel" style={{ padding: 12, height: 420 }}>
                <CandleChart
                  candles={candles}
                  period={period}
                  onPeriodChange={setPeriod}
                  interval={interval}
                  onIntervalChange={setInterval}
                  chartType={chartType}
                  onChartTypeChange={setChartType}
                  showVolume={activeOverlays.volume}
                  prediction={activePrediction}
                  bollingerUpper={bollVals?.upper}
                  bollingerLower={bollVals?.lower}
                  bollingerMiddle={bollVals?.middle}
                />
              </div>
              {/* Sous-graphiques oscillateurs (RSI / Stoch RSI) */}
              <OscillatorPanel candles={candles} />
            </div>
          )}
        </div>

        {/* Colonne droite : panneaux (30%) */}
        <div style={{ flex: '3', minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <IndicatorPanel
            candles={candles}
            onOverlaysChange={setActiveOverlays}
          />
          <PredictionOverlay
            candles={candles}
            onPredictionChange={setActivePrediction}
            activePrediction={activePrediction}
          />
        </div>
      </div>
    </div>
  )
}

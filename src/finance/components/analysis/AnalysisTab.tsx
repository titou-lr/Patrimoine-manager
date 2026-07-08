import { useEffect, useState, useMemo } from 'react'
import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { fetchHistorical, fetchQuotes } from '../../services/priceService'
import { sma, ema, bollinger } from '../../services/indicatorsService'
import type { Candle, HistoricalPeriod } from '../../types/finance'
import type { PredictionResult } from '../../engine/predictionEngine'
import type { ActiveOverlays } from './IndicatorPanel'
import { CandleChart } from './CandleChart'
import { IndicatorPanel } from './IndicatorPanel'
import { PredictionOverlay } from './PredictionOverlay'
import { formatPrice } from '../../../utils/format'

export default function AnalysisTab() {
  const { selectedAssetId, setActiveTab } = useFinanceStore()
  const asset = selectedAssetId ? getAssetById(selectedAssetId) : null

  const [candles, setCandles] = useState<Candle[]>([])
  const [period, setPeriod] = useState<HistoricalPeriod>('1M')
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')
  const [activeOverlays, setActiveOverlays] = useState<ActiveOverlays>({
    sma20: false, sma50: false, ema20: false, bollinger: false, volume: false,
  })
  const [activePrediction, setActivePrediction] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [price, setPrice] = useState<{ value: number; changePct: number } | null>(null)

  // Fetch candles on asset or period change
  useEffect(() => {
    if (!asset) return
    setLoading(true)
    setCandles([])
    setActivePrediction(null)
    fetchHistorical(asset.ticker, period).then(data => {
      setCandles(data)
      setLoading(false)
    })
  }, [asset?.ticker, period])

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

  const sma20vals = useMemo(() => activeOverlays.sma20 ? sma(closes, 20) : undefined, [closes, activeOverlays.sma20])
  const sma50vals = useMemo(() => activeOverlays.sma50 ? sma(closes, 50) : undefined, [closes, activeOverlays.sma50])
  const ema20vals = useMemo(() => activeOverlays.ema20 ? ema(closes, 20) : undefined, [closes, activeOverlays.ema20])
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
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
              {formatPrice(price.value, asset.currency)}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: price.changePct >= 0 ? 'var(--success)' : 'var(--danger)',
            }}>
              {price.changePct >= 0 ? '+' : ''}{price.changePct.toFixed(2)}%
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
            <div className="panel" style={{ padding: 12, height: 420 }}>
              <CandleChart
                candles={candles}
                period={period}
                onPeriodChange={setPeriod}
                chartType={chartType}
                onChartTypeChange={setChartType}
                showVolume={activeOverlays.volume}
                prediction={activePrediction}
                sma20={sma20vals}
                sma50={sma50vals}
                ema20={ema20vals}
                bollingerUpper={bollVals?.upper}
                bollingerLower={bollVals?.lower}
                bollingerMiddle={bollVals?.middle}
              />
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

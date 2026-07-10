import { useState } from 'react'
import type { Candle } from '../../types/finance'
import type { PredictionResult } from '../../engine/predictionEngine'
import { linearPrediction, emaPrediction, monteCarloPrediction, fibonacciPrediction } from '../../engine/predictionEngine'

type ModelKey = 'none' | 'linear' | 'ema' | 'montecarlo' | 'fibonacci'

interface Props {
  candles: Candle[]
  onPredictionChange: (result: PredictionResult | null) => void
  activePrediction: PredictionResult | null
}

const MODELS: Array<{ key: ModelKey; label: string; desc: string }> = [
  { key: 'none', label: 'Aucune', desc: '' },
  { key: 'linear', label: 'Régression', desc: 'Extrapolation linéaire de tendance' },
  { key: 'ema', label: 'EMA', desc: 'Projection basée sur la pente EMA20' },
  { key: 'fibonacci', label: 'Fibonacci', desc: 'Retracements & extensions du dernier swing — supports/résistances projetés' },
  { key: 'montecarlo', label: 'Monte-Carlo', desc: 'GBM — P10/P50/P90 sur 200 trajectoires' },
]

export function PredictionOverlay({ candles, onPredictionChange, activePrediction }: Props) {
  const activeKey: ModelKey = activePrediction?.model ?? 'none'
  const [fibLookback, setFibLookback] = useState(90)

  function selectModel(key: ModelKey, lookback = fibLookback) {
    if (candles.length < 30) return
    if (key === 'none') {
      onPredictionChange(null)
      return
    }
    let result: PredictionResult
    if (key === 'linear') result = linearPrediction(candles)
    else if (key === 'ema') result = emaPrediction(candles)
    else if (key === 'fibonacci') result = fibonacciPrediction(candles, 30, lookback)
    else result = monteCarloPrediction(candles)
    onPredictionChange(result)
  }

  const p30 = activePrediction?.points[activePrediction.points.length - 1] ?? null

  return (
    <div className="panel" style={{ padding: '10px 12px' }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Prédiction J+30</div>

      {/* Boutons radio modèle */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        {MODELS.map(m => (
          <button
            key={m.key}
            onClick={() => selectModel(m.key)}
            title={m.desc}
            style={{
              padding: '3px 9px',
              fontSize: 11,
              fontWeight: activeKey === m.key ? 600 : 400,
              background: activeKey === m.key ? 'var(--primary)' : 'transparent',
              color: activeKey === m.key ? '#fff' : 'var(--ink-subtle)',
              border: activeKey === m.key ? 'none' : '1px solid var(--hairline)',
              borderRadius: 'var(--r-sm)',
              cursor: candles.length < 30 ? 'not-allowed' : 'pointer',
              opacity: candles.length < 30 ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Paramètre + niveaux Fibonacci */}
      {activeKey === 'fibonacci' && activePrediction?.levels && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
            <span style={{ color: 'var(--ink-subtle)' }}>Fenêtre de swing (bougies)</span>
            <input
              type="number"
              min={20}
              max={500}
              value={fibLookback}
              onChange={e => {
                const v = Math.max(20, Math.min(500, Number(e.target.value) || 90))
                setFibLookback(v)
                selectModel('fibonacci', v)
              }}
              style={{
                width: 58, background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
                borderRadius: 'var(--r-sm)', padding: '3px 6px', fontSize: 11,
                color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font-mono)', textAlign: 'right',
              }}
            />
          </div>
          {activePrediction.swing && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--ink-subtle)' }}>
                Swing {activePrediction.swing.direction === 'up' ? 'haussier ↗' : 'baissier ↘'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>
                {activePrediction.swing.low.toFixed(2)} → {activePrediction.swing.high.toFixed(2)}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 168, overflowY: 'auto' }}>
            {activePrediction.levels.map(lvl => (
              <div key={`${lvl.kind}-${lvl.ratio}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: lvl.kind === 'retracement' ? 'var(--gold)' : 'var(--primary-hover)' }}>
                  {lvl.kind === 'retracement' ? 'Ret.' : 'Ext.'} {lvl.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{lvl.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Résultat J+30 */}
      {activePrediction && p30 && activeKey !== 'fibonacci' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
          {/* Confiance */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: 'var(--ink-subtle)' }}>Confiance estimée</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
                {Math.round(activePrediction.confidence * 100)}%
              </span>
            </div>
            <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 2 }}>
              <div style={{
                height: '100%', width: `${activePrediction.confidence * 100}%`,
                background: activePrediction.confidence > 0.5 ? 'var(--success)' : 'var(--primary)',
                borderRadius: 2, transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {/* Prix médian J+30 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--ink-subtle)' }}>Prix médian J+30</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--ink)' }}>
              {p30.value.toFixed(2)}
            </span>
          </div>

          {/* Intervalle de confiance */}
          {p30.lower != null && p30.upper != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--ink-subtle)' }}>Intervalle 95%</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>
                [{p30.lower.toFixed(2)} — {p30.upper.toFixed(2)}]
              </span>
            </div>
          )}
        </div>
      )}

      {/* Avertissement */}
      <div style={{
        padding: '6px 8px', borderRadius: 'var(--r-sm)',
        background: 'rgba(235,87,87,0.08)', border: '1px solid rgba(235,87,87,0.2)',
        fontSize: 10, color: 'var(--ink-subtle)', lineHeight: 1.4,
      }}>
        ⚠️ Ces modèles sont indicatifs. Aucune prédiction financière n'est fiable à court terme.
      </div>
    </div>
  )
}

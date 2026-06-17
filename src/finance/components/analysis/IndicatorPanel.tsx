import { useMemo, useState } from 'react'
import type { Candle } from '../../types/finance'
import {
  sma, ema, rsi as calcRsi, macd as calcMacd, bollinger, atr as calcAtr, obv as calcObv,
  lastValue, annualizedVolatility,
} from '../../services/indicatorsService'

export interface ActiveOverlays {
  sma20: boolean
  sma50: boolean
  ema20: boolean
  bollinger: boolean
  volume: boolean
}

interface Props {
  candles: Candle[]
  onOverlaysChange: (overlays: ActiveOverlays) => void
}

function Toggle({ active, onChange, color, label }: { active: boolean; onChange: () => void; color: string; label: string }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer', userSelect: 'none' }}
      onClick={onChange}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 10, height: 2, background: color, borderRadius: 1, display: 'inline-block' }} />
        <span style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>{label}</span>
      </div>
      <div
        style={{
          width: 28, height: 14, borderRadius: 7,
          background: active ? 'var(--primary)' : 'var(--hairline)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: active ? 14 : 2, width: 10, height: 10,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}

function ValueBadge({ label, value, unit = '' }: { label: string; value: number | null; unit?: string }) {
  if (value == null) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
      <span style={{ color: 'var(--ink-subtle)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
        {value.toFixed(2)}{unit}
      </span>
    </div>
  )
}

export function IndicatorPanel({ candles, onOverlaysChange }: Props) {
  const [overlays, setOverlays] = useState<ActiveOverlays>({
    sma20: false, sma50: false, ema20: false, bollinger: false, volume: false,
  })

  function toggleOverlay(key: keyof ActiveOverlays) {
    const next = { ...overlays, [key]: !overlays[key] }
    setOverlays(next)
    onOverlaysChange(next)
  }

  const closes = useMemo(() => candles.map(c => c.close), [candles])

  const sma20vals = useMemo(() => sma(closes, 20), [closes])
  const sma50vals = useMemo(() => sma(closes, 50), [closes])
  const ema20vals = useMemo(() => ema(closes, 20), [closes])
  const bollVals = useMemo(() => bollinger(closes, 20, 2), [closes])
  const rsiVals = useMemo(() => calcRsi(closes, 14), [closes])
  const macdVals = useMemo(() => calcMacd(closes), [closes])
  const atrVals = useMemo(() => calcAtr(candles, 14), [candles])
  const obvVals = useMemo(() => calcObv(candles), [candles])
  const vol = useMemo(() => annualizedVolatility(closes.slice(-60)), [closes])

  const curSma20 = lastValue(sma20vals)
  const curSma50 = lastValue(sma50vals)
  const curEma20 = lastValue(ema20vals)
  const curBollUpper = lastValue(bollVals.upper)
  const curBollLower = lastValue(bollVals.lower)
  const curRsi = lastValue(rsiVals)
  const curMacd = lastValue(macdVals.macd)
  const curSignal = lastValue(macdVals.signal)
  const curHistogram = lastValue(macdVals.histogram)
  const curAtr = lastValue(atrVals)
  const curPrice = closes[closes.length - 1] ?? 0
  const curObv = obvVals[obvVals.length - 1] ?? 0
  const prevObv = obvVals[obvVals.length - 6] ?? curObv

  // RSI signal
  const rsiSignal = curRsi == null
    ? null
    : curRsi < 30 ? { label: 'Survente', color: 'var(--success)' }
    : curRsi > 70 ? { label: 'Surachat', color: 'var(--danger)' }
    : { label: 'Neutre', color: 'var(--primary)' }

  // MACD signal
  const macdBullish = curMacd != null && curSignal != null && curMacd > curSignal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>

      {/* Tendance */}
      <div className="panel" style={{ padding: '10px 12px' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Tendance</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Toggle active={overlays.sma20} onChange={() => toggleOverlay('sma20')} color="#f59e0b" label="SMA 20" />
          <ValueBadge label="" value={curSma20} />
          <Toggle active={overlays.sma50} onChange={() => toggleOverlay('sma50')} color="#8b5cf6" label="SMA 50" />
          <ValueBadge label="" value={curSma50} />
          <Toggle active={overlays.ema20} onChange={() => toggleOverlay('ema20')} color="#06b6d4" label="EMA 20" />
          <ValueBadge label="" value={curEma20} />
          <Toggle active={overlays.bollinger} onChange={() => toggleOverlay('bollinger')} color="rgba(94,106,210,0.7)" label="Bollinger (20,2)" />
          {curBollUpper != null && curBollLower != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-subtle)', paddingLeft: 16 }}>
              <span>↑ {curBollUpper.toFixed(2)}</span>
              <span>↓ {curBollLower.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Momentum */}
      <div className="panel" style={{ padding: '10px 12px' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Momentum</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* RSI */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: 'var(--ink-secondary)' }}>RSI 14</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {rsiSignal && (
                  <span style={{ fontSize: 10, color: rsiSignal.color, fontWeight: 600 }}>{rsiSignal.label}</span>
                )}
                <span style={{ fontFamily: 'var(--font-mono)', color: rsiSignal?.color ?? 'var(--ink)', fontWeight: 700 }}>
                  {curRsi != null ? curRsi.toFixed(1) : '—'}
                </span>
              </div>
            </div>
            {curRsi != null && (
              <div style={{ position: 'relative', height: 6, background: 'var(--hairline)', borderRadius: 3 }}>
                {/* Zones */}
                <div style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '100%', background: 'rgba(76,183,130,0.15)', borderRadius: '3px 0 0 3px' }} />
                <div style={{ position: 'absolute', right: 0, top: 0, width: '30%', height: '100%', background: 'rgba(235,87,87,0.15)', borderRadius: '0 3px 3px 0' }} />
                {/* Curseur */}
                <div style={{
                  position: 'absolute', top: -2, width: 10, height: 10,
                  borderRadius: '50%', background: rsiSignal?.color ?? 'var(--primary)',
                  left: `calc(${Math.min(100, curRsi)}% - 5px)`, transition: 'left 0.3s',
                  boxShadow: '0 0 0 2px var(--canvas)',
                }} />
              </div>
            )}
          </div>

          {/* MACD */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ color: 'var(--ink-secondary)' }}>MACD (12,26,9)</span>
              <span style={{ fontSize: 14 }}>{macdBullish ? '▲' : '▽'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--ink-subtle)' }}>
                MACD <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{curMacd?.toFixed(3) ?? '—'}</span>
              </span>
              <span style={{ color: 'var(--ink-subtle)' }}>
                Signal <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{curSignal?.toFixed(3) ?? '—'}</span>
              </span>
            </div>
            {curHistogram != null && (
              <div style={{
                marginTop: 4, fontSize: 11, fontFamily: 'var(--font-mono)',
                color: curHistogram >= 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                Hist. {curHistogram >= 0 ? '+' : ''}{curHistogram.toFixed(3)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Volatilité */}
      <div className="panel" style={{ padding: '10px 12px' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Volatilité</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--ink-subtle)' }}>ATR 14</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {curAtr != null ? curAtr.toFixed(2) : '—'}
              {curAtr != null && curPrice > 0 && (
                <span style={{ color: 'var(--ink-subtle)', marginLeft: 4 }}>
                  ({((curAtr / curPrice) * 100).toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--ink-subtle)' }}>Vol. annualisée</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {(vol * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Volume */}
      <div className="panel" style={{ padding: '10px 12px' }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Volume</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Toggle active={overlays.volume} onChange={() => toggleOverlay('volume')} color="rgba(94,106,210,0.5)" label="Histogramme volume" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--ink-subtle)' }}>OBV tendance</span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontWeight: 600,
              color: curObv > prevObv ? 'var(--success)' : 'var(--danger)',
            }}>
              {curObv > prevObv ? '▲ Haussier' : '▽ Baissier'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

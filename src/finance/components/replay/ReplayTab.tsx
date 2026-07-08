import { useEffect, useMemo, useRef, useState } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'
import { FinanceSelect } from '../ui/FinanceSelect'
import { FINANCE_ASSETS } from '../../data/financeAssets'
import { fetchHistorical } from '../../services/priceService'
import {
  createReplaySession, advanceReplayBar, placeReplayOrder, cancelReplayOrder,
  currentReplayCandle, isReplayFinished, replayEquity,
  type ReplaySession,
} from '../../engine/replayEngine'
import { computePerformanceStats } from '../../engine/performanceEngine'
import { formatEur, formatPct } from '../../../utils/format'
import type { Candle, HistoricalPeriod, Order, OrderSide } from '../../types/finance'

const REPLAY_PERIODS: { value: HistoricalPeriod; label: string }[] = [
  { value: '1M', label: '1 mois (journalier)' },
  { value: '3M', label: '3 mois (journalier)' },
  { value: '6M', label: '6 mois (journalier)' },
  { value: '1Y', label: '1 an (hebdo)' },
  { value: '5Y', label: '5 ans (mensuel)' },
]

const SPEEDS = [
  { value: '2000', label: '0.5×' },
  { value: '1000', label: '1×' },
  { value: '500', label: '2×' },
  { value: '200', label: '5×' },
]

const MIN_WARMUP = 10 // bougies visibles minimum au départ

type ReplayOrderType = 'market' | 'limit' | 'stop_loss' | 'trailing_stop'

function genId() {
  return `rpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
  borderRadius: 'var(--r)', padding: '6px 9px', fontSize: 12,
  fontFamily: 'var(--font-mono)', color: 'var(--ink)', outline: 'none',
}

// ---- Mini chart chandeliers dédié au replay (mise à jour incrémentale) ----

function ReplayChart({ candles }: { candles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<any>(null)
  const lastCountRef = useRef(0)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
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
      timeScale: { borderColor: 'rgba(255,255,255,0.1)', timeVisible: true, secondsVisible: false },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#4cb782', downColor: '#eb5757',
      borderUpColor: '#4cb782', borderDownColor: '#eb5757',
      wickUpColor: '#4cb782', wickDownColor: '#eb5757',
    })
    chartRef.current = chart
    seriesRef.current = series
    lastCountRef.current = 0

    const ro = new ResizeObserver(() => {
      if (container && chartRef.current) {
        chartRef.current.resize(container.clientWidth, container.clientHeight)
      }
    })
    ro.observe(container)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const toLw = (c: Candle) => ({
      time: Math.floor(c.time / 1000) as unknown as import('lightweight-charts').Time,
      open: c.open, high: c.high, low: c.low, close: c.close,
    })
    if (candles.length === lastCountRef.current + 1 && lastCountRef.current > 0) {
      // Avancement d'une bougie : mise à jour incrémentale (fluide)
      series.update(toLw(candles[candles.length - 1]))
      chartRef.current?.timeScale().scrollToRealTime()
    } else {
      series.setData(candles.map(toLw))
      chartRef.current?.timeScale().fitContent()
    }
    lastCountRef.current = candles.length
  }, [candles])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

// ---- Onglet Replay ----

export default function ReplayTab() {
  // Configuration
  const [assetSearch, setAssetSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [period, setPeriod] = useState<HistoricalPeriod>('6M')
  const [allCandles, setAllCandles] = useState<Candle[]>([])
  const [loadingCandles, setLoadingCandles] = useState(false)
  const [startIndex, setStartIndex] = useState(MIN_WARMUP)
  const [capital, setCapital] = useState('10000')
  const [feeRate, setFeeRate] = useState('0.1')
  const [slippagePct, setSlippagePct] = useState('0.05')

  // Session
  const [session, setSession] = useState<ReplaySession | null>(null)
  const [playing, setPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState('1000')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Ticket d'ordre replay
  const [side, setSide] = useState<OrderSide>('buy')
  const [orderType, setOrderType] = useState<ReplayOrderType>('market')
  const [quantity, setQuantity] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [trailingPct, setTrailingPct] = useState('2')
  const [orderMsg, setOrderMsg] = useState<{ text: string; error: boolean } | null>(null)

  const filteredAssets = useMemo(() => {
    const q = assetSearch.toLowerCase()
    return FINANCE_ASSETS.filter(a =>
      a.name.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q)
    ).slice(0, 15)
  }, [assetSearch])

  const selectedAsset = FINANCE_ASSETS.find(a => a.id === selectedAssetId)

  // Charge l'historique quand actif/période changent
  useEffect(() => {
    if (!selectedAsset) { setAllCandles([]); return }
    setLoadingCandles(true)
    fetchHistorical(selectedAsset.ticker, period).then(candles => {
      setAllCandles(candles)
      setStartIndex(Math.min(MIN_WARMUP, Math.max(0, candles.length - 2)))
      setLoadingCandles(false)
    })
  }, [selectedAsset?.ticker, period])

  // Boucle play
  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (!playing || !session) return
    intervalRef.current = setInterval(() => {
      setSession(s => {
        if (!s) return s
        const next = advanceReplayBar(s)
        if (isReplayFinished(next)) setPlaying(false)
        return next
      })
    }, Number(speedMs))
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    }
  }, [playing, speedMs, session != null])

  function startReplay() {
    if (!selectedAsset || allCandles.length < MIN_WARMUP + 5) return
    setSession(createReplaySession({
      assetId: selectedAsset.id,
      ticker: selectedAsset.ticker,
      assetName: selectedAsset.name,
      currency: selectedAsset.currency,
      candles: allCandles,
      startIndex,
      initialCapital: parseFloat(capital) || 10000,
      commissionMode: 'percent',
      feeRate: parseFloat(feeRate) || 0,
      commissionFlat: 0,
      slippagePct: parseFloat(slippagePct) || 0,
    }))
    setPlaying(false)
    setOrderMsg(null)
  }

  function stopReplay() {
    setPlaying(false)
    setSession(null)
  }

  function stepForward() {
    setSession(s => (s ? advanceReplayBar(s) : s))
  }

  function placeOrder() {
    if (!session) return
    const qty = parseFloat(quantity) || 0
    if (qty <= 0) return
    const px = parseFloat(priceInput) || 0
    const tp = parseFloat(trailingPct) || 0

    if (orderType !== 'market' && orderType !== 'trailing_stop' && px <= 0) {
      setOrderMsg({ text: 'Prix requis', error: true }); return
    }
    if (orderType === 'trailing_stop' && tp <= 0) {
      setOrderMsg({ text: 'Distance trailing requise', error: true }); return
    }

    const candle = currentReplayCandle(session)
    const order: Order = {
      id: genId(),
      assetId: session.assetId,
      ticker: session.ticker,
      side,
      type: orderType,
      quantity: qty,
      limitPrice: orderType === 'limit' ? px : undefined,
      stopPrice: orderType === 'stop_loss' ? px : undefined,
      trailingPct: orderType === 'trailing_stop' ? tp : undefined,
      status: orderType === 'market' ? 'filled' : 'pending',
      createdAt: candle?.time ?? Date.now(),
    }
    const result = placeReplayOrder(session, order)
    if (result.error) {
      setOrderMsg({ text: result.error, error: true })
    } else {
      setSession(result.session)
      setOrderMsg({
        text: orderType === 'market'
          ? `${side === 'buy' ? 'Achat' : 'Vente'} ${qty} exécuté`
          : 'Ordre en attente placé',
        error: false,
      })
      setQuantity('')
    }
    setTimeout(() => setOrderMsg(null), 3000)
  }

  // ---- Écran de configuration ----
  if (!session) {
    const maxStart = Math.max(MIN_WARMUP, allCandles.length - 5)
    const startDate = allCandles[startIndex] ? new Date(allCandles[startIndex].time).toLocaleDateString('fr-FR') : '—'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>Bar Replay</h2>
          <p className="caption">
            Choisissez un point dans l'historique et tradez le marché bougie par bougie, comme en live —
            sans connaître la suite. Session virtuelle indépendante de vos comptes paper.
          </p>
        </div>

        <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560 }}>
          {/* Actif */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Actif</span>
            <input
              type="text"
              placeholder="Rechercher un actif…"
              value={selectedAsset ? selectedAsset.name : assetSearch}
              onChange={e => { setAssetSearch(e.target.value); setSelectedAssetId('') }}
              onFocus={() => { if (selectedAsset) setAssetSearch('') }}
              style={{ ...inputStyle, fontFamily: 'inherit', fontSize: 13 }}
            />
            {assetSearch && !selectedAsset && (
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                borderRadius: 'var(--r)', maxHeight: 160, overflowY: 'auto',
              }}>
                {filteredAssets.map(a => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedAssetId(a.id); setAssetSearch('') }}
                    style={{
                      display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink)',
                    }}
                  >
                    {a.name} <span className="caption">{a.ticker}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Période */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="caption" style={{ fontWeight: 600 }}>Historique</span>
            <FinanceSelect
              value={period}
              onChange={v => setPeriod(v as HistoricalPeriod)}
              options={REPLAY_PERIODS.map(p => ({ value: p.value, label: p.label }))}
            />
          </div>

          {/* Point de départ */}
          {allCandles.length > MIN_WARMUP + 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="caption" style={{ fontWeight: 600 }}>
                Point de départ — {startDate} ({startIndex + 1}/{allCandles.length} bougies, {allCandles.length - 1 - startIndex} à dérouler)
              </span>
              <input
                type="range"
                min={MIN_WARMUP}
                max={maxStart}
                value={Math.min(startIndex, maxStart)}
                onChange={e => setStartIndex(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>
          )}
          {loadingCandles && <span className="caption">Chargement de l'historique…</span>}
          {!loadingCandles && selectedAsset && allCandles.length > 0 && allCandles.length <= MIN_WARMUP + 5 && (
            <span className="caption" style={{ color: 'var(--danger)' }}>
              Historique trop court pour cette période — choisissez une période plus longue.
            </span>
          )}

          {/* Capital + frictions */}
          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="caption" style={{ fontWeight: 600 }}>Capital virtuel</span>
              <input type="number" value={capital} onChange={e => setCapital(e.target.value)} min={100} style={{ ...inputStyle, width: 110 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="caption" style={{ fontWeight: 600 }}>Commission (%)</span>
              <input type="number" value={feeRate} onChange={e => setFeeRate(e.target.value)} min={0} step={0.05} style={{ ...inputStyle, width: 90 }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className="caption" style={{ fontWeight: 600 }}>Spread simulé (%)</span>
              <input type="number" value={slippagePct} onChange={e => setSlippagePct(e.target.value)} min={0} step={0.01} style={{ ...inputStyle, width: 90 }} />
            </label>
          </div>

          <button
            className="btn btn-primary"
            onClick={startReplay}
            disabled={!selectedAsset || loadingCandles || allCandles.length <= MIN_WARMUP + 5}
            style={{ alignSelf: 'flex-start' }}
          >
            ▶ Démarrer le replay
          </button>
        </div>
      </div>
    )
  }

  // ---- Session active ----
  const visible = session.candles.slice(0, session.currentIndex + 1)
  const candle = currentReplayCandle(session)
  const finished = isReplayFinished(session)
  const equity = replayEquity(session)
  const sessionPnL = equity - session.account.initialCapital
  const position = session.positions[0] ?? null
  const stats = computePerformanceStats(session.trades, session.account.initialCapital)
  const progress = ((session.currentIndex - session.startIndex) / Math.max(1, session.candles.length - 1 - session.startIndex)) * 100
  const pnlColor = (v: number) => v >= 0 ? 'var(--success)' : 'var(--danger)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header session */}
      <div className="row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="title" style={{ fontSize: 16, marginBottom: 2 }}>
            Replay — {session.assetName}
            <span className="caption" style={{ marginLeft: 8, fontFamily: 'var(--font-mono)' }}>{session.ticker}</span>
          </h2>
          <p className="caption">
            {candle ? new Date(candle.time).toLocaleDateString('fr-FR') : ''} · bougie {session.currentIndex + 1}/{session.candles.length}
          </p>
        </div>
        <div className="row" style={{ marginLeft: 'auto', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span className="caption">Equity </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>{formatEur(equity)}</span>
          </div>
          <div>
            <span className="caption">P&L session </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: pnlColor(sessionPnL) }}>
              {formatEur(sessionPnL)} ({formatPct(session.account.initialCapital > 0 ? (sessionPnL / session.account.initialCapital) * 100 : 0)})
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={stopReplay} style={{ fontSize: 12 }}>
            ✕ Quitter
          </button>
        </div>
      </div>

      {/* Contrôles */}
      <div className="panel row" style={{ padding: '10px 14px', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className={`btn btn-sm ${playing ? '' : 'btn-primary'}`}
          onClick={() => setPlaying(p => !p)}
          disabled={finished}
          style={{ minWidth: 84 }}
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={stepForward} disabled={finished || playing}>
          ⏭ +1 bougie
        </button>
        <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="caption">Vitesse</span>
          <FinanceSelect
            value={speedMs}
            onChange={setSpeedMs}
            options={SPEEDS}
            style={{ width: 80 }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: finished ? 'var(--success)' : 'var(--primary)', borderRadius: 2, transition: 'width 0.2s' }} />
          </div>
        </div>
        {finished && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: 'var(--success)', color: 'white', fontWeight: 700 }}>
            TERMINÉ
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Chart */}
        <div className="panel" style={{ flex: '7 1 480px', minWidth: 0, height: 400, padding: 10 }}>
          <ReplayChart candles={visible} />
        </div>

        {/* Ticket d'ordre */}
        <div style={{ flex: '3 1 240px', minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="title" style={{ fontSize: 13, margin: 0 }}>Ordre</h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                {candle?.close.toFixed(2)}
              </span>
            </div>

            <div className="row" style={{ gap: 0, borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
              {(['buy', 'sell'] as OrderSide[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  style={{
                    flex: 1, padding: '6px 0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12,
                    background: side === s ? (s === 'buy' ? 'var(--success)' : 'var(--danger)') : 'var(--bg-elevated)',
                    color: side === s ? 'white' : 'var(--ink-subtle)',
                  }}
                >
                  {s === 'buy' ? 'ACHAT' : 'VENTE'}
                </button>
              ))}
            </div>

            <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
              {([['market', 'Market'], ['limit', 'Limite'], ['stop_loss', 'Stop'], ['trailing_stop', 'Trailing']] as const).map(([t, label]) => (
                <button
                  key={t}
                  onClick={() => setOrderType(t)}
                  className={`btn btn-sm ${orderType === t ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 10 }}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="Quantité"
              min={0}
              style={inputStyle}
            />
            {(orderType === 'limit' || orderType === 'stop_loss') && (
              <input
                type="number"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value)}
                placeholder={orderType === 'limit' ? 'Prix limite' : 'Prix de stop'}
                style={inputStyle}
              />
            )}
            {orderType === 'trailing_stop' && (
              <input
                type="number"
                value={trailingPct}
                onChange={e => setTrailingPct(e.target.value)}
                placeholder="Distance %"
                min={0.1}
                step={0.1}
                style={inputStyle}
              />
            )}

            {orderMsg && (
              <p style={{ fontSize: 11, color: orderMsg.error ? 'var(--danger)' : 'var(--success)', margin: 0 }}>
                {orderMsg.text}
              </p>
            )}

            <button
              className={`btn btn-sm ${side === 'buy' ? 'btn-primary' : ''}`}
              style={side === 'sell' ? { background: 'var(--danger)', color: 'white' } : {}}
              onClick={placeOrder}
              disabled={finished || (parseFloat(quantity) || 0) <= 0}
            >
              {side === 'buy' ? 'Acheter' : 'Vendre'}
            </button>
            {position && side === 'sell' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setQuantity(String(position.quantity))}
              >
                Tout vendre ({position.quantity})
              </button>
            )}
          </div>

          {/* Position + cash */}
          <div className="panel" style={{ padding: 14, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="caption">Cash</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatEur(session.account.cashBalance)}</span>
            </div>
            {position ? (
              <>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="caption">Position</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{position.quantity} @ {position.avgEntryPrice.toFixed(2)}</span>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="caption">P&L latent</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: pnlColor(position.unrealizedPnL), fontWeight: 600 }}>
                    {formatEur(position.unrealizedPnL)} ({formatPct(position.unrealizedPnLPct)})
                  </span>
                </div>
              </>
            ) : (
              <span className="caption" style={{ fontStyle: 'italic' }}>Flat — aucune position</span>
            )}
          </div>

          {/* Ordres en attente */}
          {session.pendingOrders.length > 0 && (
            <div className="panel" style={{ padding: 14, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span className="caption" style={{ fontWeight: 600 }}>Ordres en attente</span>
              {session.pendingOrders.map(o => (
                <div key={o.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11 }}>
                    <span style={{ color: o.side === 'buy' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {o.side === 'buy' ? 'A' : 'V'}
                    </span>
                    {' '}{o.quantity} × {o.type === 'limit' ? `lim ${o.limitPrice?.toFixed(2)}` : o.type === 'stop_loss' ? `stop ${o.stopPrice?.toFixed(2)}` : `trail ${o.trailingPct}% (${o.trailingStopPrice?.toFixed(2) ?? '—'})`}
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 10, padding: '1px 6px' }}
                    onClick={() => setSession(s => (s ? cancelReplayOrder(s, o.id) : s))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trades de session + stats */}
      {session.trades.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row" style={{ padding: '10px 14px', borderBottom: '1px solid var(--hairline)', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <h3 className="title" style={{ fontSize: 13, margin: 0, flex: 1 }}>Trades de la session ({session.trades.length})</h3>
            <span className="caption">Win rate <b style={{ color: stats.winRate >= 0.5 ? 'var(--success)' : 'var(--danger)' }}>{formatPct(stats.winRate * 100)}</b></span>
            <span className="caption">Profit factor <b>{isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞'}</b></span>
            <span className="caption">Expectancy <b style={{ color: pnlColor(stats.expectancy) }}>{formatEur(stats.expectancy)}</b></span>
            <span className="caption">Max DD <b style={{ color: 'var(--danger)' }}>−{formatPct(stats.maxDrawdownPct * 100)}</b></span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                {['Sortie', 'Qté', 'Entrée', 'Sortie', 'P&L net', 'Frais'].map((h, i) => (
                  <th key={i} className="caption" style={{ padding: '7px 12px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...session.trades].reverse().map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                  <td style={{ padding: '7px 12px', color: 'var(--ink-subtle)' }}>
                    {new Date(t.closedAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.quantity}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.entryPrice.toFixed(2)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.exitPrice.toFixed(2)}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: pnlColor(t.realizedPnL) }}>
                    {formatEur(t.realizedPnL)}
                  </td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-subtle)' }}>
                    {t.fees.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

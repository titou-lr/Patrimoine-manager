import { useEffect, useMemo, useRef, useState } from 'react'
import { LessonShell } from './LessonShell'
import { EduCandleChart } from './markets/EduCandleChart'
import { EduIndicatorPanel } from './markets/EduIndicatorPanel'
import { rsi, atr, sma, lastValue } from '../../../finance/services/indicatorsService'
import { PATRIMCORP_EXERCISE, EXERCISE_CONTEXT_LENGTH, EXERCISE_SUPPORT_INDEX } from '../../data/patrimcorpData'
import { findBearishDivergence } from '../../data/marketAnnotations'

const TOTAL_LEN = PATRIMCORP_EXERCISE.length
const STARTING_CASH = 10000
const GUIDED_END = EXERCISE_CONTEXT_LENGTH + 25  // bougies 30-54 = phase semi-guidée
const SPEED_MS = { lent: 2000, normal: 900, rapide: 400 }

type Phase = 'revision' | 'observation' | 'guided' | 'autonomous' | 'analysis' | 'result'
type Speed = 'lent' | 'normal' | 'rapide'

interface Position { qty: number; avgPrice: number }
interface ExecutedOrder { id: string; type: 'achat' | 'vente' | 'stop'; index: number; price: number; qty: number }

interface GuidedSuggestion {
  id: string
  question: string
  options: { label: string; feedback: string; goodChoice: boolean }[]
}

// ── Fiche de révision ────────────────────────────────────────────────────────

function RevisionSheet() {
  return (
    <div className="col" style={{ gap: 10 }}>
      {[
        ['Chandeliers', "Corps = open→close. Mèches = rejets. Volume fort confirme un mouvement, volume faible le fragilise."],
        ['Tendance & S/R', 'Haussière = sommets ET creux croissants. Un support cassé devient résistance. Méfie-toi des fakeouts — attends la clôture.'],
        ['RSI', '<30 survente, >70 surachat. Une divergence (prix ↑, RSI ↓) signale un essoufflement. Jamais seul.'],
        ['MACD', 'Croisement haussier = momentum qui bascule à la hausse. Histogramme qui rétrécit = essoufflement avant le prix.'],
        ['Bollinger & ATR', 'Bandes resserrées = squeeze, énergie qui va se libérer (direction inconnue). Stop raisonnable ≈ 1,5× ATR sous l\'entrée.'],
      ].map(([title, desc]) => (
        <div key={title} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{title}</div>
          <div className="caption" style={{ lineHeight: 1.55 }}>{desc}</div>
        </div>
      ))}
    </div>
  )
}

// ── Analyse d'un ordre exécuté ───────────────────────────────────────────────

function analyzeOrder(
  order: ExecutedOrder,
  closes: number[],
  rsiVals: (number | null)[],
  atrVals: (number | null)[],
  sma20Vals: (number | null)[],
  stopDistance: number | null
): string[] {
  const lines: string[] = []
  const idx = order.index
  const r = rsiVals[idx]
  const a = atrVals[idx]
  const s20 = sma20Vals[idx]
  const near = Math.abs(closes[idx] - PATRIMCORP_EXERCISE[EXERCISE_SUPPORT_INDEX].low) <= 3.5

  if (order.type !== 'vente') {
    if (r != null && r < 35) lines.push(`✅ RSI en zone de survente (${r.toFixed(0)}) au moment de l'achat — entrée à contre-courant cohérente.`)
    else if (near) lines.push(`✅ Achat réalisé près de la zone de support identifiée (~80 €) — bon emplacement technique.`)
    else if (r != null && r > 65) lines.push(`⚠️ RSI déjà élevé (${r.toFixed(0)}) à l'achat — le mouvement était bien avancé, l'entrée arrive tard.`)
    else lines.push(`ℹ️ Aucun signal fort (RSI neutre à ${r != null ? r.toFixed(0) : '—'}, pas de niveau clé tout proche) — entrée plutôt discrétionnaire.`)
  } else {
    if (r != null && r > 65) lines.push(`✅ RSI en zone de surachat (${r.toFixed(0)}) à la vente — bonne prise de profit avant un possible essoufflement.`)
    else if (r != null && r < 35) lines.push(`⚠️ Vente alors que le RSI est déjà bas (${r.toFixed(0)}) — possible sortie sur un creux plutôt qu'un sommet.`)
    else lines.push(`ℹ️ Vente sans signal fort particulier (RSI à ${r != null ? r.toFixed(0) : '—'}).`)
  }

  if (order.type === 'stop' && stopDistance != null && a != null) {
    const ratio = stopDistance / a
    if (ratio >= 1.1 && ratio <= 2.2) lines.push(`✅ Stop bien dimensionné — environ ${ratio.toFixed(1)}× l'ATR (${a.toFixed(2)} €), cohérent avec la respiration normale du titre.`)
    else if (ratio < 1.1) lines.push(`⚠️ Stop assez serré par rapport à l'ATR (${ratio.toFixed(1)}× ATR) — risque d'être sorti par le simple bruit du marché.`)
    else lines.push(`⚠️ Stop large par rapport à l'ATR (${ratio.toFixed(1)}× ATR) — risque pris plus important que nécessaire.`)
  }

  const divergence = findBearishDivergence(closes.slice(0, idx + 1), rsiVals.slice(0, idx + 1))
  if (divergence && idx - divergence.peak2 <= 6 && order.type !== 'vente') {
    lines.push(`⚠️ Une divergence baissière RSI/prix précédait ce point (sommet à l'indice ${divergence.peak2}) — un signal d'essoufflement à surveiller avant d'acheter.`)
  } else {
    lines.push(`✅ Pas de divergence baissière notable juste avant cet ordre.`)
  }

  if (s20 != null) {
    const trendUp = closes[idx] > s20
    if (order.type !== 'vente') {
      lines.push(trendUp
        ? `✅ La tendance de fond (SMA20) était haussière à ce moment — contexte favorable à un achat.`
        : `⚠️ Le prix était sous sa SMA20 — la tendance de fond n'était pas clairement favorable à un achat.`)
    } else {
      lines.push(trendUp
        ? `ℹ️ La tendance de fond restait haussière (prix au-dessus de la SMA20) au moment de la vente.`
        : `✅ La tendance de fond s'était déjà dégradée (prix sous la SMA20) — sortie cohérente.`)
    }
  }

  return lines
}

// ── Suggestions semi-guidées ──────────────────────────────────────────────────

function getSuggestion(
  idx: number,
  rsiVals: (number | null)[],
  shownIds: Set<string>,
  hasPosition: boolean,
): GuidedSuggestion | null {
  const r = rsiVals[idx]
  const prev = idx > 0 ? rsiVals[idx - 1] : null

  if (!shownIds.has('rsi_drop') && r != null && r < 38) {
    return {
      id: 'rsi_drop',
      question: `RSI à ${r.toFixed(0)} — le titre entre en zone de survente. Que fais-tu ?`,
      options: [
        { label: 'Attendre le rebond', feedback: 'Sage décision. Le titre est encore en baisse — attendre une bougie de rebond confirmatoire avant d\'entrer réduit le risque.', goodChoice: true },
        { label: 'Acheter maintenant', feedback: 'Courageux. En survente le rebond est probable, mais le titre peut aller plus bas. Mieux vaut confirmer avant d\'entrer.', goodChoice: false },
        { label: 'Ne rien faire', feedback: 'Raisonnable. Surveille si le prix forme une bougie de rebond et si le RSI commence à remonter avant d\'agir.', goodChoice: true },
      ],
    }
  }

  if (!shownIds.has('rsi_rebound') && prev != null && r != null && prev < 38 && r > 42) {
    return {
      id: 'rsi_rebound',
      question: `Le RSI remonte depuis la survente (${r.toFixed(0)}). Le prix rebondit sur un support. Qu'est-ce que tu fais ?`,
      options: [
        { label: 'Acheter — signal de rebond', feedback: 'Bonne lecture. RSI qui remonte depuis la survente + rebond sur support est une configuration classique. Pense à placer un stop sous le point bas.', goodChoice: true },
        { label: 'Attendre encore', feedback: 'Prudent. Attendre une deuxième bougie haussière de confirmation est raisonnable, même si l\'entrée est moins parfaite.', goodChoice: true },
        { label: 'Vendre', feedback: 'Vendre lors d\'un rebond après une survente va à contre-courant des signaux actuels.', goodChoice: false },
      ],
    }
  }

  if (!shownIds.has('rsi_high') && r != null && r > 65 && hasPosition) {
    return {
      id: 'rsi_high',
      question: `RSI à ${r.toFixed(0)} — la hausse est forte, le surachat approche. Ta position est gagnante. Que fais-tu ?`,
      options: [
        { label: 'Prendre des profits', feedback: 'Gestion rigoureuse. Alléger en zone de surachat protège une partie des gains. La tendance peut continuer, mais le risque de correction augmente.', goodChoice: true },
        { label: 'Tenir ma position', feedback: 'Possible en forte tendance. Surveille si le RSI forme une divergence baissière avec le prix — signe d\'essoufflement.', goodChoice: true },
        { label: 'Renforcer ma position', feedback: 'Renforcer en zone de surachat augmente le risque. Si la correction arrive, ta position moyenne sera moins avantageuse.', goodChoice: false },
      ],
    }
  }

  return null
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function LessonM6LiveStrategy({
  onComplete, onBack, onGoToFinance,
}: {
  onComplete: () => void
  onBack: () => void
  onGoToFinance?: () => void
}) {
  const [phase, setPhase] = useState<Phase>('revision')
  const [showHelp, setShowHelp] = useState(false)
  const [visibleCount, setVisibleCount] = useState(EXERCISE_CONTEXT_LENGTH)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>('lent')

  const [cash, setCash] = useState(STARTING_CASH)
  const [position, setPosition] = useState<Position | null>(null)
  const [pendingStop, setPendingStop] = useState<{ price: number } | null>(null)
  const [orders, setOrders] = useState<ExecutedOrder[]>([])
  const [orderStopDistances, setOrderStopDistances] = useState<Record<string, number>>({})

  const [buyQty, setBuyQty] = useState('10')
  const [sellQty, setSellQty] = useState('10')
  const [stopPriceInput, setStopPriceInput] = useState('')

  // État phase guidée
  const [activeSuggestion, setActiveSuggestion] = useState<GuidedSuggestion | null>(null)
  const [suggestionFeedback, setSuggestionFeedback] = useState<{ text: string; good: boolean } | null>(null)
  const [shownSuggestions, setShownSuggestions] = useState<Set<string>>(new Set())
  const [guidedInteractions, setGuidedInteractions] = useState(0)

  const [scrolledToEnd, setScrolledToEnd] = useState(false)
  const analysisRef = useRef<HTMLDivElement>(null)

  const closes = useMemo(() => PATRIMCORP_EXERCISE.map(c => c.close), [])
  const rsiVals = useMemo(() => rsi(closes, 14), [closes])
  const atrVals = useMemo(() => atr(PATRIMCORP_EXERCISE, 14), [])
  const sma20Vals = useMemo(() => sma(closes, 20), [closes])

  // Indicateurs pour la phase observation (20 bougies)
  const contextCloses = useMemo(() => PATRIMCORP_EXERCISE.slice(0, EXERCISE_CONTEXT_LENGTH).map(c => c.close), [])
  const contextRsi = useMemo(() => rsi(contextCloses, 14), [contextCloses])
  const contextSma20 = useMemo(() => sma(contextCloses, 20), [contextCloses])
  const lastContextRsi = useMemo(() => lastValue(contextRsi), [contextRsi])
  const lastContextSma = useMemo(() => lastValue(contextSma20), [contextSma20])
  const lastContextPrice = contextCloses[contextCloses.length - 1] ?? 0
  const firstContextPrice = contextCloses[0] ?? 0

  // Annotations observation — point le plus haut et zone de support
  const obsMarkers = useMemo(() => {
    const context = PATRIMCORP_EXERCISE.slice(0, EXERCISE_CONTEXT_LENGTH)
    const highIdx = context.reduce((best, c, i, arr) => c.high > arr[best].high ? i : best, 0)
    const lowIdx = context.reduce((best, c, i, arr) => c.low < arr[best].low ? i : best, 0)
    return [
      { index: lowIdx, position: 'belowBar' as const, color: 'var(--success)', shape: 'circle' as const, text: 'Support ~' + context[lowIdx].low.toFixed(0) + '€' },
      { index: highIdx, position: 'aboveBar' as const, color: 'var(--danger)', shape: 'circle' as const, text: 'Résistance ?' },
    ]
  }, [])

  const visibleCandles = PATRIMCORP_EXERCISE.slice(0, visibleCount)
  const currentPrice = visibleCandles[visibleCandles.length - 1]?.close ?? closes[0]

  // ── Boucle de lecture ──────────────────────────────────────────────────────
  useEffect(() => {
    const isTrading = phase === 'guided' || phase === 'autonomous'
    if (!isTrading || !playing) return
    const limit = phase === 'guided' ? GUIDED_END : TOTAL_LEN
    if (visibleCount >= limit) { setPlaying(false); return }
    const id = setTimeout(() => setVisibleCount(c => Math.min(c + 1, limit)), SPEED_MS[speed])
    return () => clearTimeout(id)
  }, [phase, playing, visibleCount, speed])

  // ── Suggestions semi-guidées ───────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'guided' || activeSuggestion || suggestionFeedback) return
    const suggestion = getSuggestion(visibleCount - 1, rsiVals, shownSuggestions, !!position)
    if (suggestion) {
      setPlaying(false)
      setShownSuggestions(prev => new Set([...prev, suggestion.id]))
      setActiveSuggestion(suggestion)
    }
  }, [phase, visibleCount, activeSuggestion, suggestionFeedback, rsiVals, shownSuggestions, position])

  // ── Déclenchement des stops ────────────────────────────────────────────────
  const lastProcessedRef = useRef(EXERCISE_CONTEXT_LENGTH - 1)
  useEffect(() => {
    const isTrading = phase === 'guided' || phase === 'autonomous'
    if (!isTrading) return
    const idx = visibleCount - 1
    if (idx <= lastProcessedRef.current) return
    lastProcessedRef.current = idx
    const candle = PATRIMCORP_EXERCISE[idx]
    if (pendingStop && position && candle.low <= pendingStop.price) {
      const fillPrice = Math.min(pendingStop.price, candle.open)
      const qty = position.qty
      setCash(c => c + qty * fillPrice)
      const id = `o${Date.now()}`
      setOrders(o => [...o, { id, type: 'stop', index: idx, price: fillPrice, qty }])
      setOrderStopDistances(d => ({ ...d, [id]: Math.abs(position.avgPrice - pendingStop.price) }))
      setPosition(null)
      setPendingStop(null)
    }
  }, [visibleCount, phase, pendingStop, position])

  function placeBuy() {
    const qty = Math.max(1, parseInt(buyQty, 10) || 0)
    const cost = qty * currentPrice
    if (cost > cash) return
    setCash(c => c - cost)
    setPosition(p => {
      if (!p) return { qty, avgPrice: currentPrice }
      const totalQty = p.qty + qty
      return { qty: totalQty, avgPrice: (p.avgPrice * p.qty + currentPrice * qty) / totalQty }
    })
    setOrders(o => [...o, { id: `o${Date.now()}`, type: 'achat', index: visibleCount - 1, price: currentPrice, qty }])
  }

  function placeSell() {
    if (!position) return
    const qty = Math.min(position.qty, Math.max(1, parseInt(sellQty, 10) || 0))
    setCash(c => c + qty * currentPrice)
    setOrders(o => [...o, { id: `o${Date.now()}`, type: 'vente', index: visibleCount - 1, price: currentPrice, qty }])
    setPosition(p => {
      if (!p) return null
      const remaining = p.qty - qty
      return remaining > 0 ? { ...p, qty: remaining } : null
    })
    if (position.qty - qty <= 0) setPendingStop(null)
  }

  function placeStop() {
    const price = parseFloat(stopPriceInput)
    if (!position || isNaN(price) || price <= 0 || price >= currentPrice) return
    setPendingStop({ price })
  }

  function handleSuggestionChoice(option: { feedback: string; goodChoice: boolean }) {
    setSuggestionFeedback({ text: option.feedback, good: option.goodChoice })
    setActiveSuggestion(null)
    setGuidedInteractions(n => n + 1)
    setTimeout(() => {
      setSuggestionFeedback(null)
      setPlaying(true)
    }, 3000)
  }

  function startAutonomous() {
    setPlaying(false)
    setPhase('autonomous')
  }

  const positionValue = position ? position.qty * currentPrice : 0
  const positionPnL = position ? (currentPrice - position.avgPrice) * position.qty : 0
  const totalValue = cash + positionValue

  const canGoToAutonomous = visibleCount >= GUIDED_END && guidedInteractions >= 1
  const canGoToAnalysis = phase === 'autonomous' && visibleCount >= TOTAL_LEN && orders.length >= 2

  function handleAnalysisScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setScrolledToEnd(true)
  }

  useEffect(() => {
    if (phase !== 'analysis') return
    const el = analysisRef.current
    if (el && el.scrollHeight <= el.clientHeight + 24) setScrolledToEnd(true)
  }, [phase])

  // ── Aide flottante ───────────────────────────────────────────────────────
  const helpOverlay = showHelp && (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={() => setShowHelp(false)}
    >
      <div
        className="panel"
        style={{ maxWidth: 480, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: '20px 22px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="title" style={{ fontSize: 16 }}>Fiche de révision</div>
          <button className="btn" style={{ fontSize: 12, padding: '3px 9px' }} onClick={() => setShowHelp(false)}>Fermer</button>
        </div>
        <RevisionSheet />
      </div>
    </div>
  )

  const helpButton = (
    <button
      className="btn"
      onClick={() => setShowHelp(true)}
      style={{ position: 'fixed', top: 90, right: 28, fontSize: 12, padding: '6px 12px', zIndex: 100, boxShadow: 'var(--shadow-pop)' }}
    >
      Aide / Révision
    </button>
  )

  // ── Panneau de trading (partagé entre guided et autonomous) ───────────────

  function TradingPanel({ phaseLabel, limit, canContinue, onContinue, continueLabel, cautionMsg }: {
    phaseLabel: string
    limit: number
    canContinue: boolean
    onContinue: () => void
    continueLabel: string
    cautionMsg?: string
  }) {
    const played = visibleCount - EXERCISE_CONTEXT_LENGTH
    const total = limit - EXERCISE_CONTEXT_LENGTH
    return (
      <>
        <p className="caption">
          {played}/{total} bougies jouées ·{' '}
          {orders.length} ordre{orders.length !== 1 ? 's' : ''} passé{orders.length !== 1 ? 's' : ''}
          {phaseLabel && <span style={{ marginLeft: 8, color: 'var(--primary-hover)', fontWeight: 600 }}>{phaseLabel}</span>}
        </p>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '7', minWidth: 280 }}>
            <div className="panel" style={{ padding: '14px 16px' }}>
              <EduCandleChart candles={visibleCandles} height={280} showVolume />
              <div className="row" style={{ gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setPlaying(p => !p)} disabled={visibleCount >= limit || !!activeSuggestion}>
                  {playing ? '⏸ Pause' : '▶ Jouer'}
                </button>
                {(['lent', 'normal', 'rapide'] as Speed[]).map(s => (
                  <button
                    key={s} onClick={() => setSpeed(s)} className="btn"
                    style={{ fontSize: 11, padding: '3px 9px', background: speed === s ? 'var(--primary)' : undefined, color: speed === s ? '#fff' : undefined }}
                  >
                    {s}
                  </button>
                ))}
                <span className="caption" style={{ marginLeft: 'auto' }}>Prix actuel : <strong style={{ color: 'var(--ink)' }}>{currentPrice.toFixed(2)} €</strong></span>
              </div>
            </div>

            {/* Suggestion semi-guidée */}
            {activeSuggestion && (
              <div className="panel" style={{ padding: '14px 16px', marginTop: 10, borderLeft: '3px solid var(--primary)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{activeSuggestion.question}</div>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  {activeSuggestion.options.map(opt => (
                    <button key={opt.label} className="btn" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleSuggestionChoice(opt)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {suggestionFeedback && (
              <div
                className="panel"
                style={{ padding: '12px 16px', marginTop: 10, borderLeft: `3px solid ${suggestionFeedback.good ? 'var(--success)' : 'var(--primary)'}` }}
              >
                <div className="caption" style={{ lineHeight: 1.6 }}>{suggestionFeedback.text}</div>
              </div>
            )}
          </div>

          <div className="col" style={{ flex: '3', minWidth: 240, gap: 10 }}>
            <div className="panel" style={{ padding: '12px 14px' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Compte</div>
              <div className="caption" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Cash</span><strong style={{ color: 'var(--ink)' }}>{cash.toFixed(0)} €</strong></div>
              <div className="caption" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Position</span><strong style={{ color: 'var(--ink)' }}>{position ? `${position.qty} @ ${position.avgPrice.toFixed(2)} €` : '—'}</strong></div>
              {position && (
                <div className="caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>P&amp;L latent</span>
                  <strong style={{ color: positionPnL >= 0 ? 'var(--success)' : 'var(--danger)' }}>{positionPnL >= 0 ? '+' : ''}{positionPnL.toFixed(0)} €</strong>
                </div>
              )}
              <div className="caption" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, borderTop: '1px solid var(--hairline)', paddingTop: 6 }}>
                <span>Valeur totale</span><strong style={{ color: 'var(--ink)' }}>{totalValue.toFixed(0)} €</strong>
              </div>
            </div>

            <div className="panel" style={{ padding: '12px 14px' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Acheter</div>
              <div className="row" style={{ gap: 6 }}>
                <input value={buyQty} onChange={e => setBuyQty(e.target.value)} style={{ width: 60, height: 28, fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--surface-3)', border: '1px solid var(--hairline)', borderRadius: 6, color: 'var(--ink)', padding: '0 6px' }} />
                <button className="btn" style={{ fontSize: 12, padding: '4px 10px', background: 'var(--success)', color: '#fff' }} onClick={placeBuy}>Acheter</button>
              </div>
            </div>

            {position && (
              <>
                <div className="panel" style={{ padding: '12px 14px' }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Vendre</div>
                  <div className="row" style={{ gap: 6 }}>
                    <input value={sellQty} onChange={e => setSellQty(e.target.value)} style={{ width: 60, height: 28, fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--surface-3)', border: '1px solid var(--hairline)', borderRadius: 6, color: 'var(--ink)', padding: '0 6px' }} />
                    <button className="btn" style={{ fontSize: 12, padding: '4px 10px', background: 'var(--danger)', color: '#fff' }} onClick={placeSell}>Vendre</button>
                  </div>
                </div>

                <div className="panel" style={{ padding: '12px 14px' }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>
                    Stop loss {pendingStop ? `(actif à ${pendingStop.price.toFixed(2)} €)` : ''}
                  </div>
                  {pendingStop ? (
                    <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setPendingStop(null)}>Annuler le stop</button>
                  ) : (
                    <>
                      <div className="row" style={{ gap: 6 }}>
                        <input value={stopPriceInput} onChange={e => setStopPriceInput(e.target.value)} placeholder="prix" style={{ width: 70, height: 28, fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--surface-3)', border: '1px solid var(--hairline)', borderRadius: 6, color: 'var(--ink)', padding: '0 6px' }} />
                        <button className="btn" style={{ fontSize: 12, padding: '4px 10px' }} onClick={placeStop}>Placer</button>
                      </div>
                      {atrVals[visibleCount - 1] != null && (
                        <div className="caption" style={{ marginTop: 6, color: 'var(--primary-hover)' }}>
                          ATR : {atrVals[visibleCount - 1]!.toFixed(2)} € → stop conseillé à {(currentPrice - 1.5 * atrVals[visibleCount - 1]!).toFixed(2)} €
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}

            <div className="panel" style={{ padding: '12px 14px' }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Ordres exécutés</div>
              {orders.length === 0 && <div className="caption">Aucun ordre encore.</div>}
              <div className="col" style={{ gap: 4 }}>
                {orders.map(o => (
                  <div key={o.id} className="caption" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: o.type === 'achat' ? 'var(--success)' : 'var(--danger)' }}>{o.type}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{o.qty} @ {o.price.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            </div>

            <EduIndicatorPanel
              candles={visibleCandles}
              show={{ rsi: true, macd: true, bollinger: true, atr: true }}
              onOverlaysChange={() => {}}
            />
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onContinue}
            disabled={!canContinue}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
              borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500,
              cursor: canContinue ? 'pointer' : 'not-allowed',
              background: canContinue ? 'var(--primary)' : 'var(--surface-3)',
              color: canContinue ? '#fff' : 'var(--ink-muted)',
            }}
          >
            {continueLabel}
          </button>
        </div>
        {!canContinue && cautionMsg && (
          <p className="caption" style={{ textAlign: 'right' }}>{cautionMsg}</p>
        )}
      </>
    )
  }

  // ── Phase 0 — révision ───────────────────────────────────────────────────
  if (phase === 'revision') {
    return (
      <LessonShell step={1} totalSteps={6} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Appliquer une stratégie en direct</h2>
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Avant de te lancer, voici un récapitulatif de tout ce que tu as appris dans ce
            module. Tu pourras y revenir à tout moment pendant l'exercice grâce au bouton
            "Aide / Révision".
          </p>
        </div>
        <div className="panel" style={{ padding: '18px 22px' }}>
          <RevisionSheet />
        </div>

        {/* Définition stop loss */}
        <div className="panel" style={{ padding: '18px 22px', borderLeft: '3px solid var(--primary)' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Le stop loss — à retenir avant de commencer</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            Un <strong style={{ color: 'var(--ink)' }}>stop loss</strong> est un ordre automatique
            de vente déclenché si le prix atteint un niveau défini à l'avance. Il limite ta perte
            maximale sur une position.
          </p>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            <strong style={{ color: 'var(--ink)' }}>Règle pratique (liée à l'ATR vu en leçon 5) :</strong> place ton stop à
            <strong style={{ color: 'var(--primary-hover)' }}> 1,5× l'ATR</strong> sous ton prix
            d'entrée. Cela laisse au titre sa "respiration" normale sans déclencher le stop pour
            rien. Exemple : entrée à 90 €, ATR à 3 € → stop à 90 − 4,5 = <strong>85,5 €</strong>.
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Comment ça marche</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: 'var(--ink-subtle)' }}>
            <li><strong style={{ color: 'var(--ink)' }}>Observation</strong> — 30 bougies de contexte avec annotations. Aucun ordre possible.</li>
            <li><strong style={{ color: 'var(--ink)' }}>Mode semi-guidé</strong> — 25 bougies avec suggestions contextuelles. Des questions apparaissent au fil du graphique.</li>
            <li><strong style={{ color: 'var(--ink)' }}>Mode autonome</strong> — 25 bougies sans aide. Minimum 2 ordres requis.</li>
            <li><strong style={{ color: 'var(--ink)' }}>Analyse</strong> — chaque ordre est commenté individuellement.</li>
          </ul>
          <p className="caption" style={{ marginTop: 10 }}>
            Aucun score minimum — l'objectif est de réfléchir, pas d'être rentable sur des données simulées.
          </p>
        </div>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={() => setPhase('observation')}
            style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'var(--primary)', color: '#fff' }}
          >
            Commencer l'exercice →
          </button>
        </div>
      </LessonShell>
    )
  }

  // ── Phase 1 — observation ───────────────────────────────────────────────
  if (phase === 'observation') {
    return (
      <LessonShell step={2} totalSteps={6} onBack={() => setPhase('revision')} backLabel="← Retour à la révision">
        {helpOverlay}{helpButton}
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Phase 1 — Observation</h2>
        <p className="caption">30 bougies de contexte. Analyse la tendance, les niveaux clés et les indicateurs avant d'agir — aucun ordre n'est encore possible.</p>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '7', minWidth: 280 }}>
            <div className="panel" style={{ padding: '14px 16px' }}>
              <EduCandleChart candles={PATRIMCORP_EXERCISE.slice(0, EXERCISE_CONTEXT_LENGTH)} height={300} showVolume markers={obsMarkers} />
              <p className="caption" style={{ marginTop: 8 }}>Les cercles indiquent le creux (support potentiel) et le sommet (résistance) du contexte.</p>
            </div>
          </div>
          <div style={{ flex: '3', minWidth: 220 }}>
            <EduIndicatorPanel
              candles={PATRIMCORP_EXERCISE.slice(0, EXERCISE_CONTEXT_LENGTH)}
              show={{ rsi: true }}
              onOverlaysChange={() => {}}
            />
          </div>
        </div>

        {/* Annotations contextuelles */}
        <div className="panel" style={{ padding: '14px 18px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Points clés à observer</div>
          <div className="col" style={{ gap: 8 }}>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--success)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 3 }}>Tendance haussière établie</div>
              <div className="caption">Le prix passe de ~{firstContextPrice.toFixed(0)} € à ~{lastContextPrice.toFixed(0)} € en 20 séances — sommets et creux croissants, tendance de fond claire.</div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: `3px solid ${lastContextRsi != null && lastContextRsi > 65 ? 'var(--danger)' : 'var(--primary)'}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: lastContextRsi != null && lastContextRsi > 65 ? 'var(--danger)' : 'var(--primary-hover)', marginBottom: 3 }}>
                {lastContextRsi != null && lastContextRsi > 65 ? 'RSI en zone de surachat' : 'RSI en zone haute'}
              </div>
              <div className="caption">
                {lastContextRsi != null
                  ? `RSI à ${lastContextRsi.toFixed(0)} — la hausse est forte${lastContextRsi > 65 ? '. Surveille un possible essoufflement à venir' : ''}.`
                  : 'RSI non disponible sur 20 bougies (nécessite 15 + valeurs de préchauffage).'}
              </div>
            </div>
            {lastContextSma != null && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--ink-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>SMA20 à {lastContextSma.toFixed(0)} €</div>
                <div className="caption">Le prix est au-dessus de sa moyenne mobile 20 périodes — tendance de fond confirmée haussière.</div>
              </div>
            )}
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-hover)', marginBottom: 3 }}>Question à se poser</div>
              <div className="caption">Si le prix se replie depuis ces niveaux, où pourrait-il trouver un support ? Repère les creux récents — ce sont les zones à surveiller pour une entrée.</div>
            </div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setPhase('guided'); setPlaying(true) }}
            style={{ display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'var(--primary)', color: '#fff' }}
          >
            Démarrer le mode semi-guidé →
          </button>
        </div>
      </LessonShell>
    )
  }

  // ── Phase 2 — mode semi-guidé ────────────────────────────────────────────
  if (phase === 'guided') {
    return (
      <LessonShell step={3} totalSteps={6}>
        {helpOverlay}{helpButton}
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Phase 2 — Mode semi-guidé</h2>
        {TradingPanel({
          phaseLabel: 'Semi-guidé · 25 bougies',
          limit: GUIDED_END,
          canContinue: canGoToAutonomous,
          onContinue: startAutonomous,
          continueLabel: 'Passer au mode autonome →',
          cautionMsg: visibleCount < GUIDED_END ? "Laisse les bougies se dérouler jusqu'au bout" : 'Réponds à au moins une suggestion pour continuer',
        })}
      </LessonShell>
    )
  }

  // ── Phase 3 — mode autonome ──────────────────────────────────────────────
  if (phase === 'autonomous') {
    return (
      <LessonShell step={4} totalSteps={6}>
        {helpOverlay}{helpButton}
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Phase 3 — Mode autonome</h2>
        <p className="caption" style={{ color: 'var(--primary-hover)', fontWeight: 600 }}>25 bougies sans suggestions. Fais tes propres choix — minimum 2 ordres requis.</p>
        {TradingPanel({
          phaseLabel: 'Autonome · 25 bougies',
          limit: TOTAL_LEN,
          canContinue: canGoToAnalysis,
          onContinue: () => setPhase('analysis'),
          continueLabel: 'Voir l\'analyse →',
          cautionMsg: visibleCount < TOTAL_LEN ? "Laisse les bougies se dérouler jusqu'au bout" : 'Il te faut au moins 2 ordres pour continuer',
        })}
      </LessonShell>
    )
  }

  // ── Phase 4 — analyse ────────────────────────────────────────────────────
  if (phase === 'analysis') {
    return (
      <LessonShell step={5} totalSteps={6}>
        {helpOverlay}{helpButton}
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Phase 4 — Analyse de tes décisions</h2>
        <p className="caption">Chaque ordre est commenté individuellement. Fais défiler jusqu'en bas pour terminer l'exercice.</p>

        <div
          ref={analysisRef}
          onScroll={handleAnalysisScroll}
          style={{ maxHeight: 460, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}
        >
          {orders.map((o, i) => {
            const stopDist = orderStopDistances[o.id] ?? null
            const lines = analyzeOrder(o, closes, rsiVals, atrVals, sma20Vals, stopDist)
            return (
              <div key={o.id} className="panel" style={{ padding: '14px 18px' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Ordre {i + 1} — <span style={{ color: o.type === 'achat' ? 'var(--success)' : o.type === 'vente' ? 'var(--danger)' : 'var(--primary)' }}>{o.type}</span>
                  </span>
                  <span className="caption" style={{ fontFamily: 'var(--font-mono)' }}>{o.qty} @ {o.price.toFixed(2)} €</span>
                </div>
                <div className="col" style={{ gap: 5 }}>
                  {lines.map((l, k) => (
                    <div key={k} className="caption" style={{ lineHeight: 1.55 }}>{l}</div>
                  ))}
                </div>
              </div>
            )
          })}
          <div style={{ height: 1 }} />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={() => setPhase('result')}
            disabled={!scrolledToEnd}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
              borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500,
              cursor: scrolledToEnd ? 'pointer' : 'not-allowed',
              background: scrolledToEnd ? 'var(--success)' : 'var(--surface-3)',
              color: scrolledToEnd ? '#fff' : 'var(--ink-muted)',
            }}
          >
            Terminer l'exercice →
          </button>
        </div>
        {!scrolledToEnd && <p className="caption" style={{ textAlign: 'right' }}>Fais défiler l'analyse jusqu'en bas pour continuer.</p>}
      </LessonShell>
    )
  }

  // ── Résultat ──────────────────────────────────────────────────────────────
  return (
    <LessonShell step={6} totalSteps={6}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>🎯</div>
        <div className="title" style={{ fontSize: 20 }}>Module 5 complété !</div>
        <p className="caption" style={{ maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
          Tu as lu un graphique, repéré des tendances et des niveaux clés, utilisé RSI, MACD et
          Bollinger/ATR, puis appliqué tout ça en conditions simulées. La suite logique : mettre
          ces réflexes en pratique sur de vrais marchés, dans la page Finance.
        </p>
        <div className="row" style={{ gap: 10, marginTop: 4 }}>
          <button
            onClick={onComplete}
            style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 24px', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'var(--success)', color: '#fff' }}
          >
            Valider et terminer le module
          </button>
          {onGoToFinance && (
            <button
              onClick={() => { onComplete(); onGoToFinance() }}
              style={{ display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 24px', borderRadius: 8, border: '1px solid var(--hairline-strong)', fontSize: 14, fontWeight: 600, cursor: 'pointer', background: 'var(--surface-2)', color: 'var(--ink)' }}
            >
              Aller à la page Finance →
            </button>
          )}
        </div>
      </div>
    </LessonShell>
  )
}

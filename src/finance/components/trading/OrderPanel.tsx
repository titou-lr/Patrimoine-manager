import { useState, useEffect, useMemo } from 'react'
import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { FINANCE_ASSETS } from '../../data/financeAssets'
import { fetchHistorical, fetchQuotes } from '../../services/priceService'
import { executeMarketOrder, computeCommission, halfSpreadRate } from '../../engine/tradingEngine'
import { computePositionSize } from '../../engine/positionSizing'
import { getStrategy } from '../../engine/strategies/index'
import type { AssetClass, Order, OrderSide, PriceQuote } from '../../types/finance'

function isMarketOpen(assetClass: AssetClass): { open: boolean; message: string } {
  const now = new Date()
  const dayUTC = now.getUTCDay()
  const hourUTC = now.getUTCHours()
  const minUTC = now.getUTCMinutes()
  const timeUTC = hourUTC * 60 + minUTC

  if (assetClass === 'crypto') return { open: true, message: '' }

  if (assetClass === 'forex') {
    if (dayUTC === 0) return { open: false, message: 'Marché Forex fermé — rouvre dimanche 22h00 UTC' }
    if (dayUTC === 6) return { open: false, message: 'Marché Forex fermé — rouvre dimanche 22h00 UTC' }
    if (dayUTC === 5 && timeUTC >= 22 * 60) return { open: false, message: 'Marché Forex fermé — rouvre dimanche 22h00 UTC' }
    return { open: true, message: '' }
  }

  if (dayUTC === 0 || dayUTC === 6) {
    return { open: false, message: 'Marché boursier fermé — rouvre lundi 08h00 UTC' }
  }
  if (timeUTC < 7 * 60 || timeUTC >= 21 * 60) {
    return { open: false, message: 'Marché boursier fermé — horaires : lun-ven 07h00-21h00 UTC' }
  }
  return { open: true, message: '' }
}

interface Props {
  accountId: string
  assetId?: string
}

function genId() {
  return `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// Type d'ordre côté UI ('oco' produit deux ordres liés)
type UIOrderType = 'market' | 'limit' | 'stop_loss' | 'stop_limit' | 'trailing_stop' | 'oco'

const ORDER_TYPE_LABELS: Record<UIOrderType, string> = {
  market: 'Market',
  limit: 'Limite',
  stop_loss: 'Stop',
  stop_limit: 'Stop-Limit',
  trailing_stop: 'Trailing',
  oco: 'OCO',
}

const ORDER_TYPE_HINTS: Record<UIOrderType, string> = {
  market: 'Exécution immédiate au prix courant (slippage appliqué).',
  limit: "Exécuté seulement si le prix croise le niveau limite — fill garanti au prix limite.",
  stop_loss: "À l'activation du stop, un ordre market est déclenché (slippage appliqué).",
  stop_limit: "L'activation du stop arme une jambe limite — pas d'exécution au-delà du prix limite.",
  trailing_stop: 'Le stop suit le prix à distance fixe (%) et se déclenche au repli.',
  oco: 'Deux ordres liés (limite + stop) — le premier exécuté annule le second.',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
  borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
  fontFamily: 'var(--font-mono)', color: 'var(--ink)', outline: 'none',
}

export default function OrderPanel({ accountId, assetId: propAssetId }: Props) {
  const {
    tradingAccounts, positions, trades,
    updateTradingAccount, setPositions, setTrades, addOrder,
    activeStrategyId, strategyParams,
  } = useFinanceStore()

  const account = tradingAccounts.find(a => a.id === accountId)
  const accountPositions = positions[accountId] ?? []
  const accountTrades = trades[accountId] ?? []

  const [search, setSearch] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState(propAssetId ?? '')
  const [side, setSide] = useState<OrderSide>('buy')
  const [orderType, setOrderType] = useState<UIOrderType>('market')
  const [quantity, setQuantity] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [trailingPct, setTrailingPct] = useState('2')
  const [currentQuote, setCurrentQuote] = useState<PriceQuote | null>(null)
  const currentPrice = currentQuote?.price ?? null
  const [signal, setSignal] = useState<{ type: string; reason: string } | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Position sizing
  const [showSizing, setShowSizing] = useState(false)
  const [riskMode, setRiskMode] = useState<'percent' | 'absolute'>('percent')
  const [riskValue, setRiskValue] = useState('1')
  const [sizingStop, setSizingStop] = useState('')
  const [plannedStop, setPlannedStop] = useState<number | null>(null)
  const [autoPlaceStop, setAutoPlaceStop] = useState(true)

  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase()
    return FINANCE_ASSETS.filter(a =>
      a.name.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [search])

  const selectedAsset = selectedAssetId ? getAssetById(selectedAssetId) : null

  // Fetch current price when asset changes
  useEffect(() => {
    if (!selectedAsset) return
    fetchQuotes([selectedAsset.ticker]).then(quotes => {
      const q = quotes.find(q => q.ticker === selectedAsset.ticker)
      if (q) setCurrentQuote(q)
    })
  }, [selectedAsset?.ticker])

  // Compute strategy signal
  useEffect(() => {
    if (!selectedAsset || !accountId) return
    const stratId = activeStrategyId[accountId] ?? 'manual'
    const strategy = getStrategy(stratId)
    if (!strategy) return
    const params = strategyParams[accountId] ?? {}
    fetchHistorical(selectedAsset.ticker, '3M').then(candles => {
      if (candles.length > 0) {
        const sig = strategy.run(candles, params)
        setSignal(sig)
      }
    })
  }, [selectedAsset?.ticker, accountId, activeStrategyId[accountId]])

  const cashBalance = account?.cashBalance ?? 0
  const positionForAsset = accountPositions.find(p => p.assetId === selectedAssetId)
  const maxSellQty = positionForAsset?.quantity ?? 0

  const totalAccountValue = cashBalance + accountPositions.reduce((s, p) => s + p.currentPrice * p.quantity, 0)

  const qty = parseFloat(quantity) || 0
  const price = currentPrice ?? 0
  const lPrice = parseFloat(limitPrice) || 0
  const sPrice = parseFloat(stopPrice) || 0
  const tPct = parseFloat(trailingPct) || 0

  // Prix d'exécution estimé pour le résumé
  const halfSpread = account ? halfSpreadRate(account) : 0
  const estExecPrice = (() => {
    if (orderType === 'market') return price * (side === 'buy' ? 1 + halfSpread : 1 - halfSpread)
    if (orderType === 'limit' || orderType === 'oco') return lPrice || price
    if (orderType === 'stop_loss') return (sPrice || price) * (side === 'buy' ? 1 + halfSpread : 1 - halfSpread)
    if (orderType === 'stop_limit') return lPrice || sPrice || price
    if (orderType === 'trailing_stop') return price * (1 - (side === 'sell' ? tPct : -tPct) / 100)
    return price
  })()

  const estimatedFees = account ? computeCommission(account, estExecPrice * qty) : 0
  const estimatedSlippage = (orderType === 'market' || orderType === 'stop_loss' || orderType === 'trailing_stop')
    ? price * halfSpread * qty
    : 0
  const totalCost = estExecPrice * qty + (side === 'buy' ? estimatedFees : -estimatedFees)
  const cashAfter = side === 'buy' ? cashBalance - totalCost : cashBalance + totalCost

  const maxQty = (() => {
    if (price <= 0 || !account) return 0
    const unitCost = price * (1 + halfSpread)
    if ((account.commissionMode ?? 'percent') === 'percent') {
      return Math.floor(cashBalance / (unitCost * (1 + account.feeRate)))
    }
    return Math.floor(Math.max(0, cashBalance - (account.commissionFlat ?? 0)) / unitCost)
  })()

  function setQtyFromPct(pct: number) {
    if (side === 'buy') {
      setQuantity(String(Math.floor(maxQty * pct)))
    } else {
      setQuantity(String(Math.floor(maxSellQty * pct)))
    }
  }

  // Position sizing
  const sizingResult = useMemo(() => {
    if (!showSizing || price <= 0) return null
    return computePositionSize({
      capital: totalAccountValue,
      riskMode,
      riskValue: parseFloat(riskValue) || 0,
      entryPrice: price,
      stopPrice: parseFloat(sizingStop) || 0,
    })
  }, [showSizing, price, totalAccountValue, riskMode, riskValue, sizingStop])

  function applySizing() {
    if (!sizingResult || sizingResult.quantity <= 0) return
    setQuantity(String(sizingResult.quantity))
    setPlannedStop(parseFloat(sizingStop) || null)
    setSide('buy')
  }

  const marketStatus = selectedAsset ? isMarketOpen(selectedAsset.assetClass) : { open: true, message: '' }

  // Validation par type
  const validationError = (() => {
    if (!selectedAsset || qty <= 0) return null
    if (orderType === 'limit' && lPrice <= 0) return 'Prix limite requis'
    if (orderType === 'stop_loss' && sPrice <= 0) return 'Prix de stop requis'
    if (orderType === 'stop_limit' && (sPrice <= 0 || lPrice <= 0)) return 'Stop et limite requis'
    if (orderType === 'trailing_stop' && tPct <= 0) return 'Distance de trailing requise'
    if (orderType === 'oco' && (lPrice <= 0 || sPrice <= 0)) return 'Les deux jambes (limite + stop) sont requises'
    if (orderType === 'oco' && side === 'sell' && qty > maxSellQty) return 'Quantité supérieure à la position'
    if (orderType === 'trailing_stop' && side === 'sell' && qty > maxSellQty) return 'Quantité supérieure à la position'
    return null
  })()

  function handleSubmit() {
    if (!account || !selectedAsset || qty <= 0 || validationError) return
    setError('')
    setSuccess('')

    const base = {
      assetId: selectedAssetId,
      ticker: selectedAsset.ticker,
      side,
      quantity: qty,
      createdAt: Date.now(),
      strategyId: activeStrategyId[accountId],
    }

    if (orderType === 'market') {
      if (!currentQuote) { setError('Prix non disponible'); return }
      const order: Order = { ...base, id: genId(), type: 'market', status: 'filled' }
      const execPx = marketStatus.open ? currentQuote.price : (currentQuote.previousClose || currentQuote.price)
      const note = marketStatus.open ? undefined : 'Exécuté hors séance (marché fermé)'
      const result = executeMarketOrder(order, execPx, account, accountPositions, accountTrades)
      if (result.error) { setError(result.error); return }

      let finalPositions = result.updatedPositions
      // Stop prévu (position sizing) : mémorisé sur la position pour le RRR du journal
      if (side === 'buy' && plannedStop != null && plannedStop > 0) {
        finalPositions = finalPositions.map(p =>
          p.assetId === selectedAssetId ? { ...p, plannedStopPrice: plannedStop } : p
        )
      }
      updateTradingAccount(accountId, { cashBalance: result.updatedAccount.cashBalance })
      setPositions(accountId, finalPositions)
      setTrades(accountId, result.updatedTrades)
      addOrder(accountId, { ...result.filledOrder })

      // Stop-loss automatique attaché après un achat market (money management)
      if (side === 'buy' && plannedStop != null && plannedStop > 0 && autoPlaceStop) {
        addOrder(accountId, {
          ...base,
          id: genId(),
          side: 'sell',
          type: 'stop_loss',
          stopPrice: plannedStop,
          status: 'pending',
        })
      }

      setSuccess(`${note ? '⚠️ ' : ''}Ordre exécuté : ${side === 'buy' ? 'Achat' : 'Vente'} ${qty} × ${selectedAsset.name} @ ${(result.filledOrder.fillPrice ?? execPx).toFixed(2)}${note ? ` (${note})` : ''}${side === 'buy' && plannedStop && autoPlaceStop ? ` — stop placé @ ${plannedStop.toFixed(2)}` : ''}`)
      setQuantity('')
      setPlannedStop(null)
    } else if (orderType === 'oco') {
      const groupId = `oco-${Date.now()}`
      const limitLeg: Order = {
        ...base, id: genId(),
        type: side === 'sell' ? 'take_profit' : 'limit',
        limitPrice: lPrice, ocoGroupId: groupId, status: 'pending',
      }
      const stopLeg: Order = {
        ...base, id: genId(),
        type: 'stop_loss',
        stopPrice: sPrice, ocoGroupId: groupId, status: 'pending',
      }
      addOrder(accountId, limitLeg)
      addOrder(accountId, stopLeg)
      setSuccess(`OCO créé : ${side === 'buy' ? 'Achat' : 'Vente'} ${qty} × ${selectedAsset.ticker} — limite @ ${lPrice.toFixed(2)} / stop @ ${sPrice.toFixed(2)}`)
      setQuantity('')
    } else {
      const order: Order = {
        ...base,
        id: genId(),
        type: orderType,
        limitPrice: (orderType === 'limit' || orderType === 'stop_limit') ? lPrice : undefined,
        stopPrice: (orderType === 'stop_loss' || orderType === 'stop_limit') ? sPrice : undefined,
        trailingPct: orderType === 'trailing_stop' ? tPct : undefined,
        trailingStopPrice: orderType === 'trailing_stop' && price > 0
          ? (side === 'sell' ? price * (1 - tPct / 100) : price * (1 + tPct / 100))
          : undefined,
        status: 'pending',
      }
      addOrder(accountId, order)
      const priceLabel = orderType === 'trailing_stop'
        ? `trailing ${tPct}%`
        : orderType === 'stop_limit'
        ? `stop ${sPrice.toFixed(2)} / limite ${lPrice.toFixed(2)}`
        : `@ ${(orderType === 'limit' ? lPrice : sPrice).toFixed(2)}`
      setSuccess(`Ordre en attente : ${side === 'buy' ? 'Achat' : 'Vente'} ${qty} × ${selectedAsset.name} ${priceLabel}`)
      setQuantity('')
    }

    setTimeout(() => setSuccess(''), 4000)
  }

  const signalColor = signal?.type === 'buy' ? 'var(--success)' : signal?.type === 'sell' ? 'var(--danger)' : 'var(--ink-subtle)'
  const signalLabel = signal?.type === 'buy' ? 'ACHAT ↑' : signal?.type === 'sell' ? 'VENTE ↓' : 'NEUTRE —'

  const submitDisabled = !selectedAsset || qty <= 0 || validationError != null
    || (orderType === 'market' && side === 'buy' && cashBalance < totalCost)
    || (side === 'sell' && orderType === 'market' && qty > maxSellQty)

  return (
    <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 className="title" style={{ fontSize: 14, marginBottom: 0 }}>Passer un ordre</h3>

      {/* Recherche actif */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="caption" style={{ fontWeight: 600 }}>Actif</span>
        <input
          type="text"
          placeholder="Rechercher un actif…"
          value={selectedAsset ? selectedAsset.name : search}
          onChange={e => { setSearch(e.target.value); setSelectedAssetId('') }}
          onFocus={() => { if (selectedAsset) setSearch('') }}
          style={{ ...inputStyle, fontFamily: 'inherit' }}
        />
        {search && !selectedAsset && (
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r)', maxHeight: 180, overflowY: 'auto',
          }}>
            {filteredAssets.map(a => (
              <button
                key={a.id}
                onClick={() => { setSelectedAssetId(a.id); setSearch('') }}
                style={{
                  display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--hairline)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <span>{a.name}</span>
                <span className="caption" style={{ marginLeft: 8 }}>{a.ticker}</span>
              </button>
            ))}
          </div>
        )}
        {selectedAsset && currentPrice != null && (
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span className="caption">{selectedAsset.ticker}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
              {currentPrice.toFixed(2)} {account?.currency ?? 'EUR'}
            </span>
            {(account?.slippagePct ?? 0) > 0 && (
              <span className="caption" style={{ fontSize: 10 }}>
                bid {(currentPrice * (1 - halfSpread)).toFixed(2)} / ask {(currentPrice * (1 + halfSpread)).toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Côté */}
      <div className="row" style={{ gap: 0, borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
        {(['buy', 'sell'] as OrderSide[]).map(s => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: side === s ? (s === 'buy' ? 'var(--success)' : 'var(--danger)') : 'var(--bg-elevated)',
              color: side === s ? 'white' : 'var(--ink-subtle)',
              transition: 'background 0.1s, color 0.1s',
            }}
          >
            {s === 'buy' ? 'ACHETER' : 'VENDRE'}
          </button>
        ))}
      </div>

      {/* Type d'ordre */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="caption" style={{ fontWeight: 600 }}>Type</span>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(ORDER_TYPE_LABELS) as UIOrderType[]).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`btn btn-sm ${orderType === t ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11 }}
            >
              {ORDER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="caption" style={{ margin: 0, fontSize: 11 }}>{ORDER_TYPE_HINTS[orderType]}</p>
      </div>

      {/* Quantité */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="caption" style={{ fontWeight: 600 }}>Quantité</span>
        <input
          type="number"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          min={0}
          placeholder="0"
          style={inputStyle}
        />
        <div className="row" style={{ gap: 4 }}>
          {[0.25, 0.5, 0.75, 1].map(pct => (
            <button
              key={pct}
              onClick={() => setQtyFromPct(pct)}
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, fontSize: 11 }}
            >
              {pct === 1 ? 'Max' : `${pct * 100}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Prix selon le type */}
      {(orderType === 'limit' || orderType === 'stop_limit') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="caption" style={{ fontWeight: 600 }}>Prix limite</span>
          <input
            type="number"
            value={limitPrice}
            onChange={e => setLimitPrice(e.target.value)}
            placeholder={currentPrice ? currentPrice.toFixed(2) : '0.00'}
            style={inputStyle}
          />
        </div>
      )}
      {(orderType === 'stop_loss' || orderType === 'stop_limit') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="caption" style={{ fontWeight: 600 }}>Prix de stop (activation)</span>
          <input
            type="number"
            value={stopPrice}
            onChange={e => setStopPrice(e.target.value)}
            placeholder={currentPrice ? currentPrice.toFixed(2) : '0.00'}
            style={inputStyle}
          />
        </div>
      )}
      {orderType === 'trailing_stop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="caption" style={{ fontWeight: 600 }}>Distance de suivi (%)</span>
          <input
            type="number"
            value={trailingPct}
            onChange={e => setTrailingPct(e.target.value)}
            min={0.1}
            step={0.1}
            style={inputStyle}
          />
          {price > 0 && tPct > 0 && (
            <span className="caption" style={{ fontSize: 11 }}>
              Stop initial : {(side === 'sell' ? price * (1 - tPct / 100) : price * (1 + tPct / 100)).toFixed(2)}
            </span>
          )}
        </div>
      )}
      {orderType === 'oco' && (
        <div className="row" style={{ gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <span className="caption" style={{ fontWeight: 600 }}>
              Jambe limite {side === 'sell' ? '(take profit ↑)' : '(achat au repli ↓)'}
            </span>
            <input
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder={currentPrice ? currentPrice.toFixed(2) : '0.00'}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <span className="caption" style={{ fontWeight: 600 }}>
              Jambe stop {side === 'sell' ? '(protection ↓)' : '(breakout ↑)'}
            </span>
            <input
              type="number"
              value={stopPrice}
              onChange={e => setStopPrice(e.target.value)}
              placeholder={currentPrice ? currentPrice.toFixed(2) : '0.00'}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Calculateur de position sizing */}
      <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
        <button
          onClick={() => setShowSizing(v => !v)}
          style={{
            width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)', border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>📐 Calculateur de taille de position</span>
          <span style={{ transform: showSizing ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', fontSize: 10 }}>▼</span>
        </button>
        {showSizing && (
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span className="caption" style={{ fontSize: 11, fontWeight: 600 }}>Risque max</span>
                <input
                  type="number"
                  value={riskValue}
                  onChange={e => setRiskValue(e.target.value)}
                  min={0}
                  step={riskMode === 'percent' ? 0.1 : 10}
                  style={{ ...inputStyle, padding: '5px 8px', fontSize: 12 }}
                />
              </div>
              <div className="row" style={{ gap: 0, borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
                {(['percent', 'absolute'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setRiskMode(m)}
                    style={{
                      padding: '5px 10px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: riskMode === m ? 'var(--primary)' : 'var(--bg-elevated)',
                      color: riskMode === m ? 'white' : 'var(--ink-subtle)',
                    }}
                  >
                    {m === 'percent' ? '%' : account?.currency === 'USD' ? '$' : '€'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                <span className="caption" style={{ fontSize: 11, fontWeight: 600 }}>Niveau de stop</span>
                <input
                  type="number"
                  value={sizingStop}
                  onChange={e => setSizingStop(e.target.value)}
                  placeholder={price > 0 ? (price * 0.95).toFixed(2) : '0.00'}
                  style={{ ...inputStyle, padding: '5px 8px', fontSize: 12 }}
                />
              </div>
            </div>
            <div className="caption" style={{ fontSize: 11 }}>
              Capital du compte : <span style={{ fontFamily: 'var(--font-mono)' }}>{totalAccountValue.toFixed(0)} {account?.currency ?? 'EUR'}</span>
            </div>
            {sizingResult && (
              sizingResult.error && sizingResult.quantity <= 0 ? (
                <p style={{ fontSize: 11, color: 'var(--danger)', margin: 0 }}>{sizingResult.error}</p>
              ) : (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r)', padding: '8px 10px', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="caption">Taille calculée</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{sizingResult.quantity} unités</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="caption">Valeur position</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{sizingResult.positionValue.toFixed(2)}</span>
                  </div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="caption">Risque effectif</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>
                      −{sizingResult.actualRisk.toFixed(2)} ({sizingResult.actualRiskPct.toFixed(2)}%)
                    </span>
                  </div>
                  {sizingResult.error && (
                    <p style={{ fontSize: 10, color: 'var(--overheat, #f59e0b)', margin: 0 }}>{sizingResult.error}</p>
                  )}
                  <label className="row" style={{ gap: 6, alignItems: 'center', cursor: 'pointer', marginTop: 4 }}>
                    <input
                      type="checkbox"
                      checked={autoPlaceStop}
                      onChange={e => setAutoPlaceStop(e.target.checked)}
                    />
                    <span className="caption" style={{ fontSize: 11 }}>Placer le stop-loss automatiquement après l'achat</span>
                  </label>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 11, marginTop: 4 }}
                    onClick={applySizing}
                    disabled={sizingResult.quantity <= 0}
                  >
                    Appliquer la taille ({sizingResult.quantity})
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Résumé */}
      {qty > 0 && estExecPrice > 0 && (
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="caption">{orderType === 'market' ? 'Coût estimé' : 'Coût au déclenchement'}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {totalCost.toFixed(2)} {account?.currency ?? 'EUR'}
            </span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="caption">Commission ({account?.commissionMode === 'flat' ? 'forfait' : `${(account?.feeRate ?? 0) * 100}%`})</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{estimatedFees.toFixed(2)}</span>
          </div>
          {estimatedSlippage > 0 && (
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
              <span className="caption">Slippage estimé (spread {account?.slippagePct ?? 0}%)</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{estimatedSlippage.toFixed(2)}</span>
            </div>
          )}
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="caption">Cash restant</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: cashAfter < 0 ? 'var(--danger)' : 'var(--ink)' }}>
              {cashAfter.toFixed(2)}
            </span>
          </div>
          {plannedStop != null && plannedStop > 0 && side === 'buy' && (
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
              <span className="caption">Stop prévu (RRR journal)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)' }}>{plannedStop.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Signal stratégie */}
      {signal && selectedAsset && (
        <div style={{
          borderRadius: 'var(--r)', padding: '8px 12px',
          background: 'var(--bg-elevated)', border: `1px solid ${signalColor}`,
          fontSize: 12,
        }}>
          <span className="caption">Signal : </span>
          <span style={{ fontWeight: 700, color: signalColor }}>{signalLabel}</span>
          <span className="caption" style={{ marginLeft: 8 }}>{signal.reason}</span>
        </div>
      )}

      {/* Bandeau marché fermé */}
      {selectedAsset && !marketStatus.open && (
        <div style={{
          background: 'rgba(235, 87, 87, 0.12)',
          border: '1px solid var(--danger)',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>🔴</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: 13 }}>
              Marché actuellement fermé
            </div>
            <div style={{ color: 'var(--ink-subtle)', fontSize: 12, marginTop: 2 }}>
              {marketStatus.message}
            </div>
            <div style={{ color: 'var(--ink-subtle)', fontSize: 11, marginTop: 4 }}>
              Les ordres Market seront exécutés au dernier cours connu (clôture précédente).
              Les ordres Limite/Stop resteront en attente jusqu'au prochain refresh.
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {validationError && qty > 0 && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{validationError}</p>}
      {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>}
      {success && <p style={{ fontSize: 12, color: 'var(--success)', margin: 0 }}>{success}</p>}

      {/* Bouton */}
      <button
        className={`btn btn-sm ${side === 'buy' ? 'btn-primary' : ''}`}
        style={side === 'sell' ? { background: 'var(--danger)', color: 'white' } : {}}
        onClick={handleSubmit}
        disabled={submitDisabled}
      >
        {orderType === 'oco' ? 'Créer l\'OCO' : side === 'buy' ? 'Acheter' : 'Vendre'} {qty > 0 && selectedAsset ? `${qty} × ${selectedAsset.ticker}` : ''}
      </button>
    </div>
  )
}

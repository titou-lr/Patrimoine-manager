import { useState, useEffect, useMemo } from 'react'
import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { FINANCE_ASSETS } from '../../data/financeAssets'
import { fetchHistorical, fetchQuotes } from '../../services/priceService'
import { executeMarketOrder } from '../../engine/tradingEngine'
import { getStrategy } from '../../engine/strategies/index'
import type { AssetClass, Order, OrderSide, OrderType, PriceQuote } from '../../types/finance'

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
  const [orderType, setOrderType] = useState<OrderType>('market')
  const [quantity, setQuantity] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [currentQuote, setCurrentQuote] = useState<PriceQuote | null>(null)
  const currentPrice = currentQuote?.price ?? null
  const [signal, setSignal] = useState<{ type: string; reason: string } | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
  const maxQty = currentPrice && currentPrice > 0
    ? Math.floor(cashBalance / (currentPrice * (1 + (account?.feeRate ?? 0))))
    : 0

  const positionForAsset = accountPositions.find(p => p.assetId === selectedAssetId)
  const maxSellQty = positionForAsset?.quantity ?? 0

  const qty = parseFloat(quantity) || 0
  const price = currentPrice ?? 0
  const lPrice = parseFloat(limitPrice) || price
  const execPrice = orderType === 'market' ? price : lPrice
  const estimatedFees = execPrice * qty * (account?.feeRate ?? 0)
  const totalCost = execPrice * qty + (side === 'buy' ? estimatedFees : -estimatedFees)
  const cashAfter = side === 'buy' ? cashBalance - totalCost : cashBalance + totalCost

  function setQtyFromPct(pct: number) {
    if (side === 'buy') {
      const q = Math.floor(maxQty * pct)
      setQuantity(String(q))
    } else {
      const q = Math.floor(maxSellQty * pct)
      setQuantity(String(q))
    }
  }

  const marketStatus = selectedAsset ? isMarketOpen(selectedAsset.assetClass) : { open: true, message: '' }

  function handleSubmit() {
    if (!account || !selectedAsset || qty <= 0) return
    setError('')
    setSuccess('')

    const order: Order = {
      id: genId(),
      assetId: selectedAssetId,
      ticker: selectedAsset.ticker,
      side,
      type: orderType,
      quantity: qty,
      limitPrice: orderType !== 'market' ? lPrice : undefined,
      status: orderType === 'market' ? 'filled' : 'pending',
      createdAt: Date.now(),
      strategyId: activeStrategyId[accountId],
    }

    if (orderType === 'market') {
      if (!currentQuote) { setError('Prix non disponible'); return }
      const execPx = marketStatus.open ? currentQuote.price : (currentQuote.previousClose || currentQuote.price)
      const note = marketStatus.open ? undefined : 'Exécuté hors séance (marché fermé)'
      const result = executeMarketOrder(order, execPx, account, accountPositions, accountTrades)
      if (result.error) { setError(result.error); return }
      updateTradingAccount(accountId, { cashBalance: result.updatedAccount.cashBalance })
      setPositions(accountId, result.updatedPositions)
      setTrades(accountId, result.updatedTrades)
      addOrder(accountId, { ...result.filledOrder })
      setSuccess(`${note ? '⚠️ ' : ''}Ordre exécuté : ${side === 'buy' ? 'Achat' : 'Vente'} ${qty} × ${selectedAsset.name} @ ${execPx.toFixed(2)}${note ? ` (${note})` : ''}`)
      setQuantity('')
    } else {
      addOrder(accountId, order)
      setSuccess(`Ordre en attente : ${side === 'buy' ? 'Achat' : 'Vente'} ${qty} × ${selectedAsset.name} @ ${lPrice.toFixed(2)}`)
      setQuantity('')
    }

    setTimeout(() => setSuccess(''), 3000)
  }

  const signalColor = signal?.type === 'buy' ? 'var(--success)' : signal?.type === 'sell' ? 'var(--danger)' : 'var(--ink-subtle)'
  const signalLabel = signal?.type === 'buy' ? 'ACHAT ↑' : signal?.type === 'sell' ? 'VENTE ↓' : 'NEUTRE —'

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
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
            color: 'var(--ink)', outline: 'none',
          }}
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
        <div className="row" style={{ gap: 6 }}>
          {(['market', 'limit', 'stop_loss', 'take_profit'] as OrderType[]).map(t => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`btn btn-sm ${orderType === t ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11 }}
            >
              {t === 'market' ? 'Market' : t === 'limit' ? 'Limite' : t === 'stop_loss' ? 'Stop-Loss' : 'Take-Profit'}
            </button>
          ))}
        </div>
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
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
            fontFamily: 'var(--font-mono)', color: 'var(--ink)', outline: 'none',
          }}
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

      {/* Prix limite (si non-market) */}
      {orderType !== 'market' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="caption" style={{ fontWeight: 600 }}>Prix cible</span>
          <input
            type="number"
            value={limitPrice}
            onChange={e => setLimitPrice(e.target.value)}
            placeholder={currentPrice ? currentPrice.toFixed(2) : '0.00'}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r)', padding: '7px 10px', fontSize: 13,
              fontFamily: 'var(--font-mono)', color: 'var(--ink)', outline: 'none',
            }}
          />
        </div>
      )}

      {/* Résumé */}
      {qty > 0 && execPrice > 0 && (
        <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r)', padding: '10px 12px', fontSize: 12 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="caption">Coût total</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              {totalCost.toFixed(2)} {account?.currency ?? 'EUR'}
            </span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="caption">Frais estimés</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{estimatedFees.toFixed(2)}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="caption">Cash restant</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: cashAfter < 0 ? 'var(--danger)' : 'var(--ink)' }}>
              {cashAfter.toFixed(2)}
            </span>
          </div>
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
      {error && <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>{error}</p>}
      {success && <p style={{ fontSize: 12, color: 'var(--success)', margin: 0 }}>{success}</p>}

      {/* Bouton */}
      <button
        className={`btn btn-sm ${side === 'buy' ? 'btn-primary' : ''}`}
        style={side === 'sell' ? { background: 'var(--danger)', color: 'white' } : {}}
        onClick={handleSubmit}
        disabled={!selectedAsset || qty <= 0 || (side === 'buy' && cashBalance < totalCost) || (side === 'sell' && qty > maxSellQty)}
      >
        {side === 'buy' ? 'Acheter' : 'Vendre'} {qty > 0 && selectedAsset ? `${qty} × ${selectedAsset.ticker}` : ''}
      </button>
    </div>
  )
}

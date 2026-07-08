import { useState, useEffect, useRef } from 'react'
import { FinanceSelect } from '../ui/FinanceSelect'
import { useFinanceStore } from '../../store/useFinanceStore'
import { STRATEGIES, getStrategy } from '../../engine/strategies/index'
import { fetchQuotes, fetchHistorical } from '../../services/priceService'
import { checkPendingOrders, updatePositionPrices, computeAccountStats, executeMarketOrder } from '../../engine/tradingEngine'
import { formatEur, formatPct } from '../../../utils/format'
import NumberInput from '../../../components/ui/NumberInput'
import NewAccountModal from './NewAccountModal'
import AccountSettingsModal from './AccountSettingsModal'
import OrderPanel from './OrderPanel'
import PortfolioPanel from './PortfolioPanel'
import TradeHistory from './TradeHistory'
import BacktestPanel from './BacktestPanel'
import type { Signal } from '../../types/finance'

type TradingSubTab = 'orders' | 'portfolio' | 'history' | 'backtest' | 'strategy'

interface SignalLogEntry {
  time: number
  signal: Signal
  strategyLabel: string
}

export default function TradingTab() {
  const {
    tradingAccounts, activeTradingAccountId, setActiveTradingAccount,
    positions, trades, orders,
    setPositions, setTrades, updateTradingAccount, updateOrder, cancelOrder, addOrder,
    activeStrategyId, setActiveStrategy,
    strategyParams, setStrategyParams,
  } = useFinanceStore()

  const [subTab, setSubTab] = useState<TradingSubTab>('orders')
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [showAccountSettings, setShowAccountSettings] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [signalLog, setSignalLog] = useState<SignalLogEntry[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const account = tradingAccounts.find(a => a.id === activeTradingAccountId)
  const accountPositions = activeTradingAccountId ? (positions[activeTradingAccountId] ?? []) : []
  const accountTrades = activeTradingAccountId ? (trades[activeTradingAccountId] ?? []) : []
  const accountOrders = activeTradingAccountId ? (orders[activeTradingAccountId] ?? []) : []
  const pendingOrders = accountOrders.filter(o => o.status === 'pending')

  const stratId = activeTradingAccountId ? (activeStrategyId[activeTradingAccountId] ?? 'manual') : 'manual'
  const strategy = getStrategy(stratId)
  const params = activeTradingAccountId ? (strategyParams[activeTradingAccountId] ?? {}) : {}

  const effectiveParams = (() => {
    if (!strategy) return {}
    const defaults: Record<string, number | string> = {}
    strategy.params.forEach(p => { defaults[p.key] = p.defaultValue })
    return { ...defaults, ...params }
  })()

  const pricesMap = new Map(accountPositions.map(p => [p.assetId, p.currentPrice]))
  const stats = account ? computeAccountStats(account, accountPositions, accountTrades, pricesMap) : null

  // Auto-refresh loop
  useEffect(() => {
    if (!account?.autoRefreshEnabled || !activeTradingAccountId) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      return
    }

    const tick = async () => {
      if (!activeTradingAccountId) return
      const tickers = accountPositions.map(p => p.ticker)
        .concat(pendingOrders.map(o => o.ticker))
        .filter((v, i, arr) => arr.indexOf(v) === i)

      if (tickers.length === 0) return

      const quotes = await fetchQuotes(tickers)
      const newPrices = new Map<string, number>()
      for (const q of quotes) {
        const pos = accountPositions.find(p => p.ticker === q.ticker)
        if (pos) newPrices.set(pos.assetId, q.price)
        const ord = pendingOrders.find(o => o.ticker === q.ticker)
        if (ord) newPrices.set(ord.assetId, q.price)
      }

      // Update position prices
      if (newPrices.size > 0) {
        const updated = updatePositionPrices(accountPositions, newPrices)
        setPositions(activeTradingAccountId, updated)
      }

      // Check pending orders (limit/stop/stop-limit/trailing/OCO)
      if (pendingOrders.length > 0 && account) {
        const result = checkPendingOrders(pendingOrders, newPrices, account, accountPositions, accountTrades)
        if (result.triggeredOrders.length > 0) {
          updateTradingAccount(activeTradingAccountId, { cashBalance: result.updatedAccount.cashBalance })
          setPositions(activeTradingAccountId, result.updatedPositions)
          setTrades(activeTradingAccountId, result.updatedTrades)
          for (const o of result.triggeredOrders) {
            updateOrder(activeTradingAccountId, o.id, {
              status: 'filled', fillPrice: o.fillPrice, filledAt: o.filledAt,
              commission: o.commission, slippageApplied: o.slippageApplied,
            })
          }
        }
        // Annulations OCO
        for (const id of result.cancelledOrderIds) {
          cancelOrder(activeTradingAccountId, id)
        }
        // Patches d'état (trailing stop mis à jour, stop-limit armé)
        for (const [orderId, patch] of Object.entries(result.orderPatches)) {
          updateOrder(activeTradingAccountId, orderId, patch)
        }
      }

      // Auto strategy signal
      if (autoMode && strategy && stratId !== 'manual' && accountPositions.length > 0) {
        const firstPos = accountPositions[0]
        const candles = await fetchHistorical(firstPos.ticker, '3M')
        if (candles.length > 0) {
          const signal = strategy.run(candles, effectiveParams)
          const entry: SignalLogEntry = { time: Date.now(), signal, strategyLabel: strategy.label }
          setSignalLog(prev => [entry, ...prev].slice(0, 50))

          if (signal.type !== 'hold') {
            void 0 // static imports already available
            const ord = {
              id: `auto-${Date.now()}`,
              assetId: firstPos.assetId,
              ticker: firstPos.ticker,
              side: signal.type as 'buy' | 'sell',
              type: 'market' as const,
              quantity: signal.type === 'sell' ? firstPos.quantity : Math.floor(account!.cashBalance * 0.1 / firstPos.currentPrice),
              status: 'filled' as const,
              createdAt: Date.now(),
              strategyId: stratId,
            }
            if (ord.quantity > 0 && account) {
              const execResult = executeMarketOrder(ord, firstPos.currentPrice, account, accountPositions, accountTrades)
              if (!execResult.error) {
                updateTradingAccount(activeTradingAccountId, { cashBalance: execResult.updatedAccount.cashBalance })
                setPositions(activeTradingAccountId, execResult.updatedPositions)
                setTrades(activeTradingAccountId, execResult.updatedTrades)
                addOrder(activeTradingAccountId, execResult.filledOrder)
              }
            }
          }
        }
      }
    }

    intervalRef.current = setInterval(tick, (account.autoRefreshInterval ?? 30) * 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [account?.autoRefreshEnabled, account?.autoRefreshInterval, activeTradingAccountId, autoMode, stratId])

  const SUB_TABS: { id: TradingSubTab; label: string }[] = [
    { id: 'orders', label: 'Ordres' },
    { id: 'portfolio', label: 'Portefeuille' },
    { id: 'history', label: 'Historique' },
    { id: 'backtest', label: 'Backtest' },
    { id: 'strategy', label: 'Stratégie' },
  ]

  // No accounts yet
  if (tradingAccounts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
        <div style={{ fontSize: 40 }}>📈</div>
        <h2 className="title" style={{ fontSize: 18, marginBottom: 4 }}>Bienvenue dans le Trading Paper</h2>
        <p className="caption" style={{ maxWidth: 400, textAlign: 'center' }}>
          Entraînez-vous à trader sans risque avec un capital virtuel. Créez votre premier compte pour commencer.
        </p>
        <button className="btn btn-primary" onClick={() => setShowNewAccount(true)}>
          Créer mon premier compte
        </button>
        {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Sélecteur compte */}
        <FinanceSelect
          value={activeTradingAccountId ?? ''}
          onChange={v => setActiveTradingAccount(v)}
          options={tradingAccounts.map(a => ({ value: a.id, label: a.name }))}
          style={{ minWidth: 180 }}
        />

        <button className="btn btn-ghost btn-sm" onClick={() => setShowNewAccount(true)}>
          + Nouveau compte
        </button>
        {account && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAccountSettings(true)}
            title="Commissions, slippage, suppression"
          >
            ⚙
          </button>
        )}

        {/* KPIs rapides */}
        {stats && account && (
          <div className="row" style={{ gap: 20, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <div>
              <span className="caption">Valeur </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>
                {formatEur(stats.totalValue)}
              </span>
            </div>
            <div>
              <span className="caption">Cash </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                {formatEur(account.cashBalance)}
              </span>
            </div>
            <div>
              <span className="caption">P&L </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                color: stats.totalPnL >= 0 ? 'var(--success)' : 'var(--danger)',
              }}>
                {formatEur(stats.totalPnL)} ({formatPct(stats.totalPnLPct)})
              </span>
            </div>
            {account.autoRefreshEnabled && (
              <span style={{
                fontSize: 11, padding: '2px 7px', borderRadius: 3,
                background: 'var(--success)', color: 'white', fontWeight: 600,
              }}>
                ● LIVE
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="row" style={{ gap: 2, borderBottom: '1px solid var(--hairline)', paddingBottom: 0 }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: subTab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              padding: '7px 14px', marginBottom: -1, fontSize: 13,
              fontWeight: subTab === t.id ? 600 : 400,
              color: subTab === t.id ? 'var(--ink)' : 'var(--ink-subtle)',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTradingAccountId && (
        <>
          {subTab === 'orders' && <OrderPanel accountId={activeTradingAccountId} />}
          {subTab === 'portfolio' && <PortfolioPanel accountId={activeTradingAccountId} />}
          {subTab === 'history' && <TradeHistory accountId={activeTradingAccountId} />}
          {subTab === 'backtest' && <BacktestPanel />}
          {subTab === 'strategy' && (
            <StrategyTab
              accountId={activeTradingAccountId}
              stratId={stratId}
              strategy={strategy}
              effectiveParams={effectiveParams}
              autoMode={autoMode}
              setAutoMode={setAutoMode}
              signalLog={signalLog}
              setActiveStrategy={setActiveStrategy}
              setStrategyParams={setStrategyParams}
            />
          )}
        </>
      )}

      {showNewAccount && <NewAccountModal onClose={() => setShowNewAccount(false)} />}
      {showAccountSettings && account && (
        <AccountSettingsModal account={account} onClose={() => setShowAccountSettings(false)} />
      )}
    </div>
  )
}

// ---- Onglet Stratégie ----

interface StrategyTabProps {
  accountId: string
  stratId: string
  strategy: ReturnType<typeof getStrategy>
  effectiveParams: Record<string, number | string>
  autoMode: boolean
  setAutoMode: (v: boolean) => void
  signalLog: SignalLogEntry[]
  setActiveStrategy: (accountId: string, strategyId: string) => void
  setStrategyParams: (accountId: string, params: Record<string, number | string>) => void
}

function StrategyTab({
  accountId, stratId, strategy, effectiveParams,
  autoMode, setAutoMode, signalLog,
  setActiveStrategy, setStrategyParams,
}: StrategyTabProps) {
  const isManual = stratId === 'manual'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 className="title" style={{ fontSize: 14, margin: 0 }}>Configuration de la stratégie</h3>

        {/* Sélecteur stratégie */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="caption" style={{ fontWeight: 600 }}>Stratégie active</span>
          <FinanceSelect
            value={stratId}
            onChange={v => { setActiveStrategy(accountId, v); setStrategyParams(accountId, {}) }}
            options={STRATEGIES.map(s => ({ value: s.id, label: s.label }))}
          />
          {strategy && <p className="caption" style={{ margin: 0 }}>{strategy.description}</p>}
        </div>

        {/* Paramètres */}
        {strategy && strategy.params.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {strategy.params.map(param => (
              <div key={param.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span className="caption" style={{ fontWeight: 600 }}>{param.label}</span>
                {param.type === 'number' ? (
                  <NumberInput
                    value={Number(effectiveParams[param.key] ?? param.defaultValue)}
                    onChange={v => setStrategyParams(accountId, { ...effectiveParams, [param.key]: v })}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    size="sm"
                  />
                ) : (
                  <FinanceSelect
                    value={String(effectiveParams[param.key] ?? param.defaultValue)}
                    onChange={v => setStrategyParams(accountId, { ...effectiveParams, [param.key]: v })}
                    options={param.options ?? []}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mode auto */}
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <span className="caption" style={{ fontWeight: 600, flex: 1 }}>Mode automatique</span>
          <button
            onClick={() => !isManual && setAutoMode(!autoMode)}
            disabled={isManual}
            title={isManual ? 'Sélectionnez une stratégie non-manuelle' : undefined}
            style={{
              width: 36, height: 20, borderRadius: 10,
              background: autoMode && !isManual ? 'var(--primary)' : 'var(--hairline-strong)',
              border: 'none', cursor: isManual ? 'not-allowed' : 'pointer',
              position: 'relative', transition: 'background 0.15s',
              opacity: isManual ? 0.4 : 1,
            }}
          >
            <span style={{
              position: 'absolute', top: 2,
              left: autoMode && !isManual ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: 'white', transition: 'left 0.15s',
            }} />
          </button>
          {isManual && <span className="caption" style={{ color: 'var(--ink-subtle)', fontSize: 11 }}>Non disponible en mode manuel</span>}
          {autoMode && !isManual && (
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 3, background: 'var(--primary)', color: 'white', fontWeight: 600 }}>
              AUTO
            </span>
          )}
        </div>
      </div>

      {/* Log des signaux */}
      {signalLog.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
            <h3 className="title" style={{ fontSize: 13, margin: 0 }}>Log des signaux</h3>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {signalLog.map((entry, i) => {
              const color = entry.signal.type === 'buy' ? 'var(--success)' : entry.signal.type === 'sell' ? 'var(--danger)' : 'var(--ink-subtle)'
              const label = entry.signal.type === 'buy' ? 'ACHAT ↑' : entry.signal.type === 'sell' ? 'VENTE ↓' : 'NEUTRE —'
              return (
                <div
                  key={i}
                  className="row"
                  style={{ padding: '9px 16px', borderBottom: '1px solid var(--hairline)', gap: 12, fontSize: 12 }}
                >
                  <span style={{ color: 'var(--ink-subtle)', minWidth: 70 }}>
                    {new Date(entry.time).toLocaleTimeString('fr-FR')}
                  </span>
                  <span style={{ color, fontWeight: 700, minWidth: 70 }}>{label}</span>
                  <span className="caption">{entry.signal.reason}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-subtle)' }}>force: {(entry.signal.strength * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

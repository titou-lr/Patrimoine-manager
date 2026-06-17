import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { executeMarketOrder } from '../../engine/tradingEngine'
import { fetchQuotes } from '../../services/priceService'
import { computeAccountStats } from '../../engine/tradingEngine'
import { formatEur, formatPct } from '../../../utils/format'
import type { Order } from '../../types/finance'

interface Props {
  accountId: string
}

function genId() {
  return `ord-close-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export default function PortfolioPanel({ accountId }: Props) {
  const {
    tradingAccounts, positions, trades, orders,
    updateTradingAccount, setPositions, setTrades, addOrder, cancelOrder,
  } = useFinanceStore()

  const account = tradingAccounts.find(a => a.id === accountId)
  const accountPositions = positions[accountId] ?? []
  const accountTrades = trades[accountId] ?? []
  const accountOrders = orders[accountId] ?? []
  const pendingOrders = accountOrders.filter(o => o.status === 'pending')

  const pricesMap = new Map(accountPositions.map(p => [p.assetId, p.currentPrice]))
  const stats = account
    ? computeAccountStats(account, accountPositions, accountTrades, pricesMap)
    : null

  async function handleClosePosition(assetId: string) {
    if (!account) return
    const pos = accountPositions.find(p => p.assetId === assetId)
    if (!pos) return

    const asset = getAssetById(assetId)
    const tickers = asset ? [asset.ticker] : []
    let fillPrice = pos.currentPrice

    if (tickers.length > 0) {
      const quotes = await fetchQuotes(tickers)
      const q = quotes.find(q => q.ticker === tickers[0])
      if (q) fillPrice = q.price
    }

    const order: Order = {
      id: genId(),
      assetId,
      ticker: pos.ticker,
      side: 'sell',
      type: 'market',
      quantity: pos.quantity,
      status: 'filled',
      createdAt: Date.now(),
    }

    const result = executeMarketOrder(order, fillPrice, account, accountPositions, accountTrades)
    if (!result.error) {
      updateTradingAccount(accountId, { cashBalance: result.updatedAccount.cashBalance })
      setPositions(accountId, result.updatedPositions)
      setTrades(accountId, result.updatedTrades)
      addOrder(accountId, result.filledOrder)
    }
  }

  const pnlColor = (v: number) => v >= 0 ? 'var(--success)' : 'var(--danger)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPIs */}
      {stats && account && (
        <div className="panel" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            <div>
              <div className="caption">Valeur totale</div>
              <div className="kpi" style={{ fontSize: 15 }}>{formatEur(stats.totalValue)}</div>
            </div>
            <div>
              <div className="caption">Cash</div>
              <div className="kpi" style={{ fontSize: 15 }}>{formatEur(account.cashBalance)}</div>
            </div>
            <div>
              <div className="caption">P&L total</div>
              <div className="kpi" style={{ fontSize: 15, color: pnlColor(stats.totalPnL) }}>
                {formatEur(stats.totalPnL)} ({formatPct(stats.totalPnLPct)})
              </div>
            </div>
            <div>
              <div className="caption">Non réalisé</div>
              <div className="kpi" style={{ fontSize: 15, color: pnlColor(stats.unrealizedPnL) }}>
                {formatEur(stats.unrealizedPnL)}
              </div>
            </div>
            <div>
              <div className="caption">Réalisé</div>
              <div className="kpi" style={{ fontSize: 15, color: pnlColor(stats.realizedPnL) }}>
                {formatEur(stats.realizedPnL)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Positions */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
          <h3 className="title" style={{ fontSize: 13, margin: 0 }}>Positions ouvertes ({accountPositions.length})</h3>
        </div>
        {accountPositions.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p className="caption">Aucune position ouverte.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                {['Actif', 'Qté', 'Prix entrée moy.', 'Prix actuel', 'P&L (€)', 'P&L (%)', ''].map(h => (
                  <th key={h} className="caption" style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accountPositions.map(pos => {
                const asset = getAssetById(pos.assetId)
                return (
                  <tr key={pos.assetId} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{asset?.name ?? pos.ticker}</div>
                      <div className="caption">{pos.ticker}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{pos.quantity}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{pos.avgEntryPrice.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{pos.currentPrice.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: pnlColor(pos.unrealizedPnL) }}>
                      {formatEur(pos.unrealizedPnL)}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: pnlColor(pos.unrealizedPnLPct) }}>
                      {formatPct(pos.unrealizedPnLPct)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', fontSize: 11 }}
                        onClick={() => handleClosePosition(pos.assetId)}
                      >
                        Fermer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Ordres en attente */}
      {pendingOrders.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)' }}>
            <h3 className="title" style={{ fontSize: 13, margin: 0 }}>Ordres en attente ({pendingOrders.length})</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                {['Type', 'Actif', 'Côté', 'Prix cible', 'Qté', ''].map(h => (
                  <th key={h} className="caption" style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingOrders.map(order => {
                const asset = getAssetById(order.assetId)
                const typeLabel = order.type === 'limit' ? 'Limite' : order.type === 'stop_loss' ? 'Stop-Loss' : 'Take-Profit'
                return (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '10px 12px' }}><span className="caption">{typeLabel}</span></td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{asset?.ticker ?? order.ticker}</td>
                    <td style={{ padding: '10px 12px', color: order.side === 'buy' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {order.side === 'buy' ? 'ACHAT' : 'VENTE'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                      {order.limitPrice?.toFixed(2) ?? '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{order.quantity}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11 }}
                        onClick={() => cancelOrder(accountId, order.id)}
                      >
                        Annuler
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

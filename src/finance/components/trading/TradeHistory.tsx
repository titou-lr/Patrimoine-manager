import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { formatEur, formatPct } from '../../../utils/format'

interface Props {
  accountId: string
}

function exportTradesToCSV(trades: ReturnType<typeof useFinanceStore.getState>['trades'][string]) {
  const headers = ['Date', 'Actif', 'Ticker', 'Côté', 'Qté', 'Prix entrée', 'Prix sortie', 'P&L (€)', 'P&L (%)', 'Frais']
  const rows = trades.map(t => [
    new Date(t.closedAt).toISOString().slice(0, 10),
    getAssetById(t.assetId)?.name ?? t.ticker,
    t.ticker,
    t.side === 'buy' ? 'Achat' : 'Vente',
    t.quantity,
    t.entryPrice.toFixed(4),
    t.exitPrice.toFixed(4),
    t.realizedPnL.toFixed(2),
    t.realizedPnLPct.toFixed(2),
    t.fees.toFixed(2),
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trades-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function TradeHistory({ accountId }: Props) {
  const { trades } = useFinanceStore()
  const accountTrades = (trades[accountId] ?? []).slice().reverse()

  const totalRealizedPnL = accountTrades.reduce((s, t) => s + t.realizedPnL, 0)
  const pnlColor = (v: number) => v >= 0 ? 'var(--success)' : 'var(--danger)'

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        className="row"
        style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', alignItems: 'center', gap: 12 }}
      >
        <div style={{ flex: 1 }}>
          <h3 className="title" style={{ fontSize: 13, margin: 0 }}>Historique des trades</h3>
          <span className="caption">
            P&L réalisé total :{' '}
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: pnlColor(totalRealizedPnL) }}>
              {formatEur(totalRealizedPnL)}
            </span>
          </span>
        </div>
        {accountTrades.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12 }}
            onClick={() => exportTradesToCSV(accountTrades)}
          >
            Exporter CSV
          </button>
        )}
      </div>

      {accountTrades.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <p className="caption">Aucun trade fermé pour l'instant.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                {['Date', 'Actif', 'Côté', 'Qté', 'Prix entrée', 'Prix sortie', 'P&L (€)', 'P&L (%)'].map(h => (
                  <th key={h} className="caption" style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accountTrades.map(trade => {
                const asset = getAssetById(trade.assetId)
                return (
                  <tr key={trade.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap', color: 'var(--ink-subtle)', fontSize: 12 }}>
                      {new Date(trade.closedAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{asset?.name ?? trade.ticker}</div>
                      <div className="caption">{trade.ticker}</div>
                    </td>
                    <td style={{ padding: '9px 12px', color: trade.side === 'buy' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      {trade.side === 'buy' ? 'Achat' : 'Vente'}
                    </td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{trade.quantity}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{trade.entryPrice.toFixed(2)}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{trade.exitPrice.toFixed(2)}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: pnlColor(trade.realizedPnL) }}>
                      {formatEur(trade.realizedPnL)}
                    </td>
                    <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: pnlColor(trade.realizedPnLPct) }}>
                      {formatPct(trade.realizedPnLPct)}
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

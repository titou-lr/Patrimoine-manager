import { useMemo, useState } from 'react'
import { FinanceSelect } from '../ui/FinanceSelect'
import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { formatDuration } from '../../engine/performanceEngine'
import { formatEur, formatPct } from '../../../utils/format'
import type { Trade } from '../../types/finance'
import PerformanceDashboard from './PerformanceDashboard'

type SortKey = 'closedAt' | 'ticker' | 'quantity' | 'grossPnL' | 'netPnL' | 'rrr' | 'duration'
type ResultFilter = 'all' | 'win' | 'loss'

function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function exportJournalCSV(trades: Trade[]) {
  const headers = [
    'Instrument', 'Ticker', 'Entrée (date/heure)', 'Sortie (date/heure)',
    'Prix entrée', 'Prix sortie', 'Taille',
    'P&L brut (€)', 'P&L net (€)', 'P&L (%)', 'Commissions', 'RRR réalisé', 'Durée', 'Note',
  ]
  const rows = trades.map(t => [
    getAssetById(t.assetId)?.name ?? t.ticker,
    t.ticker,
    fmtDateTime(t.openedAt),
    fmtDateTime(t.closedAt),
    t.entryPrice.toFixed(4),
    t.exitPrice.toFixed(4),
    t.quantity,
    (t.grossPnL ?? t.realizedPnL + t.fees).toFixed(2),
    t.realizedPnL.toFixed(2),
    t.realizedPnLPct.toFixed(2),
    t.fees.toFixed(2),
    t.rrr != null ? t.rrr.toFixed(2) : '',
    formatDuration(t.closedAt - t.openedAt),
    (t.note ?? '').replace(/[\r\n;]+/g, ' '),
  ])
  const csv = [headers, ...rows].map(r => r.join(';')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `journal-trading-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function JournalTab() {
  const {
    tradingAccounts, activeTradingAccountId, setActiveTradingAccount,
    trades, updateTrade,
  } = useFinanceStore()

  const account = tradingAccounts.find(a => a.id === activeTradingAccountId)
  const accountTrades = activeTradingAccountId ? (trades[activeTradingAccountId] ?? []) : []

  const [view, setView] = useState<'journal' | 'performance'>('journal')
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('closedAt')
  const [sortAsc, setSortAsc] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  const filtered = useMemo(() => {
    return accountTrades
      .filter(t => {
        if (resultFilter === 'win' && t.realizedPnL <= 0) return false
        if (resultFilter === 'loss' && t.realizedPnL > 0) return false
        if (search) {
          const q = search.toLowerCase()
          const name = getAssetById(t.assetId)?.name.toLowerCase() ?? ''
          if (!name.includes(q) && !t.ticker.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        let diff = 0
        switch (sortKey) {
          case 'closedAt': diff = a.closedAt - b.closedAt; break
          case 'ticker': diff = a.ticker.localeCompare(b.ticker); break
          case 'quantity': diff = a.quantity - b.quantity; break
          case 'grossPnL': diff = (a.grossPnL ?? a.realizedPnL + a.fees) - (b.grossPnL ?? b.realizedPnL + b.fees); break
          case 'netPnL': diff = a.realizedPnL - b.realizedPnL; break
          case 'rrr': diff = (a.rrr ?? -Infinity) - (b.rrr ?? -Infinity); break
          case 'duration': diff = (a.closedAt - a.openedAt) - (b.closedAt - b.openedAt); break
        }
        return sortAsc ? diff : -diff
      })
  }, [accountTrades, search, resultFilter, sortKey, sortAsc])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  function SortArrow({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ color: 'var(--ink-subtle)', fontSize: 10 }}>⇅</span>
    return <span style={{ color: 'var(--primary)', fontSize: 10 }}>{sortAsc ? '↑' : '↓'}</span>
  }

  function startEditNote(t: Trade) {
    setEditingNoteId(t.id)
    setNoteDraft(t.note ?? '')
  }

  function saveNote(tradeId: string) {
    if (!activeTradingAccountId) return
    updateTrade(activeTradingAccountId, tradeId, { note: noteDraft.trim() || undefined })
    setEditingNoteId(null)
  }

  const pnlColor = (v: number) => v >= 0 ? 'var(--success)' : 'var(--danger)'

  if (tradingAccounts.length === 0) {
    return (
      <div className="panel" style={{ padding: 48, textAlign: 'center', maxWidth: 480, margin: '40px auto' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📓</div>
        <div className="title" style={{ marginBottom: 8 }}>Aucun compte de trading</div>
        <p className="caption">Créez un compte dans l'onglet Trading — chaque trade fermé sera loggé ici automatiquement.</p>
      </div>
    )
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 10px', textAlign: 'left', color: 'var(--ink-subtle)',
    fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>Journal de trading</h2>
          <p className="caption">Chaque trade fermé est loggé automatiquement — P&L net, RRR, durée, notes</p>
        </div>
        <div className="row" style={{ marginLeft: 'auto', gap: 8, alignItems: 'center' }}>
          <FinanceSelect
            value={activeTradingAccountId ?? ''}
            onChange={v => setActiveTradingAccount(v)}
            options={tradingAccounts.map(a => ({ value: a.id, label: a.name }))}
            style={{ minWidth: 170 }}
          />
        </div>
      </div>

      {/* Vue journal / performance */}
      <div className="row" style={{ gap: 2, borderBottom: '1px solid var(--hairline)' }}>
        {([['journal', 'Journal'], ['performance', 'Performance']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              background: 'none', border: 'none',
              borderBottom: view === id ? '2px solid var(--primary)' : '2px solid transparent',
              padding: '7px 14px', marginBottom: -1, fontSize: 13,
              fontWeight: view === id ? 600 : 400,
              color: view === id ? 'var(--ink)' : 'var(--ink-subtle)',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'performance' && account && (
        <PerformanceDashboard trades={accountTrades} initialCapital={account.initialCapital} />
      )}

      {view === 'journal' && (
        <>
          {/* Filtres */}
          <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer par instrument…"
              style={{
                background: 'var(--surface-1)', border: '1px solid var(--hairline)',
                borderRadius: 'var(--r-md)', padding: '5px 10px', fontSize: 12,
                color: 'var(--ink)', width: 200, outline: 'none',
              }}
            />
            <div className="row" style={{ gap: 4 }}>
              {([['all', 'Tous'], ['win', 'Gagnants'], ['loss', 'Perdants']] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setResultFilter(id)}
                  className={`btn btn-sm ${resultFilter === id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontSize: 11 }}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="caption" style={{ marginLeft: 'auto' }}>
              {filtered.length} trade{filtered.length > 1 ? 's' : ''}
            </span>
            {filtered.length > 0 && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => exportJournalCSV(filtered)}>
                ↓ Exporter CSV
              </button>
            )}
          </div>

          {/* Table */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p className="caption">Aucun trade fermé{search || resultFilter !== 'all' ? ' pour ces filtres' : ''}.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
                      <th style={thStyle} onClick={() => toggleSort('ticker')}>Instrument <SortArrow k="ticker" /></th>
                      <th style={thStyle} onClick={() => toggleSort('closedAt')}>Entrée → Sortie <SortArrow k="closedAt" /></th>
                      <th style={{ ...thStyle, textAlign: 'right', cursor: 'default' }}>Prix E / S</th>
                      <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('quantity')}>Taille <SortArrow k="quantity" /></th>
                      <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('grossPnL')}>P&L brut <SortArrow k="grossPnL" /></th>
                      <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('netPnL')}>P&L net <SortArrow k="netPnL" /></th>
                      <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('rrr')}>RRR <SortArrow k="rrr" /></th>
                      <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('duration')}>Durée <SortArrow k="duration" /></th>
                      <th style={{ ...thStyle, cursor: 'default' }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(t => {
                      const asset = getAssetById(t.assetId)
                      const gross = t.grossPnL ?? t.realizedPnL + t.fees
                      const isEditing = editingNoteId === t.id
                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--hairline)' }}>
                          <td style={{ padding: '9px 10px' }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{asset?.name ?? t.ticker}</div>
                            <div className="caption" style={{ fontSize: 10 }}>{t.ticker}</div>
                          </td>
                          <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--ink-secondary)' }}>
                            <div>{fmtDateTime(t.openedAt)}</div>
                            <div>{fmtDateTime(t.closedAt)}</div>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                            <div>{t.entryPrice.toFixed(2)}</div>
                            <div>{t.exitPrice.toFixed(2)}</div>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.quantity}</td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: pnlColor(gross) }}>
                            {formatEur(gross)}
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: pnlColor(t.realizedPnL), whiteSpace: 'nowrap' }}>
                            {formatEur(t.realizedPnL)}
                            <div className="caption" style={{ fontSize: 10, fontWeight: 400 }}>{formatPct(t.realizedPnLPct)}</div>
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: t.rrr != null ? pnlColor(t.rrr) : 'var(--ink-subtle)' }}>
                            {t.rrr != null ? t.rrr.toFixed(2) : '—'}
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--ink-secondary)' }}>
                            {formatDuration(t.closedAt - t.openedAt)}
                          </td>
                          <td style={{ padding: '9px 10px', minWidth: 160, maxWidth: 260 }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <textarea
                                  value={noteDraft}
                                  onChange={e => setNoteDraft(e.target.value)}
                                  rows={2}
                                  autoFocus
                                  placeholder="Setup, erreurs, leçons…"
                                  style={{
                                    background: 'var(--bg-elevated)', border: '1px solid var(--primary)',
                                    borderRadius: 'var(--r)', padding: '5px 8px', fontSize: 11,
                                    color: 'var(--ink)', outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                                  }}
                                />
                                <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => setEditingNoteId(null)}>Annuler</button>
                                  <button className="btn btn-primary btn-sm" style={{ fontSize: 10 }} onClick={() => saveNote(t.id)}>Enregistrer</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEditNote(t)}
                                title="Cliquer pour éditer la note"
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                                  fontSize: 11, color: t.note ? 'var(--ink-secondary)' : 'var(--ink-subtle)',
                                  padding: 0, width: '100%', fontStyle: t.note ? 'normal' : 'italic',
                                }}
                              >
                                {t.note ?? '+ ajouter une note'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

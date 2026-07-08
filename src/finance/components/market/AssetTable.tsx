import { useEffect, useState, useCallback } from 'react'
import type { FinanceAsset, PriceQuote } from '../../types/finance'
import type { AssetClass } from '../../types/finance'
import { fetchQuotes, clearPriceCache } from '../../services/priceService'
import { useFinanceStore, getAssetById } from '../../store/useFinanceStore'
import { checkAlerts, conditionDisplay } from '../../services/alertsService'
import { formatPrice } from '../../../utils/format'

const CLASS_LABELS: Record<AssetClass, string> = {
  equity: 'Action',
  etf: 'ETF',
  crypto: 'Crypto',
  forex: 'Forex',
  commodity: 'Matière 1ère',
  bond: 'Obligation',
}

const CLASS_COLORS: Record<AssetClass, string> = {
  equity: '#5e6ad2',
  etf: '#4cb782',
  crypto: '#f59e0b',
  forex: '#06b6d4',
  commodity: '#8b5cf6',
  bond: '#64748b',
}

function formatVolume(vol: number | undefined): string {
  if (vol == null) return '—'
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`
  return vol.toString()
}

type SortKey = 'name' | 'price' | 'change' | 'changePct' | 'volume'

interface Props {
  assets: FinanceAsset[]
  showWatchlistToggle?: boolean
  onAddToWatchlist?: (id: string) => void
  onAlertToast?: (msg: string) => void
}

export default function AssetTable({ assets, showWatchlistToggle = true, onAddToWatchlist, onAlertToast }: Props) {
  const { watchlist, addToWatchlist, removeFromWatchlist, setSelectedAssetId, setActiveTab } = useFinanceStore()
  const [quotes, setQuotes] = useState<Map<string, PriceQuote>>(new Map())
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [classFilter, setClassFilter] = useState<AssetClass | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)

  const loadQuotes = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    if (forceRefresh) clearPriceCache()
    const tickers = assets.map((a) => a.ticker)
    const result = await fetchQuotes(tickers)
    const map = new Map<string, PriceQuote>()
    for (const q of result) map.set(q.ticker, q)
    setQuotes(map)
    if (result.length > 0) {
      const ts = result.reduce((max, q) => Math.max(max, q.timestamp), 0)
      setLastUpdated(ts)
    }
    setLoading(false)

    // Check price alerts after refresh
    if (onAlertToast) {
      const store = useFinanceStore.getState()
      const triggered = checkAlerts(
        store.priceAlerts,
        map,
        (assetId) => getAssetById(assetId)?.ticker
      )
      for (const alertId of triggered) {
        const alert = store.priceAlerts.find(a => a.id === alertId)
        if (alert) {
          store.triggerPriceAlert(alertId)
          const asset = getAssetById(alert.assetId)
          onAlertToast(`🔔 Alerte : ${asset?.name ?? alert.assetId} — ${conditionDisplay(alert.condition, alert.threshold)}`)
        }
      }
    }
  }, [assets, onAlertToast])

  useEffect(() => { loadQuotes() }, [loadQuotes])

  const watchlistIds = new Set(watchlist.map((w) => w.assetId))

  const filtered = assets
    .filter((a) => classFilter === 'all' || a.assetClass === classFilter)
    .filter((a) =>
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.ticker.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const qa = quotes.get(a.ticker)
      const qb = quotes.get(b.ticker)
      let diff = 0
      if (sortKey === 'name') diff = a.name.localeCompare(b.name)
      else if (sortKey === 'price') diff = (qa?.price ?? 0) - (qb?.price ?? 0)
      else if (sortKey === 'change') diff = (qa?.change ?? 0) - (qb?.change ?? 0)
      else if (sortKey === 'changePct') diff = (qa?.changePct ?? 0) - (qb?.changePct ?? 0)
      else if (sortKey === 'volume') diff = (qa?.volume ?? 0) - (qb?.volume ?? 0)
      return sortAsc ? diff : -diff
    })

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v)
    else { setSortKey(key); setSortAsc(true) }
  }

  function SortArrow({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ color: 'var(--ink-subtle)', fontSize: 10 }}>⇅</span>
    return <span style={{ color: 'var(--primary)', fontSize: 10 }}>{sortAsc ? '↑' : '↓'}</span>
  }

  function handleAnalyze(assetId: string) {
    setSelectedAssetId(assetId)
    setActiveTab('analysis')
  }

  const lastUpdatedLabel = lastUpdated
    ? (() => {
        const diff = Math.round((Date.now() - lastUpdated) / 60000)
        if (diff < 1) return 'À l\'instant'
        if (diff === 1) return 'Il y a 1 min'
        return `Il y a ${diff} min`
      })()
    : null

  const classes: Array<AssetClass | 'all'> = ['all', 'equity', 'etf', 'crypto', 'forex', 'commodity', 'bond']
  const classLabels: Record<string, string> = {
    all: 'Tous',
    equity: 'Actions',
    etf: 'ETF',
    crypto: 'Crypto',
    forex: 'Forex',
    commodity: 'Matières 1ères',
    bond: 'Obligations',
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="row" style={{ gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Class filter chips */}
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {classes.map((c) => (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              style={{
                padding: '3px 10px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: classFilter === c ? 'var(--primary)' : 'var(--hairline)',
                background: classFilter === c ? 'var(--primary)' : 'transparent',
                color: classFilter === c ? '#fff' : 'var(--ink-secondary)',
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {classLabels[c]}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un actif…"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-md)',
            padding: '5px 10px',
            fontSize: 12,
            color: 'var(--ink)',
            width: 180,
            outline: 'none',
          }}
        />

        {/* Last updated + refresh */}
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {lastUpdatedLabel && (
            <span style={{ fontSize: 11, color: 'var(--ink-subtle)' }}>
              ⟳ {lastUpdatedLabel}
            </span>
          )}
          <button
            className="btn"
            onClick={() => loadQuotes(true)}
            disabled={loading}
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--hairline)' }}>
              {showWatchlistToggle && (
                <th style={{ width: 32, padding: '8px 6px', textAlign: 'center', color: 'var(--ink-subtle)', fontWeight: 500, position: 'sticky', top: 0, background: 'var(--canvas)' }}>
                  ⭐
                </th>
              )}
              <th
                style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--ink-subtle)', fontWeight: 500, cursor: 'pointer', position: 'sticky', top: 0, background: 'var(--canvas)', whiteSpace: 'nowrap' }}
                onClick={() => toggleSort('name')}
              >
                Nom <SortArrow k="name" />
              </th>
              <th
                style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500, cursor: 'pointer', position: 'sticky', top: 0, background: 'var(--canvas)' }}
                onClick={() => toggleSort('price')}
              >
                Prix <SortArrow k="price" />
              </th>
              <th
                style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500, cursor: 'pointer', position: 'sticky', top: 0, background: 'var(--canvas)', whiteSpace: 'nowrap' }}
                onClick={() => toggleSort('change')}
              >
                Var. 24h <SortArrow k="change" />
              </th>
              <th
                style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500, cursor: 'pointer', position: 'sticky', top: 0, background: 'var(--canvas)', whiteSpace: 'nowrap' }}
                onClick={() => toggleSort('changePct')}
              >
                % 24h <SortArrow k="changePct" />
              </th>
              <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500, position: 'sticky', top: 0, background: 'var(--canvas)' }}>
                Ouverture
              </th>
              <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500, position: 'sticky', top: 0, background: 'var(--canvas)', whiteSpace: 'nowrap' }}>
                Haut / Bas
              </th>
              <th
                style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500, cursor: 'pointer', position: 'sticky', top: 0, background: 'var(--canvas)' }}
                onClick={() => toggleSort('volume')}
              >
                Volume <SortArrow k="volume" />
              </th>
              <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--ink-subtle)', fontWeight: 500, position: 'sticky', top: 0, background: 'var(--canvas)' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && filtered.length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--hairline)' }}>
                    {Array.from({ length: showWatchlistToggle ? 9 : 8 }).map((_, j) => (
                      <td key={j} style={{ padding: '10px 10px' }}>
                        <div
                          style={{
                            height: 14,
                            borderRadius: 4,
                            background: 'var(--hairline)',
                            width: j === 1 ? '120px' : '60px',
                            animation: 'pulse 1.5s ease-in-out infinite',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((asset) => {
                  const q = quotes.get(asset.ticker)
                  const inWatchlist = watchlistIds.has(asset.id)
                  const pctColor = !q
                    ? 'var(--ink)'
                    : q.changePct >= 0
                    ? 'var(--success)'
                    : 'var(--danger)'

                  return (
                    <tr
                      key={asset.id}
                      style={{ borderBottom: '1px solid var(--hairline)', cursor: 'pointer' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-1)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => handleAnalyze(asset.id)}
                    >
                      {showWatchlistToggle && (
                        <td style={{ padding: '8px 6px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() =>
                              inWatchlist ? removeFromWatchlist(asset.id) : addToWatchlist(asset.id)
                            }
                            title={inWatchlist ? 'Retirer de la watchlist' : 'Ajouter à la watchlist'}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: 14,
                              opacity: inWatchlist ? 1 : 0.3,
                              lineHeight: 1,
                              padding: 0,
                            }}
                          >
                            ⭐
                          </button>
                        </td>
                      )}
                      <td style={{ padding: '8px 10px' }}>
                        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 13 }}>{asset.name}</div>
                            <div className="row" style={{ gap: 5, marginTop: 2, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--ink-subtle)', fontFamily: 'var(--font-mono)' }}>
                                {asset.ticker}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  background: CLASS_COLORS[asset.assetClass] + '22',
                                  color: CLASS_COLORS[asset.assetClass],
                                  fontWeight: 600,
                                  letterSpacing: 0.3,
                                }}
                              >
                                {CLASS_LABELS[asset.assetClass]}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>
                        {q ? formatPrice(q.price, asset.currency) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: pctColor }}>
                        {q ? (q.change >= 0 ? '+' : '') + formatPrice(q.change, asset.currency) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: pctColor, fontWeight: 600 }}>
                        {q
                          ? (q.changePct >= 0 ? '+' : '') + q.changePct.toFixed(2) + '%'
                          : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-secondary)' }}>
                        {q ? formatPrice(q.open, asset.currency) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-secondary)', whiteSpace: 'nowrap' }}>
                        {q ? (
                          <>
                            <span style={{ color: 'var(--success)' }}>{formatPrice(q.high, asset.currency)}</span>
                            {' / '}
                            <span style={{ color: 'var(--danger)' }}>{formatPrice(q.low, asset.currency)}</span>
                          </>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-secondary)' }}>
                        {formatVolume(q?.volume)}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        {onAddToWatchlist ? (
                          <button
                            className="btn"
                            onClick={() => onAddToWatchlist(asset.id)}
                            style={{ fontSize: 11, padding: '3px 8px' }}
                          >
                            + Watchlist
                          </button>
                        ) : (
                          <button
                            className="btn"
                            onClick={() => handleAnalyze(asset.id)}
                            style={{ fontSize: 11, padding: '3px 8px' }}
                          >
                            Analyser →
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={showWatchlistToggle ? 9 : 8}
                  style={{ padding: 32, textAlign: 'center', color: 'var(--ink-subtle)', fontSize: 13 }}
                >
                  Aucun actif ne correspond à votre recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

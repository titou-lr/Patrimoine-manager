import { useEffect, useRef, useState } from 'react'
import { useFinanceStore, useAllAssets } from '../../store/useFinanceStore'
import { searchSymbols } from '../../services/priceService'
import type { FinanceAsset } from '../../types/finance'
import AssetTable from './AssetTable'

interface Props {
  onAlertToast?: (msg: string) => void
}

/** Champ de recherche avec autocomplete — interroge Yahoo Finance en live */
function AssetSearch({ onAlertToast }: { onAlertToast?: (msg: string) => void }) {
  const { addCustomAsset, addToWatchlist, setSelectedAssetId, setActiveTab } = useFinanceStore()
  const allAssets = useAllAssets()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FinanceAsset[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) { setResults([]); setSearching(false); return }
    setSearching(true)
    debounceRef.current = window.setTimeout(async () => {
      const remote = await searchSymbols(q)
      // Dédoublonner avec les actifs déjà connus (même ticker → garder l'existant)
      const knownByTicker = new Map(allAssets.map(a => [a.ticker, a]))
      setResults(remote.map(r => knownByTicker.get(r.ticker) ?? r))
      setSearching(false)
    }, 350)
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function handlePick(asset: FinanceAsset, analyze: boolean) {
    const known = allAssets.some(a => a.ticker === asset.ticker)
    if (!known) addCustomAsset(asset)
    addToWatchlist(asset.id)
    onAlertToast?.(`${asset.name} ajouté à la watchlist`)
    setOpen(false)
    setQuery('')
    if (analyze) {
      setSelectedAssetId(asset.id)
      setActiveTab('analysis')
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 340, maxWidth: '100%' }}>
      <input
        className="input"
        value={query}
        placeholder="Rechercher un titre, ETF, crypto… (nom ou ticker)"
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        style={{ fontSize: 13 }}
      />
      {open && query.trim().length >= 2 && (
        <div style={{
          position: 'absolute', top: 36, left: 0, right: 0, zIndex: 60,
          background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-pop)',
          maxHeight: 320, overflowY: 'auto', padding: 4,
        }}>
          {searching && (
            <div className="caption" style={{ padding: '10px 12px' }}>Recherche…</div>
          )}
          {!searching && results.length === 0 && (
            <div className="caption" style={{ padding: '10px 12px' }}>
              Aucun résultat pour « {query.trim()} »
            </div>
          )}
          {!searching && results.map(r => (
            <div
              key={r.ticker}
              className="cmd-row"
              style={{ margin: 0, height: 'auto', padding: '7px 10px' }}
              onClick={() => handlePick(r, false)}
            >
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="subhead" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </div>
                <div className="caption" style={{ fontSize: 11 }}>
                  <span className="mono">{r.ticker}</span>
                  {r.description ? ` · ${r.description}` : ''} · {r.currency}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, flexShrink: 0 }}
                onClick={e => { e.stopPropagation(); handlePick(r, true) }}
              >
                Analyser →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MarketTab({ onAlertToast }: Props) {
  const { watchlist, addToWatchlist } = useFinanceStore()
  const allAssets = useAllAssets()
  const [showAll, setShowAll] = useState(false)

  const watchlistIds = new Set(watchlist.map((w) => w.assetId))
  const watchlistAssets = allAssets.filter((a) => watchlistIds.has(a.id))
  const otherAssets = allAssets.filter((a) => !watchlistIds.has(a.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Module header */}
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        <div>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>Marché</h2>
          <p className="caption">Cours en temps réel — {watchlistAssets.length} actifs en watchlist</p>
        </div>
        <div className="row" style={{ marginLeft: 'auto', gap: 12, alignItems: 'center' }}>
          <AssetSearch onAlertToast={onAlertToast} />
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--success)',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--success)',
                display: 'inline-block',
                animation: 'livepulse 1.6s ease-in-out infinite',
              }}
            />
            LIVE
          </span>
        </div>
      </div>

      {/* Watchlist table */}
      {watchlistAssets.length > 0 ? (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--hairline)' }}>
            <span className="eyebrow">Ma watchlist</span>
          </div>
          <div style={{ padding: '0 4px 4px' }}>
            <AssetTable assets={watchlistAssets} showWatchlistToggle onAlertToast={onAlertToast} />
          </div>
        </div>
      ) : (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-subtle)', fontSize: 13 }}>
            Votre watchlist est vide. Ajoutez des actifs depuis le tableau ci-dessous.
          </p>
        </div>
      )}

      {/* All assets section (collapsible) */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          className="row"
          style={{
            padding: '14px 16px',
            borderBottom: showAll ? '1px solid var(--hairline)' : 'none',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={() => setShowAll((v) => !v)}
        >
          <span className="eyebrow grow">
            Tous les actifs ({otherAssets.length} hors watchlist)
          </span>
          <span style={{ fontSize: 11, color: 'var(--ink-subtle)', transition: 'transform 0.2s', transform: showAll ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
            ▼
          </span>
        </div>
        {showAll && (
          <div style={{ padding: '0 4px 4px' }}>
            <AssetTable
              assets={otherAssets}
              showWatchlistToggle={false}
              onAddToWatchlist={addToWatchlist}
            />
          </div>
        )}
      </div>
    </div>
  )
}

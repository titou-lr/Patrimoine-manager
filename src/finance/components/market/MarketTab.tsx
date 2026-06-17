import { useState } from 'react'
import { useFinanceStore } from '../../store/useFinanceStore'
import { FINANCE_ASSETS } from '../../data/financeAssets'
import AssetTable from './AssetTable'

interface Props {
  onAlertToast?: (msg: string) => void
}

export default function MarketTab({ onAlertToast }: Props) {
  const { watchlist, addToWatchlist } = useFinanceStore()
  const [showAll, setShowAll] = useState(false)

  const watchlistIds = new Set(watchlist.map((w) => w.assetId))
  const watchlistAssets = FINANCE_ASSETS.filter((a) => watchlistIds.has(a.id))
  const otherAssets = FINANCE_ASSETS.filter((a) => !watchlistIds.has(a.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Module header */}
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        <div>
          <h2 className="title" style={{ fontSize: 18, marginBottom: 2 }}>Marché</h2>
          <p className="caption">Cours en temps réel — {watchlistAssets.length} actifs en watchlist</p>
        </div>
        <div className="row" style={{ marginLeft: 'auto', gap: 6, alignItems: 'center' }}>
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

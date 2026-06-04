import { useState, useMemo } from 'react'
import type { MarketAsset, AssetCategory } from '../../types/data'
import type { EnvelopeType } from '../../types'

interface Props {
  assets: MarketAsset[]
  onUseAsset: (name: string, expectedReturn: number, envelopeId?: string) => void
  activeEnvelopes: { id: string; label: string; type: EnvelopeType }[]
}

type SortKey = 'name' | 'returnAvg10y' | 'returnAvg5y' | 'risk'
type SortDir = 'asc' | 'desc'

const ALL_CATEGORIES: AssetCategory[] = [
  'ETF', 'Livrets', 'Crypto', 'Immobilier', 'Obligations', 'Actions', 'Or', 'Monétaire', 'Fonds euros',
]

export default function AssetsTab({ assets, onUseAsset, activeEnvelopes }: Props) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<AssetCategory | 'Tous'>('Tous')
  const [sortKey, setSortKey] = useState<SortKey>('returnAvg10y')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [pendingAsset, setPendingAsset] = useState<MarketAsset | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return assets
      .filter((a) => {
        if (category !== 'Tous' && a.category !== category) return false
        if (q && !a.name.toLowerCase().includes(q) && !a.ticker?.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        if (sortKey === 'name') {
          return sortDir === 'asc'
            ? a.name.localeCompare(b.name, 'fr')
            : b.name.localeCompare(a.name, 'fr')
        }
        const av = a[sortKey] ?? 0
        const bv = b[sortKey] ?? 0
        return sortDir === 'asc' ? av - bv : bv - av
      })
  }, [assets, search, category, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  function handleUse(asset: MarketAsset) {
    if (activeEnvelopes.length <= 1) {
      onUseAsset(asset.name, asset.returnAvg10y, activeEnvelopes[0]?.id)
    } else {
      setPendingAsset(asset)
    }
  }

  function handlePickEnvelope(envelopeId: string) {
    if (!pendingAsset) return
    onUseAsset(pendingAsset.name, pendingAsset.returnAvg10y, envelopeId)
    setPendingAsset(null)
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return null
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="h-full flex flex-col">

      {/* Barre filtres */}
      <div className="shrink-0 px-6 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Rechercher nom ou ticker…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 px-3 py-1.5 rounded-lg bg-card border border-border text-sm placeholder-muted/40 focus:outline-none focus:border-purple/40"
        />
        <div className="flex flex-wrap gap-1">
          {(['Tous', ...ALL_CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                category === cat
                  ? 'bg-purple/10 text-purple border border-purple/20'
                  : 'bg-card border border-border text-muted hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-muted/50 hidden md:inline">
          {filtered.length} actif{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-base z-10">
            <tr className="text-[11px] text-muted/60 uppercase tracking-wide border-b border-border">
              <th className="text-left px-6 py-2 font-medium cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('name')}>
                Nom{sortIndicator('name')}
              </th>
              <th className="text-left px-3 py-2 font-medium">Catégorie</th>
              <th className="text-right px-3 py-2 font-medium cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('returnAvg10y')}>
                Rend. 10 ans{sortIndicator('returnAvg10y')}
              </th>
              <th className="text-right px-3 py-2 font-medium cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('returnAvg5y')}>
                Rend. 5 ans{sortIndicator('returnAvg5y')}
              </th>
              <th className="text-right px-3 py-2 font-medium hidden lg:table-cell">Prix live</th>
              <th className="text-right px-3 py-2 font-medium hidden lg:table-cell">Var. 24h</th>
              <th className="text-center px-3 py-2 font-medium cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('risk')}>
                Risque{sortIndicator('risk')}
              </th>
              <th className="text-left px-3 py-2 font-medium hidden xl:table-cell">Volatilité</th>
              <th className="px-6 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {filtered.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={asset}
                onUse={() => handleUse(asset)}
              />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted text-sm">Aucun actif trouvé</div>
        )}
      </div>

      {/* Picker enveloppe */}
      {pendingAsset && (
        <EnvelopePicker
          asset={pendingAsset}
          envelopes={activeEnvelopes}
          onPick={handlePickEnvelope}
          onCancel={() => setPendingAsset(null)}
        />
      )}
    </div>
  )
}

// ── Ligne tableau ──────────────────────────────────────────────────────────────

function AssetRow({ asset, onUse }: { asset: MarketAsset; onUse: () => void }) {
  const isLive = asset.source === 'live'

  return (
    <tr className="hover:bg-card/40 transition-colors group">
      <td className="px-6 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate max-w-[180px]">{asset.name}</span>
          {asset.ticker && (
            <span className="text-[10px] text-muted/50 font-mono shrink-0">{asset.ticker}</span>
          )}
          {isLive && (
            <span className="flex items-center gap-1 text-[9px] font-medium bg-success/8 border border-success/20 text-success rounded-full px-1.5 py-0.5 shrink-0">
              <span className="w-1 h-1 rounded-full bg-success animate-live" />
              LIVE
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted/50 mt-0.5 max-w-xs truncate">{asset.description}</div>
      </td>

      <td className="px-3 py-2.5">
        <span className="text-xs text-muted/70">{asset.category}</span>
      </td>

      <td className="px-3 py-2.5 text-right">
        <span className="text-success font-medium text-xs font-mono tabular-nums">
          {asset.returnAvg10y != null ? `+${asset.returnAvg10y.toFixed(1)} %` : '—'}
        </span>
      </td>

      <td className="px-3 py-2.5 text-right">
        <span className="text-muted text-xs">
          {asset.returnAvg5y != null ? `+${asset.returnAvg5y.toFixed(1)} %` : '—'}
        </span>
      </td>

      <td className="px-3 py-2.5 text-right font-mono text-xs hidden lg:table-cell text-muted">
        {asset.lastPrice != null
          ? `${asset.lastPrice.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${asset.currency}`
          : '—'
        }
      </td>

      <td className="px-3 py-2.5 text-right text-xs hidden lg:table-cell">
        {asset.change24h != null
          ? <span className={`font-mono tabular-nums ${asset.change24h >= 0 ? 'text-success' : 'text-danger'}`}>
              {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)} %
            </span>
          : <span className="text-muted/40">—</span>
        }
      </td>

      <td className="px-3 py-2.5 text-center">
        <RiskDots risk={asset.risk} />
      </td>

      <td className="px-3 py-2.5 hidden xl:table-cell">
        <span className="text-[11px] text-muted/60">{asset.volatility}</span>
      </td>

      <td className="px-6 py-2.5">
        <button
          onClick={onUse}
          className="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-lg text-[11px] border border-purple/30 text-purple hover:bg-purple/10 transition-all whitespace-nowrap"
        >
          Utiliser
        </button>
      </td>
    </tr>
  )
}

function RiskDots({ risk }: { risk: number }) {
  const color =
    risk <= 2 ? 'bg-success' :
    risk <= 4 ? 'bg-warning' :
    risk <= 6 ? 'bg-orange' :
    'bg-danger'

  return (
    <div className="flex gap-0.5 justify-center items-center" title={`Risque ${risk}/7`}>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < risk ? color : 'bg-border'}`} />
      ))}
    </div>
  )
}

// ── Picker enveloppe ───────────────────────────────────────────────────────────

interface PickerProps {
  asset: MarketAsset
  envelopes: { id: string; label: string; type: EnvelopeType }[]
  onPick: (id: string) => void
  onCancel: () => void
}

function EnvelopePicker({ asset, envelopes, onPick, onCancel }: PickerProps) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-base/80">
      <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-2xl">
        <h3 className="font-semibold text-sm mb-1">Choisir l'enveloppe</h3>
        <p className="text-xs text-muted mb-4">
          Ajouter <strong className="text-foreground">{asset.name}</strong> dans quelle enveloppe ?
        </p>
        <div className="flex flex-col gap-2">
          {envelopes.map((env) => (
            <button
              key={env.id}
              onClick={() => onPick(env.id)}
              className="w-full text-left px-3 py-2 rounded-xl border border-border hover:border-purple/40 hover:bg-purple/5 text-sm transition-colors"
            >
              {env.label}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 w-full text-center text-xs text-muted hover:text-foreground transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

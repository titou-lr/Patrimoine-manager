import { useState, useEffect } from 'react'
import {
  fetchLiveData,
  clearCache,
  getCachedAssets,
  getCacheAgeMs,
} from '../../services/marketDataService'
import AssetsTab from './AssetsTab'
import BanksTab from './BanksTab'
import GlossaryModal from '../ui/GlossaryModal'
import type { MarketAsset } from '../../types/data'
import type { EnvelopeFees, EnvelopeType } from '../../types'

interface Props {
  onClose: () => void
  onUseAsset: (name: string, expectedReturn: number, envelopeId?: string) => void
  activeEnvelopes: { id: string; label: string; type: EnvelopeType }[]
  feesImport?: { envelopeType: EnvelopeType; envelopeLabel: string }
  onApplyFees?: (fees: EnvelopeFees) => void
}

type TabId = 'assets' | 'banks' | 'glossary'
type LoadState = 'idle' | 'loading' | 'done' | 'error'

export default function DataModal({ onClose, onUseAsset, activeEnvelopes, feesImport, onApplyFees }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>(feesImport ? 'banks' : 'assets')
  const [assets, setAssets] = useState<MarketAsset[]>(() => getCachedAssets() ?? [])
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [cacheAgeMs, setCacheAgeMs] = useState<number | null>(() => getCacheAgeMs())

  useEffect(() => {
    if (assets.length === 0) handleRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleRefresh() {
    setLoadState('loading')
    try {
      clearCache()
      const fresh = await fetchLiveData()
      setAssets(fresh)
      setCacheAgeMs(0)
      setLoadState('done')
    } catch {
      setLoadState('error')
    }
  }

  const cacheLabel = cacheAgeMs !== null
    ? cacheAgeMs < 60_000
      ? 'À l\'instant'
      : `Il y a ${Math.floor(cacheAgeMs / 60_000)} min`
    : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-base">

      {/* En-tête */}
      <div className="shrink-0 bg-surface border-b border-border px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <DatabaseIcon />
          <span className="font-medium text-sm text-foreground">Banque de données financières</span>
          {/* Count badge */}
          {assets.length > 0 && (
            <span className="text-[10px] font-medium bg-elevated border border-border text-muted rounded-full px-2 py-0.5 tabular-nums">
              {assets.length} actifs
            </span>
          )}
          {/* LIVE badge */}
          {loadState === 'done' && (
            <span className="flex items-center gap-1 text-[10px] font-medium bg-success/8 border border-success/20 text-success rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-live" />
              LIVE
            </span>
          )}
          {loadState === 'error' && (
            <span className="text-[10px] text-danger">API indisponible — données statiques</span>
          )}
        </div>

        {/* Onglets internes */}
        <div className="flex gap-1 ml-4">
          {(['assets', 'banks', 'glossary'] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-elevated text-foreground border border-border'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {tab === 'assets' ? 'Actifs financiers'
                : tab === 'banks' ? 'Frais bancaires'
                : 'Glossaire'}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {activeTab === 'assets' && (
            <div className="flex items-center gap-2">
              {cacheLabel && (
                <span className="text-[10px] text-muted/50 hidden sm:inline">MAJ {cacheLabel}</span>
              )}
              <button
                onClick={handleRefresh}
                disabled={loadState === 'loading'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border text-muted hover:text-foreground hover:border-border-mid disabled:opacity-40"
              >
                <RefreshIcon spinning={loadState === 'loading'} />
                Mettre à jour
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-elevated text-sm"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'assets' && (
          <AssetsTab
            assets={assets}
            onUseAsset={onUseAsset}
            activeEnvelopes={activeEnvelopes}
          />
        )}
        {activeTab === 'banks' && (
          <BanksTab
            feesImport={feesImport}
            onApplyFees={onApplyFees}
          />
        )}
        {activeTab === 'glossary' && (
          <div className="h-full overflow-y-auto">
            <GlossaryInline />
          </div>
        )}
      </div>
    </div>
  )
}

function GlossaryInline() {
  return <GlossaryModal onClose={() => undefined} _inline />
}

function DatabaseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="text-muted">
      <ellipse cx="7.5" cy="3.5" rx="6" ry="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 3.5v3c0 1.1 2.69 2 6 2s6-.9 6-2v-3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 6.5v3c0 1.1 2.69 2 6 2s6-.9 6-2v-3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 9.5v2c0 1.1 2.69 2 6 2s6-.9 6-2v-2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={spinning ? 'animate-spin' : ''}>
      <path d="M10.5 6A4.5 4.5 0 1 1 6 1.5V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M6 0.5L6 3.5L8.5 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

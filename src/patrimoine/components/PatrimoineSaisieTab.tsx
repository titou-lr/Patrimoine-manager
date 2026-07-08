import { useMemo, useState } from 'react'
import { usePatrimoineStore } from '../store/usePatrimoineStore'
import {
  ASSET_CATEGORY_META,
  LIABILITY_CATEGORY_META,
  ASSET_GROUP_LABELS,
  type AssetGroup,
} from '../data/patrimoineCategories'
import { computeLTV } from '../engine/patrimoineEngine'
import { formatEur } from '../../utils/format'
import PatrimoineItemFormModal, { type FormTarget } from './PatrimoineItemFormModal'
import type { PatrimoineAsset, PatrimoineLiability } from '../types/patrimoine'

interface SimEnvelopeRef {
  id: string
  label: string
  type: string
}

interface Props {
  simulationEnvelopes: SimEnvelopeRef[]
  /** Handler complet (takeSnapshot + toast) fourni par la page parente */
  onSnapshotTaken: () => void
}

const DAY_MS = 24 * 3600 * 1000

function freshnessBadge(lastUpdatedAt: string): { label: string; color: string } {
  const days = Math.floor((Date.now() - new Date(lastUpdatedAt).getTime()) / DAY_MS)
  if (days > 90) return { label: 'Très ancien', color: 'var(--danger)' }
  if (days > 30) return { label: 'Ancien', color: 'var(--warning)' }
  return { label: 'À jour', color: 'var(--success)' }
}

const GROUP_ORDER: AssetGroup[] = ['financier', 'immobilier', 'alternatif']

export default function PatrimoineSaisieTab({ simulationEnvelopes, onSnapshotTaken }: Props) {
  const { assets, liabilities, removeAsset, removeLiability } = usePatrimoineStore()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    financier: true, immobilier: true, alternatif: true, passifs: true,
  })
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  const assetsByGroup = useMemo(() => {
    const map: Record<AssetGroup, PatrimoineAsset[]> = { financier: [], immobilier: [], alternatif: [] }
    for (const a of assets) {
      const group = ASSET_CATEGORY_META[a.category]?.group ?? 'alternatif'
      map[group].push(a)
    }
    return map
  }, [assets])

  const totalActifs = assets.reduce((s, a) => s + a.currentValue, 0)
  const totalPassifs = liabilities.reduce((s, l) => s + l.currentValue, 0)

  function toggleGroup(g: string) {
    setOpenGroups((o) => ({ ...o, [g]: !o[g] }))
  }

  function linkedLabel(asset: PatrimoineAsset): string | null {
    if (!asset.linkedEnvelopeId) return null
    const env = simulationEnvelopes.find((e) => e.id === asset.linkedEnvelopeId)
    return env ? `Synchronisé avec simulation ${env.label}` : null
  }

  function renderAssetRow(asset: PatrimoineAsset) {
    const badge = freshnessBadge(asset.lastUpdatedAt)
    const ltv = computeLTV(asset)
    const linked = linkedLabel(asset)
    return (
      <div key={asset.id} className="row gap10" style={{
        alignItems: 'center', padding: '10px 14px',
        borderTop: '1px solid var(--hairline)',
      }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row gap8" style={{ alignItems: 'center' }}>
            <span className="small" style={{ fontWeight: 500 }}>{asset.label}</span>
            <span className="caption" style={{ fontSize: 10.5 }}>
              {ASSET_CATEGORY_META[asset.category]?.label}
              {asset.subcategory ? ` · ${asset.subcategory}` : ''}
            </span>
          </div>
          <div className="row gap8" style={{ marginTop: 2 }}>
            <span className="caption" style={{ fontSize: 11 }}>
              MAJ {new Date(asset.lastUpdatedAt).toLocaleDateString('fr-FR')}
            </span>
            {ltv !== null && (
              <span className="caption mono" style={{ fontSize: 11 }}>LTV {(ltv * 100).toFixed(0)} %</span>
            )}
            {linked && (
              <span className="caption" style={{ fontSize: 11, color: 'var(--primary-hover)' }}>{linked}</span>
            )}
          </div>
        </div>
        <span className="badge" style={{ color: badge.color, border: `1px solid ${badge.color}`, fontSize: 10.5 }}>
          {badge.label}
        </span>
        <span className="mono small" style={{ width: 100, textAlign: 'right' }}>{formatEur(asset.currentValue)}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setFormTarget({ kind: 'asset', item: asset })}>Éditer</button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--danger)' }}
          onClick={() => { if (window.confirm(`Supprimer « ${asset.label} » ?`)) removeAsset(asset.id) }}
        >
          ✕
        </button>
      </div>
    )
  }

  function renderLiabilityRow(l: PatrimoineLiability) {
    const badge = freshnessBadge(l.lastUpdatedAt)
    return (
      <div key={l.id} className="row gap10" style={{
        alignItems: 'center', padding: '10px 14px',
        borderTop: '1px solid var(--hairline)',
      }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row gap8" style={{ alignItems: 'center' }}>
            <span className="small" style={{ fontWeight: 500 }}>{l.label}</span>
            <span className="caption" style={{ fontSize: 10.5 }}>{LIABILITY_CATEGORY_META[l.category]?.label}</span>
          </div>
          <div className="caption" style={{ fontSize: 11, marginTop: 2 }}>
            MAJ {new Date(l.lastUpdatedAt).toLocaleDateString('fr-FR')}
          </div>
        </div>
        <span className="badge" style={{ color: badge.color, border: `1px solid ${badge.color}`, fontSize: 10.5 }}>
          {badge.label}
        </span>
        <span className="mono small" style={{ width: 100, textAlign: 'right', color: 'var(--danger)' }}>
          −{formatEur(l.currentValue)}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => setFormTarget({ kind: 'liability', item: l })}>Éditer</button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--danger)' }}
          onClick={() => { if (window.confirm(`Supprimer « ${l.label} » ?`)) removeLiability(l.id) }}
        >
          ✕
        </button>
      </div>
    )
  }

  function renderSection(
    key: string,
    title: string,
    total: number,
    count: number,
    addAction: () => void,
    children: React.ReactNode
  ) {
    const open = openGroups[key]
    return (
      <div className="panel" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div
          className="row gap10"
          style={{ padding: '14px 16px', cursor: 'pointer', alignItems: 'center' }}
          onClick={() => toggleGroup(key)}
        >
          <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--ink-tertiary)' }}>
            <path d="M6 3.5 10.5 8 6 12.5" />
          </svg>
          <span className="title grow">{title}</span>
          <span className="caption">{count} élément{count > 1 ? 's' : ''}</span>
          <span className="mono small" style={{ width: 110, textAlign: 'right' }}>{formatEur(total)}</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={(e) => { e.stopPropagation(); addAction() }}
          >
            + Ajouter
          </button>
        </div>
        {open && (
          <div>
            {count === 0
              ? <div className="caption" style={{ padding: '4px 16px 14px' }}>Aucun élément dans cette section</div>
              : children}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Barre snapshot */}
      <div className="panel" style={{
        padding: '14px 20px', marginBottom: 20, display: 'flex',
        alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div className="grow">
          <div className="small" style={{ fontWeight: 500 }}>
            {assets.length} actif{assets.length > 1 ? 's' : ''} · {liabilities.length} passif{liabilities.length > 1 ? 's' : ''}
            {' — '}net {formatEur(totalActifs - totalPassifs)}
          </div>
          <div className="caption" style={{ fontSize: 11.5 }}>
            Les snapshots figent votre patrimoine à date pour construire la timeline — ils ne sont jamais pris automatiquement.
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={onSnapshotTaken}
          disabled={assets.length === 0 && liabilities.length === 0}
          data-tour-id="patrimoine-snapshot-btn"
        >
          📸 Prendre un snapshot maintenant
        </button>
      </div>

      {/* Sections actifs par groupe */}
      {GROUP_ORDER.map((group) => {
        const items = assetsByGroup[group]
        const total = items.reduce((s, a) => s + a.currentValue, 0)
        return renderSection(
          group,
          ASSET_GROUP_LABELS[group],
          total,
          items.length,
          () => setFormTarget({ kind: 'asset', defaultGroup: group }),
          items.map(renderAssetRow)
        )
      })}

      {/* Section passifs */}
      {renderSection(
        'passifs',
        'Passifs',
        -totalPassifs,
        liabilities.length,
        () => setFormTarget({ kind: 'liability' }),
        liabilities.map(renderLiabilityRow)
      )}

      {formTarget && (
        <PatrimoineItemFormModal
          target={formTarget}
          simulationEnvelopes={simulationEnvelopes}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  )
}

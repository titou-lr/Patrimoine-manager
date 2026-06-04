import { useRef, useState, useMemo } from 'react'
import { useStore, selectActiveSim, getEffortTotal } from '../../store/useStore'
import NumberInput from '../ui/NumberInput'
import { runSimulation } from '../../engine/simulation'
import { formatEur } from '../../utils/format'
import type { Envelope, EnvelopeType } from '../../types'
import EnvelopeAssetsFees from './EnvelopeAssetsFees'
import EnvelopeMetaSection from './EnvelopeMetaSection'
import EnvelopeProjectionSection from './EnvelopeProjectionSection'
import EnvelopeTaxInfo from './EnvelopeTaxInfo'

const TYPE_LABELS: Record<EnvelopeType, string> = {
  livret_a: 'Livret A', ldds: 'LDDS', livret_jeune: 'Livret Jeune',
  pea: 'PEA', cto: 'CTO', assurance_vie: 'Assurance-vie', per: 'PER',
}

interface Props {
  envelope: Envelope
  onImportFees?: () => void
  capReachedYear?: number
}

function SectionHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 w-full text-left text-[10px] text-muted hover:text-foreground uppercase tracking-widest py-1.5"
    >
      <span>{label}</span>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`ml-auto transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </button>
  )
}

export default function EnvelopeCard({ envelope, onImportFees, capReachedYear }: Props) {
  const { updateEnvelope, removeEnvelope } = useStore()
  const activeSim = useStore(selectActiveSim)
  const { globalParams } = activeSim
  const effort = getEffortTotal(activeSim)

  const [expanded, setExpanded] = useState(true)
  const [metaOpen, setMetaOpen] = useState(false)
  const [projOpen, setProjOpen] = useState(false)
  const [taxOpen, setTaxOpen] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(envelope.label)
  const labelInputRef = useRef<HTMLInputElement>(null)

  const mode = envelope.contributionMode ?? 'euros'
  const percent = envelope.contributionPercent != null
    ? envelope.contributionPercent
    : (effort > 0 ? (envelope.monthlyContribution / effort) * 100 : 0)

  const miniResults = useMemo(() => {
    if (!envelope.active || envelope.assets.length === 0) return []
    return runSimulation([envelope], globalParams)
  }, [envelope, globalParams])

  const lastEnvResult = miniResults.length > 0
    ? miniResults[miniResults.length - 1].byEnvelope[envelope.id]
    : undefined

  function handleLabelBlur() {
    setEditingLabel(false)
    const trimmed = labelDraft.trim()
    if (trimmed) updateEnvelope(envelope.id, { label: trimmed })
    else setLabelDraft(envelope.label)
  }

  function handleContributionChange(v: number) {
    if (mode === 'euros') updateEnvelope(envelope.id, { monthlyContribution: v })
    else updateEnvelope(envelope.id, { contributionPercent: v })
  }

  const containerClass = envelope.active
    ? 'bg-surface border border-border border-l-2 border-l-orange'
    : 'bg-surface border border-border opacity-50'

  return (
    <div id={`envelope-${envelope.id}`} className={`rounded-xl overflow-hidden transition-all duration-200 ${containerClass}`}>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <button
          onClick={(e) => { e.stopPropagation(); updateEnvelope(envelope.id, { active: !envelope.active }) }}
          className={`relative w-9 h-5 rounded-full shrink-0 flex items-center ${envelope.active ? 'bg-orange' : 'bg-border'}`}
          title={envelope.active ? 'Désactiver' : 'Activer'}
        >
          <span className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${envelope.active ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
        </button>

        {editingLabel ? (
          <input
            ref={labelInputRef} autoFocus type="text" value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') { setLabelDraft(envelope.label); setEditingLabel(false) }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-transparent border-b border-orange text-sm text-foreground focus:outline-none"
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setLabelDraft(envelope.label); setEditingLabel(true) }}
            className="font-medium text-sm text-foreground flex-1 truncate text-left"
            title="Cliquer pour renommer"
          >{envelope.label}</button>
        )}

        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple/10 text-purple border border-purple/30 shrink-0 font-medium">
          {TYPE_LABELS[envelope.type]}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`shrink-0 text-muted transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Banner plafond */}
      {capReachedYear !== undefined && (
        <div style={{
          padding: '6px 16px', fontSize: 11,
          background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
          borderTop: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
          color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>⚠️</span>
          <span>Plafond légal atteint en année {capReachedYear + 1} — versements automatiquement stoppés.</span>
        </div>
      )}

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/60 pt-3 flex flex-col gap-3">

          {/* Inputs principaux */}
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">Capital initial</span>
              <NumberInput value={envelope.initialCapital} suffix="€" size="md" onChange={(v) => updateEnvelope(envelope.id, { initialCapital: v })} />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">Versement mensuel</span>
              <div className="flex gap-1.5">
                <NumberInput
                  value={mode === 'euros' ? envelope.monthlyContribution : parseFloat(percent.toFixed(1))}
                  size="md" step={mode === 'percent' ? 0.1 : 1}
                  onChange={handleContributionChange} className="flex-1"
                />
                <select
                  value={mode}
                  onChange={(e) => updateEnvelope(envelope.id, { contributionMode: e.target.value as 'euros' | 'percent' })}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-elevated border border-border rounded-lg px-1 text-[11px] text-muted focus:outline-none focus:border-orange cursor-pointer shrink-0"
                >
                  <option value="euros">€</option>
                  <option value="percent">%</option>
                </select>
              </div>
              {effort > 0 && (
                <span className="text-[10px] text-muted leading-tight">
                  {mode === 'euros'
                    ? `soit ${percent.toFixed(1)}% de l'effort (${formatEur(effort)}/mois)`
                    : `soit ${formatEur(envelope.monthlyContribution)}/mois sur ${formatEur(effort)}`
                  }
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted">Versement annuel ponctuel</span>
              <NumberInput value={envelope.yearlyContribution} suffix="€" size="md" onChange={(v) => updateEnvelope(envelope.id, { yearlyContribution: v })} />
            </label>
          </div>

          {/* Actifs + Frais */}
          <EnvelopeAssetsFees envelope={envelope} onImportFees={onImportFees} />

          {/* Options avancées */}
          <div className="border-t border-border/40 pt-2">
            <SectionHeader label="Options avancées" open={metaOpen} onToggle={() => setMetaOpen(!metaOpen)} />
            {metaOpen && (
              <div className="mt-2">
                <EnvelopeMetaSection envelope={envelope} onUpdate={(p) => updateEnvelope(envelope.id, p)} />
              </div>
            )}
          </div>

          {/* Projection individuelle */}
          <div className="border-t border-border/40 pt-2">
            <SectionHeader label="Projection" open={projOpen} onToggle={() => setProjOpen(!projOpen)} />
            {projOpen && (
              <div className="mt-2">
                <EnvelopeProjectionSection envelope={envelope} miniResults={miniResults} />
              </div>
            )}
          </div>

          {/* Fiscalité */}
          <div className="border-t border-border/40 pt-2">
            <SectionHeader label="Fiscalité" open={taxOpen} onToggle={() => setTaxOpen(!taxOpen)} />
            {taxOpen && (
              <div className="mt-2">
                <EnvelopeTaxInfo
                  envelope={envelope}
                  tmi={globalParams.tmi ?? 30}
                  isCouple={globalParams.isCouple ?? false}
                  lastResult={lastEnvResult}
                />
              </div>
            )}
          </div>

          <button
            onClick={() => removeEnvelope(envelope.id)}
            className="text-[10px] text-muted hover:text-danger text-left"
          >
            Supprimer cette enveloppe
          </button>
        </div>
      )}
    </div>
  )
}

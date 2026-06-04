import { useState, useMemo, useEffect } from 'react'
import { useStore, selectActiveSim } from '../../store/useStore'
import { runSimulation } from '../../engine/simulation'
import { analyzeTaxOptimization, type OptimizationSuggestion } from '../../engine/taxOptimizer'
import { formatEur } from '../../utils/format'
import type { TaxProfile } from '../../types'

interface Props {
  onClose: () => void
  onApply: (envelopeId: string, monthlyContribution: number) => void
}

const EFFORT_COLORS = {
  low:    { dot: 'bg-success', label: 'text-success', badge: 'bg-success/10 text-success border-success/20' },
  medium: { dot: 'bg-warning', label: 'text-warning', badge: 'bg-warning/10 text-warning border-warning/20' },
  high:   { dot: 'bg-danger',  label: 'text-danger',  badge: 'bg-danger/10 text-danger border-danger/20'  },
}

const EFFORT_LABELS = { low: 'Simple', medium: 'Modéré', high: 'Effort' }

interface SuggestionCardProps {
  suggestion: OptimizationSuggestion
  onApply: (s: OptimizationSuggestion) => void
}

function SuggestionCard({ suggestion, onApply }: SuggestionCardProps) {
  const cfg = EFFORT_COLORS[suggestion.effort]
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <span className="text-sm font-medium text-foreground">{suggestion.title}</span>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${cfg.badge}`}>
          {EFFORT_LABELS[suggestion.effort]}
        </span>
      </div>

      <p className="text-xs text-muted leading-relaxed">{suggestion.description}</p>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wider">Économie potentielle</div>
          <div className="text-lg font-bold font-mono text-orange tabular-nums">
            +{formatEur(suggestion.taxSaving)} d'impôts économisés
          </div>
        </div>
        <button
          onClick={() => onApply(suggestion)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-elevated border border-border text-muted hover:text-foreground hover:border-border-mid transition-colors shrink-0"
        >
          {suggestion.actionLabel}
        </button>
      </div>
    </div>
  )
}

export default function TaxOptimizer({ onClose, onApply }: Props) {
  const activeSim = useStore(selectActiveSim)
  const { envelopes, globalParams, events } = activeSim
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const results = useMemo(
    () => runSimulation(envelopes, globalParams, events ?? []),
    [envelopes, globalParams, events]
  )

  const taxProfile: TaxProfile = {
    tmi: globalParams.tmi ?? 30,
    isCouple: globalParams.isCouple ?? false,
    avAbattement: (globalParams.isCouple ?? false) ? 9_200 : 4_600,
  }

  const suggestions = useMemo(
    () => analyzeTaxOptimization(envelopes, results, globalParams, taxProfile),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [envelopes, results, globalParams]
  )

  function handleApply(s: OptimizationSuggestion) {
    if (!s.patch) return
    if (confirmId === s.id) {
      onApply(s.patch.envelopeId, s.patch.monthlyContribution)
      onClose()
    } else {
      setConfirmId(s.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-base border border-border rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-border flex items-start justify-between gap-4">
          <div>
            <div className="font-semibold text-sm text-foreground">Optimisation fiscale</div>
            <div className="text-xs text-muted mt-0.5">
              Analyse basée sur votre TMI de {globalParams.tmi ?? 30}%
              {(globalParams.isCouple ?? false) ? ' · Déclaration couple' : ' · Déclaration solo'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-elevated text-sm shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 p-6">
          {suggestions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-sm font-medium text-foreground">Situation fiscale optimisée</div>
              <div className="text-xs text-muted mt-1 max-w-xs mx-auto">
                Votre situation fiscale est déjà optimisée pour votre profil.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-xs text-muted mb-1">
                {suggestions.length} opportunité{suggestions.length > 1 ? 's' : ''} identifiée{suggestions.length > 1 ? 's' : ''} —
                économie totale estimée :{' '}
                <span className="text-orange font-mono font-medium">
                  {formatEur(suggestions.reduce((s, r) => s + r.taxSaving, 0))}
                </span>
              </div>

              {suggestions.map((s) => (
                <div key={s.id}>
                  <SuggestionCard
                    suggestion={s}
                    onApply={handleApply}
                  />
                  {confirmId === s.id && s.patch && (
                    <div className="mt-1 px-4 py-2 bg-warning/8 border border-warning/20 rounded-xl text-xs text-warning flex items-center justify-between gap-3">
                      <span>Confirmer la modification du versement mensuel ?</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApply(s)}
                          className="px-2 py-1 rounded-md bg-warning/20 text-warning font-medium hover:bg-warning/30 transition-colors"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1 rounded-md text-muted hover:text-foreground transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

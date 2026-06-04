import { useEffect } from 'react'
import {
  ENVELOPE_PRESETS,
  PRESET_GROUPS,
  formatPlafond,
  TAX_RULE_LABEL,
} from '../../data/envelopePresets'

interface Props {
  onSelect: (presetKey: string) => void
  onClose: () => void
}

export default function EnvelopeTypeSelector({ onSelect, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-base/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-medium text-sm text-foreground">Choisir un type d'enveloppe</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-elevated text-sm"
          >
            ✕
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto p-5 flex flex-col gap-5">
          {PRESET_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Label de groupe */}
              <div className={`rounded-lg px-3 py-1.5 mb-3 ${
                group.label.includes('réglementé')
                  ? 'bg-success/8 border border-success/20'
                  : 'bg-elevated border border-border'
              }`}>
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                  group.label.includes('réglementé') ? 'text-success' : 'text-muted'
                }`}>
                  {group.label}
                </span>
              </div>

              {/* Grille 2 colonnes */}
              <div className="grid grid-cols-2 gap-2">
                {group.keys.map((key) => {
                  const preset = ENVELOPE_PRESETS[key]
                  if (!preset) return null
                  return (
                    <button
                      key={key}
                      onClick={() => onSelect(key)}
                      className="text-left p-3 rounded-xl border border-border bg-base hover:bg-elevated hover:border-border-mid transition-all duration-150 flex flex-col gap-1 group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium text-sm text-foreground group-hover:text-orange transition-colors">
                          {preset.label}
                        </span>
                        {preset.regulated && (
                          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/25 font-medium">
                            Réglementé
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted">
                        {isFinite(preset.maxContribution)
                          ? `Plafond ${formatPlafond(preset.maxContribution)}`
                          : 'Sans plafond'}
                      </span>
                      <span className="text-[10px] text-muted/70">
                        {TAX_RULE_LABEL[preset.taxRule]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

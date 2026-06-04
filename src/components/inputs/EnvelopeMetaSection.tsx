import NumberInput from '../ui/NumberInput'
import type { Envelope, GoalType } from '../../types'

const GOAL_OPTIONS: { value: GoalType | ''; label: string }[] = [
  { value: '', label: 'Aucun' },
  { value: 'retraite', label: 'Retraite' },
  { value: 'immobilier', label: 'Immobilier' },
  { value: 'capital', label: 'Capital' },
]

const SELECT_CLASS =
  'h-9 rounded-lg border border-border bg-elevated px-2 text-xs text-foreground focus:outline-none focus:border-orange cursor-pointer'

interface Props {
  envelope: Envelope
  onUpdate: (patch: Partial<Envelope>) => void
}

export default function EnvelopeMetaSection({ envelope, onUpdate }: Props) {
  const freq = envelope.contributionFrequency ?? 'monthly'
  const reinvest = envelope.reinvestDividends ?? true

  return (
    <div className="flex flex-col gap-3">
      {/* openedAt + closureHorizon */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">Date d'ouverture</span>
          <input
            type="date"
            value={envelope.openedAt?.split('T')[0] ?? ''}
            onChange={(e) => onUpdate({ openedAt: e.target.value || null })}
            className="h-9 rounded-lg border border-border bg-elevated px-2 text-xs text-foreground focus:outline-none focus:border-orange"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">Clôture dans</span>
          <NumberInput
            value={envelope.closureHorizon ?? 0}
            onChange={(v) => onUpdate({ closureHorizon: v > 0 ? v : null })}
            min={0} max={50} suffix="ans" size="md"
          />
        </label>
      </div>

      {/* linkedGoal + currentRealValue */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">Objectif lié</span>
          <select
            value={envelope.linkedGoal ?? ''}
            onChange={(e) => onUpdate({ linkedGoal: (e.target.value as GoalType) || null })}
            className={SELECT_CLASS}
          >
            {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted">Valeur actuelle réelle</span>
          <NumberInput
            value={envelope.currentRealValue ?? 0}
            onChange={(v) => onUpdate({ currentRealValue: v > 0 ? v : null })}
            suffix="€" size="md"
          />
        </label>
      </div>

      {/* contributionFrequency */}
      <label className="flex flex-col gap-1">
        <span className="text-[10px] text-muted">Fréquence des versements</span>
        <select
          value={freq}
          onChange={(e) => onUpdate({ contributionFrequency: e.target.value as 'monthly' | 'quarterly' | 'annual' })}
          className={SELECT_CLASS}
        >
          <option value="monthly">Mensuel</option>
          <option value="quarterly">Trimestriel (×3 tous les 3 mois)</option>
          <option value="annual">Annuel (×12 en janvier)</option>
        </select>
      </label>

      {/* reinvestDividends toggle */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted uppercase tracking-widest">Réinvestissement dividendes</span>
          <button
            onClick={() => onUpdate({ reinvestDividends: !reinvest })}
            className={`relative w-9 h-5 rounded-full shrink-0 flex items-center ${reinvest ? 'bg-orange' : 'bg-border'}`}
          >
            <span className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${reinvest ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
          </button>
        </div>
        {!reinvest && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted">Dividendes mensuels estimés</span>
            <NumberInput
              value={envelope.estimatedMonthlyDividends ?? 0}
              onChange={(v) => onUpdate({ estimatedMonthlyDividends: v })}
              suffix="€/mois" size="md"
            />
          </label>
        )}
      </div>
    </div>
  )
}

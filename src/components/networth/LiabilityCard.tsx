import { useState } from 'react'
import { useStore } from '../../store/useStore'
import NumberInput from '../ui/NumberInput'
import { formatEur } from '../../utils/format'
import type { Liability, LiabilityType } from '../../types'

const TYPE_LABELS: Record<LiabilityType, string> = {
  mortgage:        'Crédit immobilier',
  car_loan:        'Crédit auto',
  consumer_credit: 'Crédit conso',
  student_loan:    'Prêt étudiant',
  other:           'Autre dette',
}

const TYPE_COLORS: Record<LiabilityType, string> = {
  mortgage:        'bg-purple/15 text-purple border-purple/30',
  car_loan:        'bg-orange/15 text-orange border-orange/30',
  consumer_credit: 'bg-warning/15 text-warning border-warning/30',
  student_loan:    'bg-success/15 text-success border-success/30',
  other:           'bg-muted/15 text-muted border-border',
}

interface Props {
  liability: Liability
}

export default function LiabilityCard({ liability }: Props) {
  const { updateLiability, removeLiability } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(liability.label)

  const isActive = liability.active !== false
  const repaidFraction = liability.totalAmount > 0
    ? 1 - liability.remainingAmount / liability.totalAmount
    : 0
  const repaidPct = Math.min(100, Math.max(0, repaidFraction * 100))

  const interestRemaining = Math.max(
    0,
    liability.monthlyPayment * liability.remainingMonths - liability.remainingAmount
  )

  function handleLabelBlur() {
    setEditingLabel(false)
    const trimmed = labelDraft.trim()
    if (trimmed) updateLiability(liability.id, { label: trimmed })
    else setLabelDraft(liability.label)
  }

  const containerClass = isActive
    ? 'bg-surface border border-border border-l-2 border-l-danger rounded-2xl'
    : 'bg-surface border border-border opacity-50 rounded-2xl'

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3">
        {/* Toggle actif */}
        <button
          onClick={() => updateLiability(liability.id, { active: !isActive })}
          className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors ${
            isActive ? 'bg-danger border-danger' : 'bg-transparent border-border'
          }`}
          title={isActive ? 'Désactiver' : 'Activer'}
        />

        {/* Label éditable */}
        {editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={handleLabelBlur}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLabelBlur() }}
            className="flex-1 bg-transparent text-sm font-medium text-foreground border-b border-orange outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingLabel(true)}
            className="flex-1 text-left text-sm font-medium text-foreground hover:text-orange transition-colors truncate"
          >
            {liability.label}
          </button>
        )}

        {/* Badge type */}
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${TYPE_COLORS[liability.type]}`}>
          {TYPE_LABELS[liability.type]}
        </span>

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-muted hover:text-foreground transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}>
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={() => removeLiability(liability.id)}
          className="shrink-0 text-muted hover:text-danger transition-colors"
          title="Supprimer"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Progress bar remboursement */}
      <div className="px-4 pb-2">
        <div className="h-1.5 rounded-full bg-danger/20 overflow-hidden">
          <div
            className="h-full bg-danger rounded-full transition-all duration-300"
            style={{ width: `${repaidPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted">
          <span>{Math.round(repaidPct)}% remboursé</span>
          <span className="font-mono">{formatEur(liability.remainingAmount)} restant</span>
        </div>
      </div>

      {/* Coût intérêts restants */}
      {interestRemaining > 0 && (
        <div className="px-4 pb-3">
          <span className="text-xs text-danger">
            Coût total des intérêts restants : {formatEur(interestRemaining)}
          </span>
        </div>
      )}

      {/* Section dépliable */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-3">

          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted uppercase tracking-wider">Montant total</span>
            <NumberInput
              value={liability.totalAmount}
              onChange={(v) => updateLiability(liability.id, { totalAmount: v })}
              min={0} suffix="€" size="sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted uppercase tracking-wider">Capital restant</span>
            <NumberInput
              value={liability.remainingAmount}
              onChange={(v) => updateLiability(liability.id, { remainingAmount: v })}
              min={0} suffix="€" size="sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted uppercase tracking-wider">Mensualité</span>
            <NumberInput
              value={liability.monthlyPayment}
              onChange={(v) => updateLiability(liability.id, { monthlyPayment: v })}
              min={0} suffix="€/mois" size="sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted uppercase tracking-wider">Taux d'intérêt</span>
            <NumberInput
              value={liability.interestRate}
              onChange={(v) => updateLiability(liability.id, { interestRate: v })}
              min={0} max={30} step={0.1} suffix="%" size="sm"
            />
          </label>

          <label className="flex flex-col gap-1 col-span-2">
            <span className="text-[10px] text-muted uppercase tracking-wider">Durée restante</span>
            <NumberInput
              value={liability.remainingMonths}
              onChange={(v) => updateLiability(liability.id, { remainingMonths: v })}
              min={1} max={480} suffix="mois" size="sm"
            />
          </label>

          {/* Toggle déduire de l'épargne */}
          <div className="col-span-2 flex items-center gap-2 pt-1">
            <button
              onClick={() => updateLiability(liability.id, { autoDeduct: !liability.autoDeduct })}
              className={`relative w-8 h-4 rounded-full transition-colors ${
                liability.autoDeduct ? 'bg-orange' : 'bg-elevated border border-border'
              }`}
            >
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                liability.autoDeduct ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
            <span className="text-xs text-muted">Déduire de l'effort d'épargne</span>
          </div>

          {/* Type selector */}
          <div className="col-span-2">
            <span className="text-[10px] text-muted uppercase tracking-wider block mb-1">Type</span>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(TYPE_LABELS) as LiabilityType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => updateLiability(liability.id, { type: t })}
                  className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                    liability.type === t
                      ? TYPE_COLORS[t]
                      : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

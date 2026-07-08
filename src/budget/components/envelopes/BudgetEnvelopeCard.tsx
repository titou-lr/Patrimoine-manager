import { useState } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import { formatEur } from '../../../utils/format'
import type { BudgetEnvelope, EnvelopeMonthlyStat } from '../../types/budget'

interface Props {
  envelope: BudgetEnvelope
  stat: EnvelopeMonthlyStat
  isFirst?: boolean
}

export default function BudgetEnvelopeCard({ envelope, stat, isFirst }: Props) {
  const { updateEnvelope, removeEnvelope } = useBudgetStore()
  const [editingAlloc, setEditingAlloc] = useState(false)
  const [allocInput, setAllocInput] = useState(String(envelope.monthlyAllocation))

  const { allocated, spent, remaining, carryOverFromPrevious } = stat
  const isOverBudget = remaining < 0
  const pctUsed = allocated > 0 ? Math.min(spent / allocated, 1) : 0

  function commitAlloc() {
    const val = parseFloat(allocInput.replace(',', '.'))
    if (!isNaN(val) && val >= 0) updateEnvelope(envelope.id, { monthlyAllocation: val })
    setEditingAlloc(false)
  }

  return (
    <div
      data-tour-id={isFirst ? 'budget-first-envelope-card' : undefined}
      className="panel"
      style={{
        padding: '12px 14px',
        border: isOverBudget ? '1px solid rgba(235,87,87,0.35)' : '1px solid var(--hairline)',
        background: isOverBudget ? 'rgba(235,87,87,0.04)' : 'var(--surface-2)',
        borderRadius: 'var(--r-lg)',
      }}
    >
      {/* Header */}
      <div className="row gap8" style={{ marginBottom: 10, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500, flex: 1, color: 'var(--ink)' }}>
          {envelope.label}
        </span>
        {isOverBudget && (
          <span
            style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
              background: 'var(--danger)', color: '#fff', flexShrink: 0,
            }}
          >
            DÉPASSÉ
          </span>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => removeEnvelope(envelope.id)}
          style={{ padding: '2px 6px', fontSize: 11, color: 'var(--ink-tertiary)', flexShrink: 0 }}
          title="Supprimer l'enveloppe"
        >
          ✕
        </button>
      </div>

      {/* Progress bar: 3 segments — dépensé / restant / report */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ height: 7, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
          <div style={{
            width: `${pctUsed * 100}%`,
            height: '100%',
            background: isOverBudget ? 'var(--danger)' : 'var(--primary)',
            borderRadius: 99,
            transition: 'width .25s',
          }} />
        </div>
        <div className="row gap4" style={{ marginTop: 4, justifyContent: 'space-between' }}>
          <span className="caption mono" style={{ color: isOverBudget ? 'var(--danger)' : 'var(--ink-tertiary)' }}>
            {formatEur(spent)} dépensé
          </span>
          <span className="caption mono" style={{ color: 'var(--ink-tertiary)' }}>
            {isOverBudget ? formatEur(Math.abs(remaining)) + ' dépassé' : formatEur(remaining) + ' restant'}
          </span>
        </div>
      </div>

      {/* Allocation & carry-over */}
      <div className="row gap6" style={{ alignItems: 'center' }}>
        <span className="caption" style={{ color: 'var(--ink-tertiary)', flex: 1 }}>Budget mensuel</span>
        {editingAlloc ? (
          <input
            autoFocus
            type="number"
            min={0}
            value={allocInput}
            onChange={(e) => setAllocInput(e.target.value)}
            onBlur={commitAlloc}
            onKeyDown={(e) => { if (e.key === 'Enter') commitAlloc(); if (e.key === 'Escape') setEditingAlloc(false) }}
            style={{
              width: 80, textAlign: 'right', fontSize: 12, fontFamily: 'var(--font-mono)',
              background: 'var(--surface-1)', border: '1px solid var(--primary)',
              borderRadius: 4, padding: '2px 6px', color: 'var(--ink)',
            }}
          />
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setAllocInput(String(envelope.monthlyAllocation)); setEditingAlloc(true) }}
            style={{ fontSize: 12, fontFamily: 'var(--font-mono)', padding: '2px 8px' }}
          >
            {formatEur(envelope.monthlyAllocation)}
          </button>
        )}
      </div>

      {/* Report du mois précédent */}
      {envelope.rollover && carryOverFromPrevious > 0 && (
        <div className="row gap4" style={{ marginTop: 4, alignItems: 'center' }}>
          <span className="caption" style={{ color: 'var(--ink-tertiary)', flex: 1 }}>Report mois précédent</span>
          <span className="mono caption" style={{ color: 'var(--success)' }}>+{formatEur(carryOverFromPrevious)}</span>
        </div>
      )}
    </div>
  )
}

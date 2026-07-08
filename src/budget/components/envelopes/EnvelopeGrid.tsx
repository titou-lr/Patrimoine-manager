import { useState } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import BudgetEnvelopeCard from './BudgetEnvelopeCard'
import type { MonthlyBudgetSnapshot } from '../../types/budget'

interface Props {
  snapshot: MonthlyBudgetSnapshot
}

export default function EnvelopeGrid({ snapshot }: Props) {
  const { envelopes, categories, addEnvelope } = useBudgetStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newAlloc, setNewAlloc] = useState('')
  const [newCatId, setNewCatId] = useState('')
  const [newRollover, setNewRollover] = useState(false)

  const activeEnvelopes = envelopes.filter((e) => e.active)

  function handleAdd() {
    const alloc = parseFloat(newAlloc.replace(',', '.'))
    if (!newLabel.trim() || isNaN(alloc) || alloc < 0) return
    addEnvelope({
      label: newLabel.trim(),
      monthlyAllocation: alloc,
      categoryId: newCatId || (categories.find((c) => c.group === 'variable')?.id ?? ''),
      rollover: newRollover,
      active: true,
    })
    setNewLabel('')
    setNewAlloc('')
    setNewCatId('')
    setNewRollover(false)
    setShowAdd(false)
  }

  return (
    <div className="panel col gap12" style={{ padding: '16px 20px' }}>

      {/* Header */}
      <div className="row gap8" style={{ alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', flex: 1 }}>
          Enveloppes budgétaires
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowAdd((p) => !p)}
          style={{ fontSize: 12 }}
        >
          {showAdd ? 'Annuler' : '+ Enveloppe'}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showAdd && (
        <div
          style={{
            background: 'var(--surface-1)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-lg)', padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}
        >
          <div className="row gap8">
            <input
              autoFocus
              placeholder="Nom (ex. Alimentation)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              style={{ flex: 1, fontSize: 13 }}
            />
            <input
              type="number"
              placeholder="Budget €"
              min={0}
              value={newAlloc}
              onChange={(e) => setNewAlloc(e.target.value)}
              style={{ width: 100, fontSize: 13, textAlign: 'right' }}
            />
          </div>
          <div className="row gap8">
            <select
              value={newCatId}
              onChange={(e) => setNewCatId(e.target.value)}
              style={{ flex: 1, fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 6, padding: '4px 8px', color: 'var(--ink)' }}
            >
              <option value="">Catégorie…</option>
              {categories.filter((c) => c.group !== 'income').map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <label className="row gap4" style={{ alignItems: 'center', fontSize: 12, color: 'var(--ink-secondary)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={newRollover}
                onChange={(e) => setNewRollover(e.target.checked)}
                style={{ accentColor: 'var(--primary)' }}
              />
              Reporter le solde
            </label>
          </div>
          <div className="row gap8" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-sm" onClick={handleAdd}>Ajouter</button>
          </div>
        </div>
      )}

      {/* Grille enveloppes */}
      {activeEnvelopes.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-tertiary)', fontSize: 13 }}>
          Aucune enveloppe — cliquez sur "+ Enveloppe" pour commencer.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {activeEnvelopes.map((env, i) => {
          const stat = snapshot.byEnvelope[env.id] ?? {
            envelopeId: env.id, allocated: env.monthlyAllocation, spent: 0,
            remaining: env.monthlyAllocation, carryOverFromPrevious: 0,
          }
          return (
            <BudgetEnvelopeCard
              key={env.id}
              envelope={env}
              stat={stat}
              isFirst={i === 0}
            />
          )
        })}
      </div>
    </div>
  )
}

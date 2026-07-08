import { useMemo, useState } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import { computeGoalProgress } from '../../engine/savingsGoalsEngine'
import type { SavingsGoal } from '../../types/budget'
import { formatEur } from '../../../utils/format'

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function GoalForm({
  initial,
  envelopes,
  onSave,
  onCancel,
}: {
  initial: Partial<SavingsGoal>
  envelopes: { id: string; label: string }[]
  onSave: (goal: Omit<SavingsGoal, 'id'> & { id?: string }) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial.label ?? '')
  const [target, setTarget] = useState(String(initial.targetAmount ?? ''))
  const [targetDate, setTargetDate] = useState(initial.targetDate ?? '')
  const [envelopeId, setEnvelopeId] = useState(initial.linkedEnvelopeId ?? '')
  const [starting, setStarting] = useState(String(initial.startingAmount ?? '0'))

  function handleSave() {
    const amt = parseFloat(target.replace(',', '.'))
    const start = parseFloat(starting.replace(',', '.')) || 0
    if (!label.trim() || isNaN(amt) || amt <= 0) return
    onSave({
      id: initial.id,
      label: label.trim(),
      targetAmount: amt,
      targetDate: targetDate || null,
      linkedEnvelopeId: envelopeId || null,
      startingAmount: start,
      createdAt: initial.createdAt ?? new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <div style={{
      background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
        <input
          className="btn btn-ghost btn-sm"
          style={{ textAlign: 'left', fontFamily: 'inherit' }}
          placeholder="Nom de l'objectif (ex. Apport immobilier)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="btn btn-ghost btn-sm"
          style={{ width: 110, fontFamily: 'var(--font-mono)', textAlign: 'right' }}
          placeholder="Cible €"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <input
          className="btn btn-ghost btn-sm"
          style={{ width: 110, fontFamily: 'var(--font-mono)', textAlign: 'right' }}
          placeholder="Déjà épargné €"
          value={starting}
          onChange={(e) => setStarting(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Date cible (optionnel)
          <input
            type="month"
            className="btn btn-ghost btn-sm"
            value={targetDate ?? ''}
            onChange={(e) => setTargetDate(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </label>
        <select
          className="btn btn-ghost btn-sm"
          value={envelopeId ?? ''}
          onChange={(e) => setEnvelopeId(e.target.value)}
          style={{ fontFamily: 'inherit', flex: 1 }}
        >
          <option value="">Suivre l'épargne globale (revenus - dépenses)</option>
          {envelopes.map((e) => (
            <option key={e.id} value={e.id}>Enveloppe : {e.label}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Annuler</button>
        <button className="btn btn-sm" onClick={handleSave}>Enregistrer</button>
      </div>
    </div>
  )
}

export default function SavingsGoalsPanel() {
  const { savingsGoals, transactions, envelopes, addSavingsGoal, updateSavingsGoal, removeSavingsGoal } = useBudgetStore()
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const activeEnvelopes = envelopes.filter((e) => e.active).map((e) => ({ id: e.id, label: e.label }))

  const progressById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeGoalProgress>>()
    for (const g of savingsGoals) map.set(g.id, computeGoalProgress(g, transactions))
    return map
  }, [savingsGoals, transactions])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', flex: 1 }}>
            Objectifs d'épargne
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(true)} style={{ fontSize: 12 }}>
            + Nouvel objectif
          </button>
        </div>

        {showAdd && (
          <div style={{ marginBottom: 12 }}>
            <GoalForm
              initial={{}}
              envelopes={activeEnvelopes}
              onSave={(g) => { addSavingsGoal(g); setShowAdd(false) }}
              onCancel={() => setShowAdd(false)}
            />
          </div>
        )}

        {savingsGoals.length === 0 && !showAdd && (
          <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', textAlign: 'center', padding: '16px 0' }}>
            Aucun objectif défini. Créez un objectif nommé (apport, voyage, fonds d'urgence…)
            et suivez sa progression selon votre rythme d'épargne réel.
          </p>
        )}

        {savingsGoals.map((goal) => {
          if (editingId === goal.id) {
            return (
              <div key={goal.id} style={{ marginBottom: 10 }}>
                <GoalForm
                  initial={goal}
                  envelopes={activeEnvelopes}
                  onSave={(g) => { updateSavingsGoal(goal.id, g); setEditingId(null) }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )
          }
          const p = progressById.get(goal.id)!
          const linkedEnv = goal.linkedEnvelopeId ? envelopes.find((e) => e.id === goal.linkedEnvelopeId) : null
          const done = p.pct >= 1
          return (
            <div key={goal.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>
                  {goal.label}
                  {done && <span style={{ marginLeft: 8, color: 'var(--success)', fontSize: 12 }}>✓ Atteint</span>}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>
                  {formatEur(p.current)} <span style={{ color: 'var(--ink-tertiary)' }}>/ {formatEur(goal.targetAmount)}</span>
                </span>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(goal.id)} style={{ fontSize: 11 }}>Éditer</button>
                <button className="btn btn-ghost btn-sm" onClick={() => removeSavingsGoal(goal.id)} style={{ fontSize: 11, color: 'var(--danger)' }}>×</button>
              </div>

              {/* Barre de progression */}
              <div style={{ height: 6, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{
                  width: `${Math.round(p.pct * 100)}%`, height: '100%', borderRadius: 99,
                  background: done ? 'var(--success)' : 'var(--primary)',
                  transition: 'width .3s var(--ease)',
                }} />
              </div>

              <div style={{ display: 'flex', gap: 14, fontSize: 11.5, color: 'var(--ink-tertiary)', flexWrap: 'wrap' }}>
                <span>{Math.round(p.pct * 100)} %</span>
                <span>Rythme réel : {formatEur(p.monthlyPace)}/mois</span>
                {!done && (
                  p.projectedMonth
                    ? <span>
                        Atteint vers <strong style={{ color: 'var(--ink-subtle)' }}>{monthLabel(p.projectedMonth)}</strong>
                        {p.onTrack !== null && (
                          <span style={{ marginLeft: 6, color: p.onTrack ? 'var(--success)' : 'var(--danger)' }}>
                            {p.onTrack ? '· dans les temps' : `· en retard (cible ${monthLabel(goal.targetDate!)})`}
                          </span>
                        )}
                      </span>
                    : <span style={{ color: 'var(--warning)' }}>Rythme d'épargne nul — projection impossible</span>
                )}
                {linkedEnv && <span>Enveloppe : {linkedEnv.label}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import { detectRecurringCandidates } from '../../engine/recurringDetector'
import type { RecurringFrequency, RecurringRule, TransactionType } from '../../types/budget'

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuelle',
  quarterly: 'Trimestrielle',
  annual: 'Annuelle',
}

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Dépense',
  income: 'Revenu',
  transfer: 'Virement',
}

function formatAmount(amount: number): string {
  return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function RuleForm({
  initial,
  categories,
  onSave,
  onCancel,
}: {
  initial: Partial<RecurringRule>
  categories: { id: string; label: string }[]
  onSave: (rule: Omit<RecurringRule, 'id'> & { id?: string }) => void
  onCancel: () => void
}) {
  const [label, setLabel] = useState(initial.label ?? '')
  const [amount, setAmount] = useState(String(initial.amount ?? ''))
  const [type, setType] = useState<TransactionType>(initial.type ?? 'expense')
  const [freq, setFreq] = useState<RecurringFrequency>(initial.frequency ?? 'monthly')
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? (categories[0]?.id ?? ''))
  const [dayOfMonth, setDayOfMonth] = useState(String(initial.dayOfMonth ?? '1'))

  function handleSave() {
    const amt = parseFloat(amount.replace(',', '.'))
    if (!label.trim() || isNaN(amt) || amt <= 0) return
    onSave({
      id: initial.id,
      label: label.trim(),
      amount: amt,
      type,
      categoryId,
      frequency: freq,
      dayOfMonth: freq !== 'weekly' ? Number(dayOfMonth) : undefined,
      active: initial.active ?? true,
      detectedAutomatically: initial.detectedAutomatically ?? false,
      lastGeneratedMonth: initial.lastGeneratedMonth ?? null,
    })
  }

  return (
    <div style={{
      background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input
          className="btn btn-ghost btn-sm"
          style={{ textAlign: 'left', fontFamily: 'inherit' }}
          placeholder="Libellé"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="btn btn-ghost btn-sm"
          style={{ width: 90, fontFamily: 'var(--font-mono)', textAlign: 'right' }}
          placeholder="Montant €"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select
          className="btn btn-ghost btn-sm"
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType)}
          style={{ fontFamily: 'inherit' }}
        >
          {(Object.entries(TYPE_LABELS) as [TransactionType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          className="btn btn-ghost btn-sm"
          value={freq}
          onChange={(e) => setFreq(e.target.value as RecurringFrequency)}
          style={{ fontFamily: 'inherit' }}
        >
          {(Object.entries(FREQ_LABELS) as [RecurringFrequency, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {freq !== 'weekly' && (
          <select
            className="btn btn-ghost btn-sm"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            style={{ fontFamily: 'inherit' }}
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>Le {d}</option>
            ))}
          </select>
        )}

        <select
          className="btn btn-ghost btn-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ fontFamily: 'inherit', flex: 1 }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
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

export default function RecurringRulesPanel() {
  const { recurringRules, transactions, categories, upsertRecurringRule, removeRecurringRule } = useBudgetStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [suggestions, setSuggestions] = useState<RecurringRule[] | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const activeRules = recurringRules.filter((r) => r.active)
  const inactiveRules = recurringRules.filter((r) => !r.active && !r.detectedAutomatically)

  function handleAnalyze() {
    setAnalyzing(true)
    // Run detection synchronously (pure function, no background)
    const candidates = detectRecurringCandidates(transactions)
    // Filter out rules already confirmed
    const existing = new Set(recurringRules.map((r) => r.label.toLowerCase().trim()))
    const filtered = candidates.filter((c) => !existing.has(c.label.toLowerCase().trim()))
    setSuggestions(filtered)
    setAnalyzing(false)
  }

  function confirmSuggestion(candidate: RecurringRule) {
    upsertRecurringRule({ ...candidate, active: true, detectedAutomatically: true })
    setSuggestions((prev) => prev?.filter((s) => s.id !== candidate.id) ?? null)
  }

  function dismissSuggestion(candidate: RecurringRule) {
    setSuggestions((prev) => prev?.filter((s) => s.id !== candidate.id) ?? null)
  }

  const allCats = categories.map((c) => ({ id: c.id, label: c.label }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Active rules */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', flex: 1 }}>
            Règles actives
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAddForm(true)}
            style={{ fontSize: 12 }}
          >
            + Nouvelle règle
          </button>
        </div>

        {showAddForm && (
          <div style={{ marginBottom: 12 }}>
            <RuleForm
              initial={{ active: true }}
              categories={allCats}
              onSave={(rule) => {
                upsertRecurringRule(rule)
                setShowAddForm(false)
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {activeRules.length === 0 && !showAddForm && (
          <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', textAlign: 'center', padding: '12px 0' }}>
            Aucune règle active. Ajoutez-en une ou analysez vos transactions.
          </p>
        )}

        {[...activeRules, ...inactiveRules].map((rule) => (
          editingId === rule.id ? (
            <div key={rule.id} style={{ marginBottom: 8 }}>
              <RuleForm
                initial={rule}
                categories={allCats}
                onSave={(updated) => {
                  upsertRecurringRule(updated)
                  setEditingId(null)
                }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <RuleRow
              key={rule.id}
              rule={rule}
              categories={categories}
              onEdit={() => setEditingId(rule.id)}
              onToggle={() => upsertRecurringRule({ ...rule, active: !rule.active })}
              onDelete={() => removeRecurringRule(rule.id)}
            />
          )
        ))}
      </div>

      {/* Suggestions */}
      <div className="panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', flex: 1 }}>
            Suggestions détectées
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleAnalyze}
            disabled={analyzing}
            style={{ fontSize: 12 }}
          >
            {analyzing ? 'Analyse…' : 'Analyser mes transactions'}
          </button>
        </div>

        {suggestions === null && (
          <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', textAlign: 'center', padding: '12px 0' }}>
            Cliquez sur "Analyser mes transactions" pour détecter automatiquement les récurrences.
          </p>
        )}

        {suggestions !== null && suggestions.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', textAlign: 'center', padding: '12px 0' }}>
            Aucune récurrence détectée (minimum 3 occurrences similaires requises).
          </p>
        )}

        {suggestions?.map((candidate) => (
          <div
            key={candidate.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderBottom: '1px solid var(--hairline)',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{candidate.label}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
                {FREQ_LABELS[candidate.frequency]} · {formatAmount(candidate.amount)} €
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => dismissSuggestion(candidate)}
              style={{ fontSize: 11 }}
            >
              Ignorer
            </button>
            <button
              className="btn btn-sm"
              onClick={() => confirmSuggestion(candidate)}
              style={{ fontSize: 11 }}
            >
              Confirmer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function RuleRow({
  rule,
  categories,
  onEdit,
  onToggle,
  onDelete,
}: {
  rule: RecurringRule
  categories: { id: string; label: string; color?: string }[]
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const cat = categories.find((c) => c.id === rule.categoryId)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
      borderBottom: '1px solid var(--hairline)',
      opacity: rule.active ? 1 : 0.5,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: 16, height: 16, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
          background: rule.active ? 'var(--success)' : 'var(--surface-2)',
        }}
        title={rule.active ? 'Désactiver' : 'Activer'}
      />
      {cat && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color ?? 'var(--ink-tertiary)', flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {rule.label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
          {FREQ_LABELS[rule.frequency]}
          {rule.dayOfMonth ? ` · le ${rule.dayOfMonth}` : ''}
          {rule.detectedAutomatically && <span style={{ marginLeft: 6 }}>· auto</span>}
        </div>
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
        color: rule.type === 'income' ? 'var(--success)' : 'var(--ink)',
        minWidth: 70, textAlign: 'right',
      }}>
        {rule.type === 'income' ? '+' : '-'}{formatAmount(rule.amount)} €
      </span>
      <button className="btn btn-ghost btn-sm" onClick={onEdit} style={{ fontSize: 11 }}>
        Éditer
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onDelete}
        style={{ fontSize: 11, color: 'var(--danger)' }}
      >
        ×
      </button>
    </div>
  )
}

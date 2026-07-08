import { useEffect, useRef, useState } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import { matchCategoryByKeyword } from '../../engine/categoryMatcher'
import { currentYearMonth } from '../../engine/budgetEngine'
import type { TransactionType } from '../../types/budget'

interface Props {
  month: string  // YYYY-MM — prefills the date
  onClose: () => void
}

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Dépense',
  income: 'Revenu',
  transfer: 'Virement',
}

function defaultDate(month: string): string {
  if (month === currentYearMonth()) {
    return new Date().toISOString().slice(0, 10)
  }
  return `${month}-01`
}

export default function AddTransactionModal({ month, onClose }: Props) {
  const { addTransaction, categories, envelopes } = useBudgetStore()

  const [type, setType] = useState<TransactionType>('expense')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => defaultDate(month))
  const [categoryId, setCategoryId] = useState('')
  const [envelopeId, setEnvelopeId] = useState('')
  const [note, setNote] = useState('')
  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null)
  // Track whether user has manually changed the category since last suggestion was applied
  const userChangedCategory = useRef(false)

  const relevantCategories = categories.filter((c) => {
    if (type === 'income') return c.group === 'income'
    if (type === 'expense') return c.group !== 'income'
    return true
  })

  // Debounced keyword suggestion on label change
  useEffect(() => {
    if (!label.trim()) {
      setSuggestedCategoryId(null)
      return
    }
    const timer = setTimeout(() => {
      const match = matchCategoryByKeyword(label, categories)
      const matchedId = match?.categoryId ?? null
      setSuggestedCategoryId(matchedId)
      // Auto-apply suggestion only if user hasn't manually overridden
      if (matchedId && !userChangedCategory.current) {
        setCategoryId(matchedId)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [label, categories])

  function handleCategoryChange(id: string) {
    userChangedCategory.current = true
    setCategoryId(id)
  }

  function handleLabelChange(val: string) {
    setLabel(val)
    // Reset manual override flag when label changes significantly
    if (val.length === 0) {
      userChangedCategory.current = false
      setCategoryId('')
    }
  }

  function handleSubmit() {
    const amtNum = parseFloat(amount.replace(',', '.'))
    if (!label.trim() || isNaN(amtNum) || amtNum <= 0 || !date) return
    addTransaction({
      label: label.trim(),
      amount: amtNum,
      type,
      date,
      categoryId: categoryId || (relevantCategories[0]?.id ?? ''),
      envelopeId: envelopeId || undefined,
      note: note.trim() || undefined,
      source: 'manual',
      categorySource: 'manual',
    })
    onClose()
  }

  const suggestedCat = suggestedCategoryId ? categories.find((c) => c.id === suggestedCategoryId) : null

  return (
    <div className="scrim" onMouseDown={onClose} style={{ zIndex: 60 }}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-pop)',
          width: 420,
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          animation: 'pop .18s var(--ease)',
        }}
      >
        {/* Title */}
        <div className="row gap8" style={{ alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: 'var(--ink)' }}>Nouvelle transaction</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '2px 8px' }}>✕</button>
        </div>

        {/* Type selector */}
        <div className="row gap4">
          {(['expense', 'income', 'transfer'] as TransactionType[]).map((t) => (
            <button
              key={t}
              className={`btn btn-sm${type === t ? '' : ' btn-ghost'}`}
              onClick={() => setType(t)}
              style={{ flex: 1, fontSize: 12 }}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Label */}
        <div className="col gap4">
          <label className="eyebrow">Libellé</label>
          <input
            autoFocus
            placeholder="Ex. Courses Monoprix"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Amount + Date */}
        <div className="row gap8">
          <div className="col gap4" style={{ flex: 1 }}>
            <label className="eyebrow">Montant (€)</label>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ fontSize: 13, textAlign: 'right' }}
            />
          </div>
          <div className="col gap4" style={{ flex: 1 }}>
            <label className="eyebrow">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>

        {/* Category */}
        <div className="col gap4">
          <div className="row gap6" style={{ alignItems: 'center' }}>
            <label className="eyebrow" style={{ flex: 1 }}>Catégorie</label>
            {suggestedCat && categoryId === suggestedCat.id && (
              <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, letterSpacing: '0.04em' }}>
                suggestion mot-clé
              </span>
            )}
          </div>
          <select
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            style={{
              fontSize: 13, background: 'var(--surface-1)', border: '1px solid var(--hairline)',
              borderRadius: 6, padding: '6px 10px', color: 'var(--ink)', width: '100%',
            }}
          >
            <option value="">Sélectionner…</option>
            {relevantCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Envelope (optional) */}
        {type === 'expense' && envelopes.filter((e) => e.active).length > 0 && (
          <div className="col gap4">
            <label className="eyebrow">Enveloppe (optionnel)</label>
            <select
              value={envelopeId}
              onChange={(e) => setEnvelopeId(e.target.value)}
              style={{
                fontSize: 13, background: 'var(--surface-1)', border: '1px solid var(--hairline)',
                borderRadius: 6, padding: '6px 10px', color: 'var(--ink)', width: '100%',
              }}
            >
              <option value="">Aucune enveloppe</option>
              {envelopes.filter((e) => e.active).map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Note */}
        <div className="col gap4">
          <label className="eyebrow">Note (optionnel)</label>
          <input
            placeholder="Commentaire…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Actions */}
        <div className="row gap8" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-sm"
            onClick={handleSubmit}
            disabled={!label.trim() || !amount || parseFloat(amount) <= 0}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

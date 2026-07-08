import { useState } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import { normalizeText } from '../../engine/categoryMatcher'
import { CATEGORY_GROUP_LABELS } from '../../data/defaultCategories'
import type { BudgetCategory, BudgetCategoryGroup } from '../../types/budget'

const GROUP_ORDER: BudgetCategoryGroup[] = ['income', 'fixed', 'variable', 'savings']

const GROUP_COLORS: Record<BudgetCategoryGroup, string> = {
  income: '#4cb782',
  fixed: '#5e6ad2',
  variable: '#eb9234',
  savings: '#828fff',
}

const DEFAULT_COLORS = ['#5e6ad2', '#eb9234', '#4cb782', '#eb5757', '#828fff', '#6c78d5', '#62b787', '#f09d4e']

interface Props {
  onClose: () => void
}

function KeywordSection({ cat }: { cat: BudgetCategory }) {
  const { addKeywordToCategory, removeKeywordFromCategory, categories } = useBudgetStore()
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    const kw = input.trim()
    if (!kw) return
    const result = addKeywordToCategory(cat.id, kw)
    if (result.success) {
      setInput('')
      setError(null)
    } else if (result.error === 'too_short') {
      setError('3 caractères minimum')
    } else if (result.error === 'duplicate') {
      // Find the other category that owns this keyword
      const norm = normalizeText(kw)
      const owner = categories.find(
        (c) => c.id !== cat.id && (c.keywords ?? []).some((k) => normalizeText(k) === norm)
      )
      setError(owner ? `Déjà associé à « ${owner.label} »` : 'Mot-clé déjà utilisé')
    }
  }

  const keywords = cat.keywords ?? []

  return (
    <div style={{ marginTop: 6, paddingLeft: 18 }}>
      {keywords.length > 0 && (
        <div className="row gap4" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
          {keywords.map((kw) => (
            <span
              key={kw}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                borderRadius: 99, padding: '2px 8px', fontSize: 11, color: 'var(--ink-secondary)',
              }}
            >
              {kw}
              <button
                onClick={() => removeKeywordFromCategory(cat.id, kw)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-tertiary)', fontSize: 10, padding: 0, lineHeight: 1,
                }}
                title="Supprimer ce mot-clé"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="row gap6" style={{ alignItems: 'center' }}>
        <input
          placeholder="Ajouter un mot-clé…"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          style={{ fontSize: 12, flex: 1, padding: '3px 8px' }}
        />
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{ fontSize: 12, padding: '3px 8px' }}
        >
          +
        </button>
      </div>
      {error && (
        <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, display: 'block' }}>{error}</span>
      )}
    </div>
  )
}

export default function CategoryManagerModal({ onClose }: Props) {
  const { categories, addCategory, removeCategory, recategorizeTransactions } = useBudgetStore()

  const [newLabel, setNewLabel] = useState('')
  const [newGroup, setNewGroup] = useState<BudgetCategoryGroup>('variable')
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recatScope, setRecatScope] = useState<'uncategorized_only' | 'all_non_manual'>('uncategorized_only')
  const [recatResult, setRecatResult] = useState<number | null>(null)

  function handleAdd() {
    if (!newLabel.trim()) return
    addCategory({ label: newLabel.trim(), group: newGroup, color: newColor })
    setNewLabel('')
    setNewColor(DEFAULT_COLORS[0])
  }

  function handleRecategorize() {
    const { updated } = recategorizeTransactions(recatScope)
    setRecatResult(updated)
  }

  return (
    <div className="scrim" onMouseDown={onClose} style={{ zIndex: 60 }}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-pop)',
          width: 520,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'pop .18s var(--ease)',
        }}
      >
        {/* Header */}
        <div className="row gap8" style={{ padding: '16px 20px', borderBottom: '1px solid var(--hairline)', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: 'var(--ink)' }}>Gérer les catégories</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '2px 8px' }}>✕</button>
        </div>

        {/* Category list */}
        <div className="scroll" style={{ flex: 1, padding: '12px 20px' }}>
          {GROUP_ORDER.map((group) => {
            const groupCats = categories.filter((c) => c.group === group)
            if (groupCats.length === 0) return null
            return (
              <div key={group} style={{ marginBottom: 16 }}>
                <div className="eyebrow" style={{ marginBottom: 6, color: GROUP_COLORS[group] }}>
                  {CATEGORY_GROUP_LABELS[group]}
                </div>
                <div className="col gap3">
                  {groupCats.map((cat) => {
                    const isExpanded = expandedId === cat.id
                    return (
                      <div
                        key={cat.id}
                        style={{
                          borderRadius: 6, background: 'var(--surface-1)',
                          border: `1px solid ${isExpanded ? 'var(--hairline-strong)' : 'transparent'}`,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          className="row gap8"
                          style={{ alignItems: 'center', padding: '5px 8px', cursor: 'pointer' }}
                          onClick={() => setExpandedId(isExpanded ? null : cat.id)}
                        >
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color ?? GROUP_COLORS[group], flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{cat.label}</span>
                          {(cat.keywords?.length ?? 0) > 0 && (
                            <span style={{
                              fontSize: 10, color: 'var(--primary)', background: 'var(--surface-2)',
                              borderRadius: 99, padding: '1px 6px', fontWeight: 600,
                            }}>
                              {cat.keywords!.length} mot{cat.keywords!.length > 1 ? 's' : ''}-clé{cat.keywords!.length > 1 ? 's' : ''}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: 'var(--ink-tertiary)' }}>{isExpanded ? '▲' : '▼'}</span>
                          {cat.isSystem ? (
                            <span className="caption" style={{ color: 'var(--ink-tertiary)' }}>système</span>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => { e.stopPropagation(); removeCategory(cat.id) }}
                              style={{ padding: '1px 6px', fontSize: 11, color: 'var(--ink-tertiary)' }}
                              title="Supprimer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {isExpanded && (
                          <div style={{ padding: '0 8px 10px', borderTop: '1px solid var(--hairline)' }}>
                            <div className="eyebrow" style={{ marginTop: 8, marginBottom: 4, color: 'var(--ink-tertiary)' }}>
                              Mots-clés de catégorisation automatique
                            </div>
                            <KeywordSection cat={cat} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Recategorize */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="eyebrow">Recatégoriser les transactions</div>
          <div className="row gap8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="row gap4">
              <button
                className={`btn btn-sm${recatScope === 'uncategorized_only' ? '' : ' btn-ghost'}`}
                onClick={() => { setRecatScope('uncategorized_only'); setRecatResult(null) }}
                style={{ fontSize: 11 }}
              >
                Non catégorisées seulement
              </button>
              <button
                className={`btn btn-sm${recatScope === 'all_non_manual' ? '' : ' btn-ghost'}`}
                onClick={() => { setRecatScope('all_non_manual'); setRecatResult(null) }}
                style={{ fontSize: 11 }}
                title="Toutes les transactions catégorisées automatiquement — peut modifier des catégories déjà attribuées par mot-clé"
              >
                Toutes (hors manuelles)
              </button>
            </div>
            <button className="btn btn-sm" onClick={handleRecategorize} style={{ fontSize: 11 }}>
              Appliquer
            </button>
            {recatResult !== null && (
              <span style={{ fontSize: 12, color: recatResult > 0 ? 'var(--success)' : 'var(--ink-tertiary)' }}>
                {recatResult > 0 ? `${recatResult} transaction(s) mise(s) à jour` : 'Aucune modification'}
              </span>
            )}
          </div>
          {recatScope === 'all_non_manual' && (
            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
              ⚠ Ce scope peut modifier des catégories déjà attribuées automatiquement.
            </span>
          )}
        </div>

        {/* Add custom category */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="eyebrow">Ajouter une catégorie personnalisée</div>
          <div className="row gap8">
            <input
              placeholder="Nom de la catégorie"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              style={{ flex: 1, fontSize: 13 }}
            />
            <select
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value as BudgetCategoryGroup)}
              style={{
                fontSize: 12, background: 'var(--surface-1)', border: '1px solid var(--hairline)',
                borderRadius: 6, padding: '4px 8px', color: 'var(--ink)',
              }}
            >
              {GROUP_ORDER.map((g) => (
                <option key={g} value={g}>{CATEGORY_GROUP_LABELS[g]}</option>
              ))}
            </select>
          </div>
          <div className="row gap6" style={{ alignItems: 'center' }}>
            <span className="caption" style={{ color: 'var(--ink-tertiary)' }}>Couleur</span>
            {DEFAULT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                style={{
                  width: 18, height: 18, borderRadius: '50%', background: c,
                  border: c === newColor ? '2px solid var(--ink)' : '2px solid transparent',
                  cursor: 'pointer', padding: 0,
                }}
              />
            ))}
            <div style={{ flex: 1 }} />
            <button
              className="btn btn-sm"
              onClick={handleAdd}
              disabled={!newLabel.trim()}
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

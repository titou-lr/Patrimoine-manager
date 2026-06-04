import { useState, useEffect } from 'react'
import { GLOSSARY_TERMS, GLOSSARY_BY_ID, GLOSSARY_CATEGORIES } from '../../data/glossary'
import type { GlossaryTerm } from '../../data/glossary'
import FormulaBlock from './FormulaBlock'

interface Props {
  initialTermId?: string
  onClose: () => void
  /** Rendu sans overlay (pour usage inline dans un autre panel) */
  _inline?: boolean
}

const CATEGORY_LABELS: Record<typeof GLOSSARY_CATEGORIES[number], string> = {
  fiscal:         'Fiscal',
  investissement: 'Investissement',
  enveloppe:      'Enveloppes',
  calcul:         'Calcul',
  risque:         'Risque',
}

const CATEGORY_COLORS: Record<typeof GLOSSARY_CATEGORIES[number], string> = {
  fiscal:         'bg-warning/10 text-warning border-warning/20',
  investissement: 'bg-orange/10 text-orange border-orange/20',
  enveloppe:      'bg-purple/10 text-purple border-purple/20',
  calcul:         'bg-success/10 text-success border-success/20',
  risque:         'bg-danger/10 text-danger border-danger/20',
}

export function GlossaryContent({ initialTermId, onClose }: { initialTermId?: string; onClose?: () => void }) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialTermId ?? GLOSSARY_TERMS[0]?.id ?? null)

  useEffect(() => {
    if (initialTermId) setSelectedId(initialTermId)
  }, [initialTermId])

  const filtered = GLOSSARY_TERMS.filter((t) => {
    if (activeCategory && t.category !== activeCategory) return false
    if (!search) return true
    const q = search.toLowerCase()
    return t.term.toLowerCase().includes(q) || t.shortDef.toLowerCase().includes(q)
  })

  const selected = selectedId ? GLOSSARY_BY_ID[selectedId] : null

  function handleRelatedClick(id: string) {
    const term = GLOSSARY_BY_ID[id]
    if (term) {
      setSelectedId(id)
      setActiveCategory(null)
      setSearch('')
    }
  }

  return (
    <>
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <span className="font-semibold text-sm text-foreground">Glossaire financier</span>
        <span className="text-xs text-muted">{GLOSSARY_TERMS.length} termes</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-elevated text-sm"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — liste */}
        <div className="w-64 shrink-0 border-r border-border flex flex-col">

          {/* Barre de recherche */}
          <div className="p-3 border-b border-border">
            <input
              type="text"
              placeholder="Rechercher un terme…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg text-xs px-3 py-2 text-foreground placeholder:text-muted outline-none focus:border-orange/40"
            />
          </div>

          {/* Filtres catégorie */}
          <div className="p-3 border-b border-border flex flex-wrap gap-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                !activeCategory ? 'bg-orange/15 text-orange border-orange/30' : 'border-border text-muted hover:text-foreground'
              }`}
            >
              Tous
            </button>
            {GLOSSARY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                  activeCategory === cat ? CATEGORY_COLORS[cat] : 'border-border text-muted hover:text-foreground'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Liste des termes */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-4 text-xs text-muted text-center">Aucun terme trouvé</div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left px-4 py-2.5 transition-colors border-b border-border/50 ${
                    selectedId === t.id
                      ? 'bg-orange/5 border-l-2 border-l-orange pl-3'
                      : 'hover:bg-elevated pl-4'
                  }`}
                >
                  <div className="text-xs font-medium text-foreground">{t.term}</div>
                  <div className="text-[10px] text-muted mt-0.5 line-clamp-2 leading-relaxed">{t.shortDef}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panneau détail */}
        <div className="flex-1 overflow-y-auto p-6">
          {selected ? (
            <TermDetail term={selected} onRelatedClick={handleRelatedClick} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted">
              Sélectionnez un terme
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function GlossaryModal({ initialTermId, onClose, _inline }: Props) {
  useEffect(() => {
    if (_inline) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, _inline])

  if (_inline) {
    return (
      <div className="flex flex-col h-full">
        <GlossaryContent initialTermId={initialTermId} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-base border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <GlossaryContent initialTermId={initialTermId} onClose={onClose} />
      </div>
    </div>
  )
}

function TermDetail({ term, onRelatedClick }: { term: GlossaryTerm; onRelatedClick: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-4 max-w-prose">

      {/* Titre + badge catégorie */}
      <div>
        <div className="flex items-start gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-foreground">{term.term}</h2>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[term.category]}`}>
            {CATEGORY_LABELS[term.category]}
          </span>
        </div>
        <p className="text-sm text-muted mt-1 leading-relaxed">{term.shortDef}</p>
      </div>

      {/* Définition complète */}
      <p className="text-sm text-secondary leading-relaxed">{term.fullDef}</p>

      {/* Formule */}
      {term.formula && <FormulaBlock formula={term.formula} />}

      {/* Exemple */}
      {term.example && (
        <div className="bg-elevated border border-border rounded-xl p-4">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Exemple</div>
          <p className="text-xs text-secondary leading-relaxed">{term.example}</p>
        </div>
      )}

      {/* Termes liés */}
      {term.relatedTerms.length > 0 && (
        <div>
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2">Termes liés</div>
          <div className="flex flex-wrap gap-1.5">
            {term.relatedTerms.map((relId) => {
              const rel = GLOSSARY_BY_ID[relId]
              if (!rel) return null
              return (
                <button
                  key={relId}
                  onClick={() => onRelatedClick(relId)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border text-muted hover:text-foreground hover:border-border-mid transition-colors"
                >
                  {rel.term}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

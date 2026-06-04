import { useState } from 'react'
import { useStore, selectActiveSim } from '../../store/useStore'
import type { LifeEvent, LifeEventType } from '../../types'

const EVENT_META: Record<LifeEventType, { emoji: string; label: string; description: string }> = {
  pause:            { emoji: '⏸', label: 'Pause des versements',       description: 'Arrête les versements temporairement' },
  windfall:         { emoji: '💰', label: 'Rentrée d\'argent',           description: 'Héritage, bonus, vente d\'actif' },
  withdrawal:       { emoji: '🏠', label: 'Retrait immobilier',          description: 'Retrait pour un projet immobilier' },
  expense_increase: { emoji: '📈', label: 'Hausse de dépenses',          description: 'Loyer, voiture, remboursement de prêt' },
  child:            { emoji: '👶', label: 'Naissance',                   description: 'Dépenses supplémentaires liées à un enfant' },
  custom:           { emoji: '✏️', label: 'Événement personnalisé',      description: 'Impact mensuel libre sur les versements' },
}

// salary_increase n'est pas dans LifeEventType mais on l'ajoute via cast
const SALARY_INCREASE_META = { emoji: '💼', label: 'Augmentation de salaire', description: 'Nouveau salaire et recalcul de l\'effort' }

type FormEventType = LifeEventType | 'salary_increase'

const ALL_EVENT_TYPES: { type: FormEventType; emoji: string; label: string; description: string }[] = [
  { type: 'pause',            ...EVENT_META.pause },
  { type: 'windfall',         ...EVENT_META.windfall },
  { type: 'withdrawal',       ...EVENT_META.withdrawal },
  { type: 'expense_increase', ...EVENT_META.expense_increase },
  { type: 'child',            ...EVENT_META.child },
  { type: 'salary_increase',  ...SALARY_INCREASE_META },
  { type: 'custom',           ...EVENT_META.custom },
]

interface FormState {
  type: FormEventType
  yearOffset: number
  duration: number
  amount: number
  envelopeId: string
  monthlyImpact: number
  note: string
}

const DEFAULT_FORM: FormState = {
  type: 'windfall',
  yearOffset: 5,
  duration: 1,
  amount: 10000,
  envelopeId: '',
  monthlyImpact: 200,
  note: '',
}

export default function LifeEvents() {
  const activeSim = useStore(selectActiveSim)
  const { addLifeEvent, removeLifeEvent } = useStore()
  const events = activeSim.events ?? []
  const envelopes = activeSim.envelopes.filter((e) => e.active)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }))
  }

  function handleAdd() {
    const meta = ALL_EVENT_TYPES.find((t) => t.type === form.type)
    const eventType = (form.type === 'salary_increase' ? 'custom' : form.type) as LifeEventType

    const event: LifeEvent = {
      id: `ev_${Date.now()}`,
      type: eventType,
      label: form.note.trim() || (meta?.label ?? form.type),
      yearOffset: form.yearOffset,
    }

    // Attach fields based on type
    if (form.type === 'pause') {
      event.duration = form.duration
      if (form.envelopeId) event.envelopeId = form.envelopeId
    } else if (form.type === 'windfall' || form.type === 'withdrawal' || form.type === 'salary_increase') {
      event.amount = form.amount
      if (form.envelopeId && form.type !== 'salary_increase') event.envelopeId = form.envelopeId
    } else if (form.type === 'expense_increase' || form.type === 'child') {
      event.monthlyImpact = form.monthlyImpact
      event.duration = form.duration
    } else if (form.type === 'custom') {
      event.monthlyImpact = form.monthlyImpact
      event.duration = form.duration
      if (form.envelopeId) event.envelopeId = form.envelopeId
    }

    addLifeEvent(event)
    setShowForm(false)
    setForm(DEFAULT_FORM)
  }

  const sorted = [...events].sort((a, b) => a.yearOffset - b.yearOffset)

  function getEventDisplay(event: LifeEvent) {
    const meta = EVENT_META[event.type]
    const emoji = meta?.emoji ?? '📅'
    let detail = ''
    if (event.amount != null) detail = `${event.amount.toLocaleString('fr-FR')} €`
    else if (event.monthlyImpact != null) detail = `${event.monthlyImpact > 0 ? '+' : ''}${event.monthlyImpact} €/mois`
    if (event.duration) detail += ` · ${event.duration} an${event.duration > 1 ? 's' : ''}`
    return { emoji, detail }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-foreground">Événements de vie</div>
          <div className="text-xs text-muted mt-0.5">
            Modélisez les imprévus et projets futurs dans la simulation
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-lg bg-orange text-white text-xs font-medium hover:bg-orange/90 transition-colors shrink-0"
        >
          + Ajouter
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 animate-in">

          {/* Grille types d'événements */}
          <div>
            <div className="text-xs text-muted mb-2">Type d'événement</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALL_EVENT_TYPES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => patch({ type: t.type })}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                    form.type === t.type
                      ? 'border-orange bg-orange/10 text-foreground'
                      : 'border-border text-muted hover:border-border-mid hover:text-foreground'
                  }`}
                >
                  <span className="text-lg leading-none">{t.emoji}</span>
                  <span className="text-xs font-medium leading-tight">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Champs communs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block">Dans combien d'années</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.yearOffset}
                  onChange={(e) => patch({ yearOffset: Math.max(0, Number(e.target.value)) })}
                  className="w-full bg-elevated border border-border rounded-lg pl-3 pr-10 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-orange"
                  min={0}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">ans</span>
              </div>
            </div>

            {/* Durée (pause, expense, child, custom) */}
            {['pause', 'expense_increase', 'child', 'custom'].includes(form.type) && (
              <div>
                <label className="text-xs text-muted mb-1 block">Durée</label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => patch({ duration: Math.max(0.1, Number(e.target.value)) })}
                    className="w-full bg-elevated border border-border rounded-lg pl-3 pr-10 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-orange"
                    min={0.1}
                    step={0.5}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">ans</span>
                </div>
              </div>
            )}

            {/* Montant (windfall, withdrawal, salary_increase) */}
            {['windfall', 'withdrawal', 'salary_increase'].includes(form.type) && (
              <div>
                <label className="text-xs text-muted mb-1 block">
                  {form.type === 'salary_increase' ? 'Nouveau salaire net/mois' : 'Montant'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => patch({ amount: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-elevated border border-border rounded-lg pl-3 pr-7 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-orange"
                    min={0}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">€</span>
                </div>
              </div>
            )}

            {/* Impact mensuel (expense_increase, child, custom) */}
            {['expense_increase', 'child', 'custom'].includes(form.type) && (
              <div>
                <label className="text-xs text-muted mb-1 block">
                  {form.type === 'custom' ? 'Impact mensuel (±€)' : 'Dépenses supplémentaires/mois'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={form.monthlyImpact}
                    onChange={(e) => patch({ monthlyImpact: Number(e.target.value) })}
                    className="w-full bg-elevated border border-border rounded-lg pl-3 pr-7 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-orange"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">€</span>
                </div>
              </div>
            )}
          </div>

          {/* Enveloppe cible (optionnel pour windfall/withdrawal/pause/custom) */}
          {['windfall', 'withdrawal', 'pause', 'custom'].includes(form.type) && envelopes.length > 0 && (
            <div>
              <label className="text-xs text-muted mb-1 block">
                Enveloppe concernée (optionnel — toutes par défaut)
              </label>
              <select
                value={form.envelopeId}
                onChange={(e) => patch({ envelopeId: e.target.value })}
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-orange"
              >
                <option value="">Toutes les enveloppes</option>
                {envelopes.map((env) => (
                  <option key={env.id} value={env.id}>{env.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Label personnalisé */}
          <div>
            <label className="text-xs text-muted mb-1 block">Label (optionnel)</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => patch({ note: e.target.value })}
              placeholder="Ex : Héritage grand-père, congé maternité…"
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-orange"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              className="flex-1 py-2 rounded-xl bg-orange text-white text-sm font-medium hover:bg-orange/90 transition-colors"
            >
              Ajouter l'événement
            </button>
            <button
              onClick={() => { setShowForm(false); setForm(DEFAULT_FORM) }}
              className="px-4 py-2 rounded-xl border border-border text-sm text-muted hover:text-foreground transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des événements */}
      {sorted.length > 0 ? (
        <div className="flex flex-col gap-2">
          {sorted.map((event) => {
            const { emoji, detail } = getEventDisplay(event)
            const targetEnv = envelopes.find((e) => e.id === event.envelopeId)
            return (
              <div
                key={event.id}
                className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3 group"
              >
                <span className="text-xl shrink-0">{emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground leading-snug truncate">
                    {event.label}
                  </div>
                  <div className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-2">
                    <span>An {event.yearOffset}</span>
                    {detail && <span>{detail}</span>}
                    {targetEnv && <span>→ {targetEnv.label}</span>}
                  </div>
                </div>
                <button
                  onClick={() => removeLifeEvent(event.id)}
                  className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1 shrink-0"
                  title="Supprimer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        !showForm && (
          <div className="bg-surface border border-dashed border-border rounded-2xl py-8 text-center text-xs text-muted">
            Aucun événement — ajoutez des jalons de vie pour les intégrer dans la simulation
          </div>
        )
      )}
    </div>
  )
}

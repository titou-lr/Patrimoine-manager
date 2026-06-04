import { useState } from 'react'
import type { Envelope, SimulationResult } from '../../types'

export interface EnvelopeCapUpdate {
  sourceEnvelopeId: string
  action: 'stop' | 'redirect'
  targetEnvelopeId?: string
  amount: number
}

interface Props {
  capReachedByEnvelope: Record<string, number>
  envelopes: Envelope[]
  lastResults: SimulationResult | null
  onApply: (updates: EnvelopeCapUpdate[]) => void
  onClose: () => void
}

export default function CapOverflowModal({
  capReachedByEnvelope, envelopes, onApply, onClose,
}: Props) {
  const cappedEnvelopes = envelopes.filter(e => capReachedByEnvelope[e.id] !== undefined)
  const otherEnvelopes = envelopes.filter(e => e.active && capReachedByEnvelope[e.id] === undefined)

  const [choices, setChoices] = useState<Record<string, { action: 'stop' | 'redirect'; targetId: string }>>(() => {
    const init: Record<string, { action: 'stop' | 'redirect'; targetId: string }> = {}
    for (const env of cappedEnvelopes) {
      init[env.id] = { action: 'stop', targetId: otherEnvelopes[0]?.id ?? '' }
    }
    return init
  })

  function setAction(envId: string, action: 'stop' | 'redirect') {
    setChoices(c => ({ ...c, [envId]: { ...c[envId], action } }))
  }
  function setTarget(envId: string, targetId: string) {
    setChoices(c => ({ ...c, [envId]: { ...c[envId], targetId } }))
  }

  function handleApply() {
    const updates: EnvelopeCapUpdate[] = cappedEnvelopes.map(env => {
      const ch = choices[env.id]
      return {
        sourceEnvelopeId: env.id,
        action: ch.action,
        targetEnvelopeId: ch.action === 'redirect' ? ch.targetId : undefined,
        amount: env.monthlyContribution,
      }
    })
    onApply(updates)
  }

  return (
    <div className="scrim" onMouseDown={onClose} style={{ zIndex: 120 }}>
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: 520, maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto',
          background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-pop)',
          animation: 'pop .18s var(--ease)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--hairline)' }}>
          <div className="row gap8" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <h2 className="title" style={{ fontSize: 15, flex: 1 }}>Plafonds légaux atteints</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
              <svg width={15} height={15} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          <p className="caption" style={{ marginTop: 4 }}>
            Ces enveloppes ont atteint leur plafond légal de versement. Choisissez ce qu'il faut faire du montant mensuel orphelin.
          </p>
        </div>

        {/* Corps */}
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cappedEnvelopes.map(env => {
            const year = capReachedByEnvelope[env.id]
            const ch = choices[env.id]
            return (
              <div key={env.id} className="panel" style={{ padding: 14 }}>
                <div className="row gap8" style={{ marginBottom: 10, alignItems: 'baseline' }}>
                  <span className="subhead" style={{ fontSize: 13 }}>{env.label}</span>
                  <span className="badge">Plafond atteint an {year + 1}</span>
                  <div className="grow" />
                  <span className="mono small muted">{env.monthlyContribution} €/mois orphelins</span>
                </div>

                <div className="col gap8">
                  {/* Option stop */}
                  <label className="row gap8" style={{ alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio" name={`action-${env.id}`}
                      checked={ch.action === 'stop'}
                      onChange={() => setAction(env.id, 'stop')}
                      style={{ accentColor: 'var(--primary)', flexShrink: 0 }}
                    />
                    <span className="small">Arrêter les versements</span>
                  </label>

                  {/* Option redirect */}
                  <label className="row gap8" style={{ alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio" name={`action-${env.id}`}
                      checked={ch.action === 'redirect'}
                      onChange={() => setAction(env.id, 'redirect')}
                      disabled={otherEnvelopes.length === 0}
                      style={{ accentColor: 'var(--primary)', flexShrink: 0 }}
                    />
                    <span className="small">Rediriger vers</span>
                    {ch.action === 'redirect' && otherEnvelopes.length > 0 && (
                      <select
                        value={ch.targetId}
                        onChange={e => setTarget(env.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          height: 28, padding: '0 8px', fontSize: 12,
                          background: 'var(--surface-3)', border: '1px solid var(--hairline-strong)',
                          borderRadius: 'var(--r-md)', color: 'var(--ink)',
                        }}
                      >
                        {otherEnvelopes.map(t => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    )}
                    {otherEnvelopes.length === 0 && (
                      <span className="caption" style={{ color: 'var(--ink-tertiary)' }}>
                        (aucune autre enveloppe active disponible)
                      </span>
                    )}
                  </label>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="row gap8" style={{ padding: '12px 20px', borderTop: '1px solid var(--hairline)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Fermer sans modifier
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleApply}>
            Appliquer et relancer la simulation
          </button>
        </div>
      </div>
    </div>
  )
}

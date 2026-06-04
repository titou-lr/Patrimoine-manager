import { useState } from 'react'
import type { Envelope } from '../../types'

export interface CapRedirectChoice {
  envelopeId: string
  capRedirectTo?: string  // undefined = arrêter sans redirection
}

interface Props {
  capReachedByEnvelope: Record<string, number>
  envelopes: Envelope[]
  onApply: (choices: CapRedirectChoice[]) => void
  onClose: () => void
}

export default function CapOverflowModal({
  capReachedByEnvelope, envelopes, onApply, onClose,
}: Props) {
  const cappedEnvelopes = envelopes.filter(e => capReachedByEnvelope[e.id] !== undefined)
  const otherEnvelopes = envelopes.filter(e => e.active && capReachedByEnvelope[e.id] === undefined)

  const [choices, setChoices] = useState<Record<string, { redirect: boolean; targetId: string }>>(() => {
    const init: Record<string, { redirect: boolean; targetId: string }> = {}
    for (const env of cappedEnvelopes) {
      init[env.id] = {
        redirect: !!env.capRedirectTo,
        targetId: env.capRedirectTo ?? otherEnvelopes[0]?.id ?? '',
      }
    }
    return init
  })

  function handleApply() {
    const result: CapRedirectChoice[] = cappedEnvelopes.map(env => {
      const ch = choices[env.id]
      return {
        envelopeId: env.id,
        capRedirectTo: ch.redirect && ch.targetId ? ch.targetId : undefined,
      }
    })
    onApply(result)
  }

  return (
    <div className="scrim" onMouseDown={onClose} style={{ zIndex: 120 }}>
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: 480, maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto',
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
            Choisissez où rediriger les versements de chaque enveloppe plafonnée.
          </p>
        </div>

        {/* Corps */}
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cappedEnvelopes.map(env => {
            const year = capReachedByEnvelope[env.id]
            const ch = choices[env.id]
            return (
              <div key={env.id} className="panel" style={{ padding: 14 }}>
                <div className="row gap8" style={{ marginBottom: 10, alignItems: 'baseline' }}>
                  <span className="subhead" style={{ fontSize: 13 }}>{env.label}</span>
                  <span className="badge">Plafond atteint an {year + 1}</span>
                </div>

                <div className="col gap8">
                  <label className="row gap8" style={{ alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio" name={`redirect-${env.id}`}
                      checked={!ch.redirect}
                      onChange={() => setChoices(c => ({ ...c, [env.id]: { ...c[env.id], redirect: false } }))}
                      style={{ accentColor: 'var(--primary)', flexShrink: 0 }}
                    />
                    <span className="small">Arrêter les versements</span>
                  </label>

                  <label className="row gap8" style={{ alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="radio" name={`redirect-${env.id}`}
                      checked={ch.redirect}
                      onChange={() => setChoices(c => ({ ...c, [env.id]: { ...c[env.id], redirect: true } }))}
                      disabled={otherEnvelopes.length === 0}
                      style={{ accentColor: 'var(--primary)', flexShrink: 0 }}
                    />
                    <span className="small">Rediriger vers</span>
                    {ch.redirect && otherEnvelopes.length > 0 && (
                      <select
                        value={ch.targetId}
                        onChange={e => setChoices(c => ({ ...c, [env.id]: { ...c[env.id], targetId: e.target.value } }))}
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
                        (aucune autre enveloppe active)
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
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary btn-sm" onClick={handleApply}>
            Appliquer et relancer
          </button>
        </div>
      </div>
    </div>
  )
}

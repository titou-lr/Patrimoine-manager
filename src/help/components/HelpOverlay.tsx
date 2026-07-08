import { useEffect } from 'react'
import type { HelpContent } from '../types/help'

// Même teinte de scrim que SpotlightOverlay (cohérence visuelle), mais sans
// découpe spotlight : toute la surface est scrimée. Composant indépendant du tour.
const SCRIM_COLOR = 'rgba(1,1,2,0.82)'
const PANEL_W = 560

interface Props {
  content: HelpContent
  onClose: () => void
}

export default function HelpOverlay({ content, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    // capture: passe avant le handler global d'App (qui ferme palette/dropdown)
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: SCRIM_COLOR,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: PANEL_W, maxWidth: '100%', maxHeight: 'calc(100vh - 64px)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-pop)',
          animation: 'pop .18s var(--ease)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="spread" style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Aide</div>
            <div className="title" style={{ fontSize: 15 }}>{content.pageTitle}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer l'aide"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-tertiary)', padding: 4, borderRadius: 6, display: 'flex',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-tertiary)')}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* ── Content ───────────────────────────────────────────────────── */}
        <div className="scroll" style={{ overflowY: 'auto', padding: '16px 20px 8px' }}>
          <div className="caption" style={{ fontSize: 12.5, lineHeight: 1.6, marginBottom: 16 }}>
            {content.intro}
          </div>

          {content.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div className="subhead" style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: 'var(--ink)' }}>
                {s.title}
              </div>
              <div className="caption" style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
                {s.content}
              </div>
              {s.tip && (
                <div style={{
                  marginTop: 8, padding: '8px 12px',
                  borderLeft: '2px solid var(--primary)',
                  background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                  borderRadius: '0 var(--r-sm) var(--r-sm) 0',
                  fontSize: 12, lineHeight: 1.55, color: 'var(--ink-subtle)',
                }}>
                  <span style={{ color: 'var(--primary-hover)', fontWeight: 600 }}>Astuce — </span>
                  {s.tip}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

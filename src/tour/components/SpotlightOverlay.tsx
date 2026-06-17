import { useEffect, useRef, useState, useCallback } from 'react'
import type { TourStep } from '../steps/simulationSteps'

interface SpotlightRect {
  x: number; y: number; w: number; h: number
}

interface BubblePos {
  top: number; left: number
}

const BUBBLE_W = 340
const BUBBLE_H_EST = 200  // estimated, for initial positioning
const OVERLAY_COLOR = 'rgba(1,1,2,0.82)'
const PAD_DEFAULT = 10

function getBubblePos(rect: SpotlightRect, pad: number): BubblePos {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const spaceBelow = vh - (rect.y + rect.h + pad)
  const spaceAbove = rect.y - pad

  let top: number
  let left: number

  if (spaceBelow >= BUBBLE_H_EST + 12) {
    top = rect.y + rect.h + pad + 8
  } else if (spaceAbove >= BUBBLE_H_EST + 12) {
    top = rect.y - BUBBLE_H_EST - pad - 8
  } else {
    // float in bottom quarter of screen
    top = vh - BUBBLE_H_EST - 24
  }

  // Align bubble with left edge of spotlight, but keep it on-screen
  left = Math.max(16, Math.min(rect.x, vw - BUBBLE_W - 16))

  return { top, left }
}

interface Props {
  step: TourStep
  stepIndex: number
  totalSteps: number
  firstName: string
  onNext: () => void
  onSkip: () => void
  onActionDetected?: () => void
}

export default function SpotlightOverlay({
  step, stepIndex, totalSteps, firstName, onNext, onSkip, onActionDetected,
}: Props) {
  const [rect, setRect] = useState<SpotlightRect | null>(null)
  const [found, setFound] = useState(true)
  const bubbleRef = useRef<HTMLDivElement>(null)

  const pad = step.padding ?? PAD_DEFAULT

  // Find target element and update rect
  const findTarget = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    // Check element is actually in view (has dimensions)
    if (r.width === 0 && r.height === 0) return null
    return r
  }, [step.targetId])

  useEffect(() => {
    let tries = 0
    let raf = 0

    const attempt = () => {
      const r = findTarget()
      if (r) {
        // Scroll into view if needed, then capture final rect
        const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`)
        if (el) {
          const inView = r.top >= 0 && r.bottom <= window.innerHeight
          if (!inView) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setTimeout(() => {
              const r2 = findTarget()
              if (r2) {
                setRect({ x: r2.left, y: r2.top, w: r2.width, h: r2.height })
                setFound(true)
              }
            }, 350)
          } else {
            setRect({ x: r.left, y: r.top, w: r.width, h: r.height })
            setFound(true)
          }
        }
      } else if (tries < 25) {
        tries++
        raf = window.setTimeout(attempt, 120)
      } else {
        setRect(null)
        setFound(false)
      }
    }

    // Reset state when step changes
    setRect(null)
    setFound(true)

    raf = window.setTimeout(attempt, 60)
    return () => window.clearTimeout(raf)
  }, [step.id, step.targetId, findTarget])

  // Update rect on resize/scroll
  useEffect(() => {
    const update = () => {
      const r = findTarget()
      if (r) setRect({ x: r.left, y: r.top, w: r.width, h: r.height })
    }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [findTarget])

  // Listen for action on required-action steps
  useEffect(() => {
    if (!step.requiresAction || !onActionDetected) return
    const handler = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest(`[data-tour-id="${step.targetId}"]`)
      if (el) {
        // Small delay so the original action executes first
        setTimeout(onActionDetected, 180)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [step.requiresAction, step.targetId, onActionDetected])

  const vw = window.innerWidth
  const vh = window.innerHeight

  // 4-quadrant overlay rectangles (avoid the spotlight area)
  const r = rect ?? { x: vw / 2 - 100, y: vh / 2 - 40, w: 200, h: 80 }
  const x1 = Math.max(0, r.x - pad)
  const y1 = Math.max(0, r.y - pad)
  const x2 = Math.min(vw, r.x + r.w + pad)
  const y2 = Math.min(vh, r.y + r.h + pad)

  const bubblePos = getBubblePos(
    { x: x1, y: y1, w: x2 - x1, h: y2 - y1 },
    12
  )

  return (
    <>
      {/* ── Dark overlay — 4 blocking quads ──────────────────────────────────── */}
      {/* Top */}
      <div style={{
        position: 'fixed', zIndex: 600,
        top: 0, left: 0, right: 0, height: y1,
        background: OVERLAY_COLOR,
        pointerEvents: 'all',
      }} />
      {/* Bottom */}
      <div style={{
        position: 'fixed', zIndex: 600,
        top: y2, left: 0, right: 0, bottom: 0,
        background: OVERLAY_COLOR,
        pointerEvents: 'all',
      }} />
      {/* Left */}
      <div style={{
        position: 'fixed', zIndex: 600,
        top: y1, left: 0, width: x1, height: y2 - y1,
        background: OVERLAY_COLOR,
        pointerEvents: 'all',
      }} />
      {/* Right */}
      <div style={{
        position: 'fixed', zIndex: 600,
        top: y1, left: x2, right: 0, height: y2 - y1,
        background: OVERLAY_COLOR,
        pointerEvents: 'all',
      }} />

      {/* ── Spotlight ring (decorative, pointer-events: none) ─────────────────── */}
      <div style={{
        position: 'fixed', zIndex: 601, pointerEvents: 'none',
        left: x1, top: y1,
        width: x2 - x1, height: y2 - y1,
        borderRadius: 10,
        border: '2px solid var(--primary)',
        boxShadow: '0 0 0 3px color-mix(in srgb, var(--primary) 25%, transparent), 0 0 24px color-mix(in srgb, var(--primary) 15%, transparent)',
        transition: 'left .2s var(--ease), top .2s var(--ease), width .2s var(--ease), height .2s var(--ease)',
      }} />

      {/* ── Bubble ───────────────────────────────────────────────────────────── */}
      <div
        ref={bubbleRef}
        style={{
          position: 'fixed', zIndex: 602,
          top: bubblePos.top, left: bubblePos.left,
          width: BUBBLE_W,
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-pop)',
          padding: '16px 18px 14px',
          animation: 'pop .18s var(--ease)',
        }}
      >
        {/* Progress dots */}
        <div className="row" style={{ gap: 5, marginBottom: 12 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              width: i === stepIndex ? 16 : 6, height: 6,
              borderRadius: 99,
              background: i === stepIndex
                ? 'var(--primary)'
                : i < stepIndex
                  ? 'var(--primary-hover)'
                  : 'var(--hairline-strong)',
              transition: 'all .2s var(--ease)',
              flexShrink: 0,
            }} />
          ))}
          <span className="caption" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-tertiary)', whiteSpace: 'nowrap' }}>
            {stepIndex + 1} / {totalSteps}
          </span>
        </div>

        {/* Content */}
        <div className="subhead" style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--ink)' }}>
          {step.title}
        </div>
        <div className="caption" style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-subtle)', marginBottom: !found ? 10 : 14 }}>
          {step.content(firstName)}
        </div>

        {/* Not found warning */}
        {!found && (
          <div style={{
            marginBottom: 12, padding: '6px 10px',
            background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
            borderRadius: 'var(--r-sm)', fontSize: 11.5, color: 'var(--warning)',
          }}>
            Élément non visible pour l'instant — naviguez pour le voir apparaître.
          </div>
        )}

        {/* Actions */}
        <div className="spread" style={{ alignItems: 'center' }}>
          <button
            onClick={onSkip}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--ink-subtle)', fontSize: 12,
              padding: '4px 0',
              transition: 'color .12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-subtle)')}
          >
            Passer le tutoriel
          </button>

          {step.requiresAction ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, color: 'var(--primary-hover)',
              fontWeight: 500,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--primary)',
                animation: 'pulse-dot 1.4s ease-in-out infinite',
              }} />
              Cliquez l'élément ci-dessus pour continuer
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={onNext}
            >
              {stepIndex === totalSteps - 1 ? 'Terminer' : 'Suivant →'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </>
  )
}

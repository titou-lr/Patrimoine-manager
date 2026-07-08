import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TourStep } from '../steps/simulationSteps'

interface SpotlightRect {
  x: number; y: number; w: number; h: number
}

interface BubblePos {
  top: number; left: number
}

const BUBBLE_W = 340
const BUBBLE_H_FALLBACK = 200   // used only before first real measurement
const OVERLAY_COLOR = 'rgba(1,1,2,0.82)'
const PAD_DEFAULT = 10
const EDGE_MARGIN = 16          // min distance bubble ↔ viewport edges
const BUBBLE_GAP = 12           // distance bubble ↔ spotlight ring

const FIND_RETRIES = 40         // × 120ms ≈ 4.8s — covers page navigation + mount
const FIND_INTERVAL_MS = 120
const STABLE_FRAMES = 3         // rect unchanged over N consecutive frames = layout settled
const STABLE_TIMEOUT_MS = 2000  // hard cap on the stabilization wait (smooth scroll, charts…)
const TRACK_POLL_MS = 250       // safety poll for layout shifts that fire no scroll/resize event

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

function sameRect(a: SpotlightRect, b: SpotlightRect): boolean {
  return (
    Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5
  )
}

/**
 * Places the bubble below the spotlight hole, else above, else beside (right/left),
 * else floating at the bottom — always fully clamped inside the viewport.
 * `hole` is in viewport coordinates (the overlay is position: fixed).
 */
function getBubblePos(hole: SpotlightRect, bubbleH: number, vw: number, vh: number): BubblePos {
  const spaceBelow = vh - (hole.y + hole.h)
  const spaceAbove = hole.y
  const clampTop = (t: number) => clamp(t, EDGE_MARGIN, Math.max(EDGE_MARGIN, vh - bubbleH - EDGE_MARGIN))
  const clampLeft = (l: number) => clamp(l, EDGE_MARGIN, Math.max(EDGE_MARGIN, vw - BUBBLE_W - EDGE_MARGIN))

  if (spaceBelow >= bubbleH + BUBBLE_GAP + EDGE_MARGIN) {
    return { top: clampTop(hole.y + hole.h + BUBBLE_GAP), left: clampLeft(hole.x) }
  }
  if (spaceAbove >= bubbleH + BUBBLE_GAP + EDGE_MARGIN) {
    return { top: clampTop(hole.y - bubbleH - BUBBLE_GAP), left: clampLeft(hole.x) }
  }
  // Beside: right, then left — avoids covering a tall target
  const spaceRight = vw - (hole.x + hole.w)
  if (spaceRight >= BUBBLE_W + BUBBLE_GAP + EDGE_MARGIN) {
    return { top: clampTop(hole.y), left: clampLeft(hole.x + hole.w + BUBBLE_GAP) }
  }
  if (hole.x >= BUBBLE_W + BUBBLE_GAP + EDGE_MARGIN) {
    return { top: clampTop(hole.y), left: clampLeft(hole.x - BUBBLE_W - BUBBLE_GAP) }
  }
  // Float in the bottom quarter of the screen
  return { top: clampTop(vh - bubbleH - 24), left: clampLeft(hole.x) }
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
  const [viewport, setViewport] = useState(() => ({ vw: window.innerWidth, vh: window.innerHeight }))
  const [bubbleH, setBubbleH] = useState(BUBBLE_H_FALLBACK)
  const bubbleRef = useRef<HTMLDivElement>(null)

  const pad = step.padding ?? PAD_DEFAULT

  // ── Phase 1 : find the target, scroll it into view, measure AFTER layout settles ──
  useEffect(() => {
    let cancelled = false
    let timer = 0
    let raf = 0
    let tries = 0

    const queryTarget = () =>
      document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`)

    // Re-measures every animation frame until the rect stops moving
    // (smooth scroll settling, fade-in, charts mounting), then commits it.
    const waitForStableRect = (el: HTMLElement) => {
      let last: DOMRect | null = null
      let stableCount = 0
      const startedAt = performance.now()

      const tick = () => {
        if (cancelled) return
        const r = el.getBoundingClientRect()
        if (
          last &&
          Math.abs(r.top - last.top) < 0.5 && Math.abs(r.left - last.left) < 0.5 &&
          Math.abs(r.width - last.width) < 0.5 && Math.abs(r.height - last.height) < 0.5
        ) {
          stableCount++
        } else {
          stableCount = 0
        }
        last = r
        if (stableCount >= STABLE_FRAMES || performance.now() - startedAt > STABLE_TIMEOUT_MS) {
          setRect({ x: r.left, y: r.top, w: r.width, h: r.height })
          setFound(true)
          return
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const attempt = () => {
      if (cancelled) return
      const el = queryTarget()
      const r = el?.getBoundingClientRect()
      if (el && r && (r.width > 0 || r.height > 0)) {
        const fullyInView =
          r.top >= 0 && r.bottom <= window.innerHeight &&
          r.left >= 0 && r.right <= window.innerWidth
        if (!fullyInView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
        }
        // Measure only once the layout has stabilized — never on a moving target
        waitForStableRect(el)
      } else if (tries < FIND_RETRIES) {
        tries++
        timer = window.setTimeout(attempt, FIND_INTERVAL_MS)
      } else {
        setRect(null)
        setFound(false)
      }
    }

    // No sync state reset here : TourController remonte ce composant à chaque
    // step via key={step.id}, donc rect/found repartent de leur état initial.
    timer = window.setTimeout(attempt, 60)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [step.id, step.targetId])

  // ── Phase 2 : keep the rect in sync (resize, inner scrolling, layout shifts) ──
  const hasRect = rect !== null
  useEffect(() => {
    if (!hasRect) return

    const update = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return
      const next = { x: r.left, y: r.top, w: r.width, h: r.height }
      setRect((prev) => (prev && sameRect(prev, next) ? prev : next))
    }

    const onResize = () => {
      setViewport({ vw: window.innerWidth, vh: window.innerHeight })
      update()
    }

    window.addEventListener('resize', onResize)
    // capture: true also catches scrolling inside nested scroll containers —
    // getBoundingClientRect stays in viewport coordinates in every case
    window.addEventListener('scroll', update, true)

    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`)
    let ro: ResizeObserver | null = null
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(update)
      ro.observe(el)
    }
    // Safety net: content elsewhere on the page can move the target without
    // firing any scroll/resize event (e.g. an async chart above it)
    const poll = window.setInterval(update, TRACK_POLL_MS)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', update, true)
      ro?.disconnect()
      window.clearInterval(poll)
    }
  }, [hasRect, step.targetId])

  // ── Listen for action on required-action steps ──
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

  // ── Measure the real bubble height before paint, so the position is exact ──
  // useLayoutEffect runs before the browser paints: the corrected position is
  // applied in the same frame, no visible jump.
  useLayoutEffect(() => {
    const h = bubbleRef.current?.offsetHeight
    if (h && Math.abs(h - bubbleH) > 1) setBubbleH(h)
  }, [step.id, rect, found, viewport, bubbleH])

  const { vw, vh } = viewport

  // 4-quadrant overlay rectangles (avoid the spotlight area)
  const r = rect ?? { x: vw / 2 - 100, y: vh / 2 - 40, w: 200, h: 80 }
  const x1 = Math.max(0, r.x - pad)
  const y1 = Math.max(0, r.y - pad)
  const x2 = Math.min(vw, r.x + r.w + pad)
  const y2 = Math.min(vh, r.y + r.h + pad)

  const bubblePos = getBubblePos(
    { x: x1, y: y1, w: x2 - x1, h: y2 - y1 },
    bubbleH, vw, vh
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
        top: y1, left: 0, width: x1, height: Math.max(0, y2 - y1),
        background: OVERLAY_COLOR,
        pointerEvents: 'all',
      }} />
      {/* Right */}
      <div style={{
        position: 'fixed', zIndex: 600,
        top: y1, left: x2, right: 0, height: Math.max(0, y2 - y1),
        background: OVERLAY_COLOR,
        pointerEvents: 'all',
      }} />

      {/* ── Spotlight ring (decorative, pointer-events: none) ─────────────────── */}
      <div style={{
        position: 'fixed', zIndex: 601, pointerEvents: 'none',
        left: x1, top: y1,
        width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1),
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
          maxHeight: vh - 2 * EDGE_MARGIN,
          overflowY: 'auto',
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

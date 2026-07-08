import type { Candle } from '../../finance/types/finance'
import { mulberry32, sampleNormal } from '../../engine/markovEngine'

// ─── Interpolation d'une trajectoire de prix à partir de points d'ancrage ──────

type Anchor = [index: number, price: number]
type VolSegment = { from: number; to: number; vol: number }

function buildAnchorPath(anchors: Anchor[], length: number): number[] {
  const path: number[] = new Array(length)
  for (let i = 0; i < length; i++) {
    let a = anchors[0], b = anchors[anchors.length - 1]
    for (let k = 0; k < anchors.length - 1; k++) {
      if (i >= anchors[k][0] && i <= anchors[k + 1][0]) { a = anchors[k]; b = anchors[k + 1]; break }
    }
    const [ai, ap] = a, [bi, bp] = b
    const t = bi === ai ? 0 : (i - ai) / (bi - ai)
    path[i] = ap + (bp - ap) * t
  }
  return path
}

function volAt(segments: VolSegment[], i: number): number {
  for (const s of segments) if (i >= s.from && i < s.to) return s.vol
  return 0.02
}

interface BuildConfig {
  length: number
  anchors: Anchor[]
  volSegments: VolSegment[]
  startTime: number
  stepMs: number
  seed: number
  baseVolume: number
  overrides?: Record<number, Partial<Candle>>
}

function buildCandles(cfg: BuildConfig): Candle[] {
  const { length, anchors, volSegments, startTime, stepMs, seed, baseVolume, overrides } = cfg
  const path = buildAnchorPath(anchors, length)
  const rng = mulberry32(seed)
  const candles: Candle[] = []
  let prevClose = path[0]

  for (let i = 0; i < length; i++) {
    const target = path[i]
    const vol = volAt(volSegments, i)
    const open = i === 0
      ? target * (1 + sampleNormal(0, vol * 0.3, rng))
      : prevClose * (1 + sampleNormal(0, vol * 0.25, rng))
    const close = target * (1 + sampleNormal(0, vol * 0.65, rng))
    const wickUp = Math.abs(sampleNormal(0, vol * 0.55, rng)) * target
    const wickDown = Math.abs(sampleNormal(0, vol * 0.55, rng)) * target
    const high = Math.max(open, close) + wickUp
    const low = Math.max(0.5, Math.min(open, close) - wickDown)
    const move = Math.abs(close - open) / open
    const volume = Math.max(80, Math.round(baseVolume * (1 + move * 9) * (1 + sampleNormal(0, 0.25, rng))))

    candles.push({ time: startTime + i * stepMs, open, high, low, close, volume })
    prevClose = close
  }

  if (overrides) {
    for (const [idxStr, patch] of Object.entries(overrides)) {
      const idx = Number(idxStr)
      if (candles[idx]) candles[idx] = { ...candles[idx], ...patch }
    }
  }

  return candles
}

// ─── Niveaux clés (exposés pour les leçons — support, résistance, fakeout) ──────

export const MAIN_SUPPORT_RESISTANCE_LEVEL = 74

const DAY_MS = 24 * 60 * 60 * 1000
const MAIN_START_TIME = Date.UTC(2024, 0, 2)

// ─── Série principale — ~180 séances, raconte une histoire complète ───────────
// Phase A (0-24)   : tendance haussière nette, sommets/creux croissants
// (24-50)          : zone de test support/résistance ~74 (deux creux, deux sommets)
// (50-64)           : rallye 1 — net, peu de bruit -> RSI fort
// (64-70)           : repli
// (70-86)           : rallye 2 — en dents de scie, plus haut que le rallye 1
//                      mais plus "essoufflé" -> divergence baissière RSI
// (86-104)          : sommet puis repli jusqu'au retest du support ~74
// (104-108)         : cassure du support avec volume fort -> devient résistance
// (108-112)         : fakeout (mèche sous le niveau, clôture au-dessus)
// (112-122)         : tentative de retour, rejet sur l'ancien support
// (122-148)         : range / squeeze de Bollinger (faible volatilité)
// (148-156)         : expansion — cassure haussière franche
// (156-179)         : tendance forte, RSI > 70 prolongé

const MAIN_ANCHORS: Anchor[] = [
  [0, 55], [6, 60], [12, 66], [18, 72], [24, 80],
  [28, 71], [30, 70], [34, 78], [38, 84], [42, 76], [46, 73],
  [50, 85], [56, 95], [60, 101], [64, 106],
  [68, 98], [70, 96], [74, 104], [76, 99], [80, 107], [82, 103], [86, 113],
  [90, 101], [94, 90], [98, 78], [102, 73],
  [104, 65], [108, 60], [112, 68], [116, 73], [118, 76], [122, 66],
  [128, 61], [134, 60], [140, 62], [144, 61],
  [148, 75], [152, 88], [158, 100], [164, 108], [170, 116], [176, 121], [179, 123],
]

const MAIN_VOL_SEGMENTS: VolSegment[] = [
  { from: 0, to: 24, vol: 0.013 },
  { from: 24, to: 50, vol: 0.022 },
  { from: 50, to: 64, vol: 0.011 },
  { from: 64, to: 70, vol: 0.018 },
  { from: 70, to: 86, vol: 0.027 },
  { from: 86, to: 104, vol: 0.020 },
  { from: 104, to: 108, vol: 0.032 },
  { from: 108, to: 112, vol: 0.036 },
  { from: 112, to: 122, vol: 0.022 },
  { from: 122, to: 128, vol: 0.018 },
  { from: 128, to: 148, vol: 0.008 },
  { from: 148, to: 156, vol: 0.033 },
  { from: 156, to: 180, vol: 0.018 },
]

export const MAIN_BREAKDOWN_INDEX = 105
export const MAIN_FAKEOUT_INDEX = 109
export const MAIN_REJECTION_INDEX = 118
export const MAIN_BREAKOUT_INDEX = 149

const MAIN_OVERRIDES: Record<number, Partial<Candle>> = {
  // Touches successives du support ~74 (creux croissants 70 -> 73)
  30: { open: 72.5, high: 73, low: 70, close: 72.2 },
  46: { open: 75, high: 75.5, low: 73, close: 74.6 },
  // Cassure du support avec forte bougie baissière + volume
  [MAIN_BREAKDOWN_INDEX]: { open: 77.5, high: 78, low: 64.5, close: 65, volume: 48000 },
  // Fakeout — mèche sous le niveau, clôture au-dessus
  [MAIN_FAKEOUT_INDEX]: { open: 64, high: 64.5, low: 55, close: 61, volume: 22000 },
  // Rejet sur l'ancien support devenu résistance
  [MAIN_REJECTION_INDEX]: { open: 74, high: 76.5, low: 73, close: 73.5 },
  // Cassure du squeeze — grande bougie haussière
  [MAIN_BREAKOUT_INDEX]: { open: 62.5, high: 77, low: 61.5, close: 76, volume: 41000 },
}

export const PATRIMCORP_MAIN: Candle[] = buildCandles({
  length: 180,
  anchors: MAIN_ANCHORS,
  volSegments: MAIN_VOL_SEGMENTS,
  startTime: MAIN_START_TIME,
  stepMs: DAY_MS,
  seed: 91827364,
  baseVolume: 14000,
  overrides: MAIN_OVERRIDES,
})

// ─── Série de l'exercice (Leçon 6) — 80 séances ────────────────────────────────
// Structure pédagogique en 3 phases :
//
// CONTEXTE (0-29) : 30 bougies statiques — 3 phases distinctes
//   (0-13)  : Range latéral 71-75 — support ~71 et résistance ~74-75 testés 3× chacun
//   (14-18) : Rallye rapide 74 → 92 — cassure haussière nette
//   (19-29) : Pullback soutenu 92 → 72 — retrace tout le rallye, RSI chute sous 38
//             → garantit que rsi_drop se déclenche dès le début de la phase guidée
//
// SEMI-GUIDÉ (30-54) : 25 bougies interactives
//   (28-41) : Squeeze de Bollinger — vol 0.007, bandes se resserrent nettement
//   (41-46) : Cassure haussière franche du squeeze → 1er sommet ~93
//              (rallye propre : RSI monte à ~70-75)
//   (47-49) : Repli modéré 93 → 87
//   (50-54) : 2e rallye chaotique → 2e sommet ~95 (prix plus haut, RSI plus bas)
//              → divergence baissière RSI détectable par findBearishDivergence()
//
// AUTONOME (55-79) : 25 bougies interactives sans aide
//   (55-61) : Correction après la divergence 95 → 83
//   (62-65) : Rebond faible — retest de la résistance ~84-86 (ancien support)
//   (66-73) : Rejet de la résistance → descente vers le support majeur ~71-73
//   (74-79) : Test du support majeur + rebond timide vers ~77

const EXERCISE_ANCHORS: Anchor[] = [
  // ── Contexte : range latéral (0-13) ─────────────────────────────────────────
  [0, 71], [2, 74], [5, 71], [7, 74.5], [9, 71.5], [11, 74], [13, 71.5], [14, 74],
  // ── Contexte : rallye rapide (14-18) ────────────────────────────────────────
  [15, 79], [16, 85], [17, 88], [18, 92],
  // ── Contexte : pullback soutenu (18-29) — RSI vers 20-30 à l'index 29 ──────
  [19, 89], [21, 84], [23, 78], [25, 74], [27, 72], [28, 71.5], [29, 72],
  // ── Guidé : squeeze de Bollinger (30-41) ────────────────────────────────────
  [30, 72.5], [32, 74], [35, 76], [38, 78], [40, 78.5], [41, 79],
  // ── Guidé : 1er rallye propre → sommet ~93 (42-46) ──────────────────────────
  [42, 82], [44, 88], [46, 93],
  // ── Guidé : repli modéré (47-49) ────────────────────────────────────────────
  [47, 91], [48, 88.5], [49, 87],
  // ── Guidé : 2e rallye chaotique → sommet ~95 (50-54) ─────────────────────────
  [50, 90.5], [51, 87.5], [52, 91.5], [53, 88.5], [54, 95],
  // ── Autonome : correction après divergence (55-61) ──────────────────────────
  [55, 92], [57, 87], [59, 83.5], [61, 83],
  // ── Autonome : rebond/retest de résistance ~84-86 (62-65) ───────────────────
  [62, 85], [63, 85.5], [65, 84],
  // ── Autonome : rejet → descente vers support ~71-73 (66-73) ─────────────────
  [66, 81], [68, 77], [70, 73.5], [72, 71.5], [73, 71],
  // ── Autonome : test du support + rebond (74-79) ──────────────────────────────
  [74, 72.5], [75, 74], [77, 75.5], [79, 77],
]

const EXERCISE_VOL_SEGMENTS: VolSegment[] = [
  { from: 0, to: 14, vol: 0.011 },   // range latéral — bruit minimal
  { from: 14, to: 18, vol: 0.018 },  // rallye
  { from: 18, to: 28, vol: 0.022 },  // pullback
  { from: 28, to: 42, vol: 0.007 },  // SQUEEZE — bandes de Bollinger très resserrées
  { from: 42, to: 50, vol: 0.018 },  // 1er rallye propre
  { from: 50, to: 55, vol: 0.022 },  // 2e rallye chaotique
  { from: 55, to: 62, vol: 0.021 },  // correction
  { from: 62, to: 68, vol: 0.016 },  // retest résistance
  { from: 68, to: 74, vol: 0.023 },  // descente vers support
  { from: 74, to: 80, vol: 0.017 },  // zone de support
]

// Index dans PATRIMCORP_EXERCISE d'une bougie représentative du support ~71-72
// (creux du pullback en contexte — low ≈ 70.5) — utilisé dans analyzeOrder()
export const EXERCISE_SUPPORT_INDEX = 28
export const EXERCISE_CONTEXT_LENGTH = 30

const EXERCISE_OVERRIDES: Record<number, Partial<Candle>> = {
  // Sommet du rallye contexte — mèche haute visible
  18: { open: 88, high: 93.5, low: 87, close: 91.5, volume: 32000 },
  // Bougie de support dans la phase contexte — hammer clair
  28: { open: 72, high: 73.5, low: 70.5, close: 72.5 },
  // Cassure du squeeze — grande bougie haussière + volume fort
  41: { open: 79, high: 83, low: 78.5, close: 82.5, volume: 34000 },
  // 1er sommet — mèche haute (risque d'essoufflement)
  46: { open: 90.5, high: 94.5, low: 89.5, close: 92.5 },
  // 2e sommet — prix plus haut, bougie avec mèche (divergence RSI visible)
  54: { open: 92, high: 96, low: 91, close: 94.5, volume: 27000 },
  // 1er bougie de retournement autonome — grande bougie baissière + volume
  55: { open: 94, high: 94.5, low: 90.5, close: 91.5, volume: 35000 },
  // Test du support majeur en autonome — mèche basse (rebond possible)
  73: { open: 71.5, high: 73, low: 69.5, close: 72 },
}

const EXERCISE_START_TIME = Date.UTC(2026, 3, 1)

export const PATRIMCORP_EXERCISE: Candle[] = buildCandles({
  length: 80,
  anchors: EXERCISE_ANCHORS,
  volSegments: EXERCISE_VOL_SEGMENTS,
  startTime: EXERCISE_START_TIME,
  stepMs: DAY_MS,
  seed: 55512345,
  baseVolume: 11000,
  overrides: EXERCISE_OVERRIDES,
})

// ─── Agrégation pour les timeframes (1J / 1S / 1M) ─────────────────────────────

export function aggregateCandles(candles: Candle[], groupSize: number): Candle[] {
  if (groupSize <= 1) return candles
  const result: Candle[] = []
  for (let i = 0; i < candles.length; i += groupSize) {
    const group = candles.slice(i, i + groupSize)
    if (group.length === 0) continue
    result.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((s, c) => s + (c.volume ?? 0), 0),
    })
  }
  return result
}

import { useState } from 'react'
import { EDUCATION_MODULES, type EducationModule, type LessonFormat } from '../data/modules'
import { useEducationStore } from '../store/useEducationStore'
import LessonT1PFU from './lessons/LessonT1PFU'
import LessonT2TaxLoss from './lessons/LessonT2TaxLoss'
import LessonT3Succession from './lessons/LessonT3Succession'
import LessonT4TaxOptim from './lessons/LessonT4TaxOptim'
import Lesson1Inflation from './lessons/Lesson1Inflation'
import Lesson2Compound from './lessons/Lesson2Compound'
import Lesson3RiskReturn from './lessons/Lesson3RiskReturn'
import Lesson4Profile from './lessons/Lesson4Profile'
import LessonA1AssetClasses from './lessons/LessonA1AssetClasses'
import LessonA2Diversification from './lessons/LessonA2Diversification'
import LessonA3AgeAllocation from './lessons/LessonA3AgeAllocation'
import LessonA4Rebalancing from './lessons/LessonA4Rebalancing'
import LessonE1PEA from './lessons/LessonE1PEA'
import LessonE2AV from './lessons/LessonE2AV'
import LessonE3PER from './lessons/LessonE3PER'
import LessonE4CTO from './lessons/LessonE4CTO'
import LessonS1ETF from './lessons/LessonS1ETF'
import LessonS2Bonds from './lessons/LessonS2Bonds'
import LessonS3SCPI from './lessons/LessonS3SCPI'
import LessonS4Crypto from './lessons/LessonS4Crypto'
import LessonM1Candles from './lessons/LessonM1Candles'
import LessonM2TrendsSR from './lessons/LessonM2TrendsSR'
import LessonM3RSI from './lessons/LessonM3RSI'
import LessonM4MACD from './lessons/LessonM4MACD'
import LessonM5BollingerATR from './lessons/LessonM5BollingerATR'
import LessonM6LiveStrategy from './lessons/LessonM6LiveStrategy'
import LessonP1DCA from './lessons/LessonP1DCA'
import LessonP2Drawdown from './lessons/LessonP2Drawdown'
import LessonP3TWR from './lessons/LessonP3TWR'
import LessonP4Biases from './lessons/LessonP4Biases'
import LessonP5Synthesis from './lessons/LessonP5Synthesis'

// ── Icons ─────────────────────────────────────────────────────────────────────

const Svg = ({ d, s = 16, sw = 1.5 }: { d: string; s?: number; sw?: number }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const IconLock     = () => <Svg d="M5 7V5a3 3 0 0 1 6 0v2M4 7h8a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm4 2.5v2" />
const IconCheck    = () => <Svg d="M3 8l3.5 3.5L13 4.5" />
const IconBack     = () => <Svg d="M10 13 5 8l5-5" />
const IconClock    = () => <Svg d="M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm0 2.5v3l2 2" />
const IconBook     = () => <Svg d="M3 3h8a1 1 0 0 1 1 1v9l-4-2-4 2V4a1 1 0 0 1 1-1z" />
const IconRefresh  = () => <Svg d="M3 8a5 5 0 1 1 1.4 3.5M3 12V8h4" />
const IconPlay     = () => <Svg d="M5 4l7 4-7 4V4z" />

// ── Format badge ──────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<LessonFormat, string> = {
  qcm: 'QCM',
  interactive: 'Interactif',
  mix: 'Mix',
}

function FormatBadge({ format }: { format: LessonFormat }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
      background: 'var(--surface-3)', color: 'var(--ink-subtle)', letterSpacing: '0.02em',
    }}>
      {FORMAT_LABELS[format]}
    </span>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{
      height: 3, background: 'var(--hairline-strong)', borderRadius: 4, overflow: 'hidden', marginTop: 12,
    }}>
      <div style={{
        height: '100%', width: `${Math.round(value * 100)}%`,
        background: color, borderRadius: 4, transition: 'width 0.4s var(--ease)',
      }} />
    </div>
  )
}

// ── Lesson router ─────────────────────────────────────────────────────────────

function LessonRouter({
  lessonId,
  onComplete,
  onBack,
  onGoToFinance,
}: {
  lessonId: string
  onComplete: () => void
  onBack: () => void
  onGoToFinance?: () => void
}) {
  if (lessonId === 'f-l1') return <Lesson1Inflation onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'f-l2') return <Lesson2Compound onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'f-l3') return <Lesson3RiskReturn onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'f-l4') return <Lesson4Profile onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'a-l1') return <LessonA1AssetClasses onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'a-l2') return <LessonA2Diversification onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'a-l3') return <LessonA3AgeAllocation onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'a-l4') return <LessonA4Rebalancing onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'e-l1') return <LessonE1PEA onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'e-l2') return <LessonE2AV onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'e-l3') return <LessonE3PER onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'e-l4') return <LessonE4CTO onComplete={onComplete} onBack={onBack} />
  if (lessonId === 's-l1') return <LessonS1ETF onComplete={onComplete} onBack={onBack} />
  if (lessonId === 's-l2') return <LessonS2Bonds onComplete={onComplete} onBack={onBack} />
  if (lessonId === 's-l3') return <LessonS3SCPI onComplete={onComplete} onBack={onBack} />
  if (lessonId === 's-l4') return <LessonS4Crypto onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'm-l1') return <LessonM1Candles onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'm-l2') return <LessonM2TrendsSR onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'm-l3') return <LessonM3RSI onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'm-l4') return <LessonM4MACD onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'm-l5') return <LessonM5BollingerATR onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'm-l6') return <LessonM6LiveStrategy onComplete={onComplete} onBack={onBack} onGoToFinance={onGoToFinance} />
  if (lessonId === 'p-l1') return <LessonP1DCA onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'p-l2') return <LessonP2Drawdown onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'p-l3') return <LessonP3TWR onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'p-l4') return <LessonP4Biases onComplete={onComplete} onBack={onBack} />
  if (lessonId === 'p-l5') return <LessonP5Synthesis onComplete={onComplete} onBack={onBack} />
  if (lessonId === 't-l1') return <LessonT1PFU onComplete={onComplete} onBack={onBack} />
  if (lessonId === 't-l2') return <LessonT2TaxLoss onComplete={onComplete} onBack={onBack} />
  if (lessonId === 't-l3') return <LessonT3Succession onComplete={onComplete} onBack={onBack} />
  if (lessonId === 't-l4') return <LessonT4TaxOptim onComplete={onComplete} onBack={onBack} />
  return null
}

// ── Module card ───────────────────────────────────────────────────────────────

function ModuleCard({
  mod, progress, onClick,
}: {
  mod: EducationModule
  progress: { status: 'locked' | 'in_progress' | 'completed'; completedLessons: string[]; completedExercises: string[] }
  onClick: () => void
}) {
  const isLocked = progress.status === 'locked'
  const isDone = progress.status === 'completed'
  const totalItems = mod.lessons.length + mod.exercises.length
  const completedItems = progress.completedLessons.length + progress.completedExercises.length
  const progressRatio = totalItems > 0 ? completedItems / totalItems : 0

  return (
    <div
      className="panel"
      onClick={isLocked ? undefined : onClick}
      style={{
        cursor: isLocked ? 'default' : 'pointer',
        opacity: isLocked ? 0.5 : 1,
        transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.15s',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 0, padding: 0,
      }}
      onMouseEnter={e => {
        if (!isLocked) {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-pop)'
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = ''
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = ''
      }}
    >
      <div style={{ height: 3, background: isDone ? 'var(--success)' : mod.color, borderRadius: '8px 8px 0 0' }} />

      <div style={{ padding: '16px 18px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: isDone ? 'var(--success)' : isLocked ? 'var(--surface-3)' : mod.color + '22',
            color: isDone ? '#fff' : isLocked ? 'var(--ink-muted)' : mod.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {isDone ? <IconCheck /> : isLocked ? <IconLock /> : mod.order}
          </div>

          <div className="col grow" style={{ gap: 2, minWidth: 0 }}>
            <div className="subhead" style={{ fontSize: 14, lineHeight: 1.3 }}>{mod.title}</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <FormatBadge format={mod.format} />
              <span className="caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconClock />
                {mod.estimatedMinutes} min
              </span>
            </div>
          </div>
        </div>

        <p className="caption" style={{ margin: 0, lineHeight: 1.5, flex: 1 }}>{mod.description}</p>

        <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
          {mod.topics.map(t => (
            <span key={t} style={{
              fontSize: 11, padding: '2px 6px', borderRadius: 4,
              background: 'var(--surface-3)', color: 'var(--ink-subtle)',
            }}>
              {t}
            </span>
          ))}
        </div>

        <div className="row caption" style={{ gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <IconBook />
            {mod.lessons.length} leçon{mod.lessons.length > 1 ? 's' : ''}
          </span>
          {!isLocked && (
            <span style={{ color: isDone ? 'var(--success)' : 'var(--ink-subtle)' }}>
              {completedItems}/{totalItems} complété{completedItems > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {!isLocked && <ProgressBar value={progressRatio} color={isDone ? 'var(--success)' : mod.color} />}
      </div>
    </div>
  )
}

// ── Module view ───────────────────────────────────────────────────────────────

function ModuleView({
  mod, progress, onBack, onCompleteLesson, onCompleteExercise, onOpenLesson,
}: {
  mod: EducationModule
  progress: { status: 'locked' | 'in_progress' | 'completed'; completedLessons: string[]; completedExercises: string[] }
  onBack: () => void
  onCompleteLesson: (lessonId: string) => void
  onCompleteExercise: (exerciseId: string) => void
  onOpenLesson?: (lessonId: string) => void
}) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--ink-subtle)', fontSize: 13, padding: '4px 0', marginBottom: 20,
        }}
      >
        <IconBack />
        Retour au catalogue
      </button>

      <div style={{ marginBottom: 28 }}>
        <div className="row" style={{ gap: 10, marginBottom: 8, alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: mod.color + '22', color: mod.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
          }}>
            {mod.order}
          </div>
          <div>
            <h2 className="title" style={{ margin: 0, fontSize: 20 }}>{mod.title}</h2>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <FormatBadge format={mod.format} />
              <span className="caption" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <IconClock />
                {mod.estimatedMinutes} min estimées
              </span>
            </div>
          </div>
        </div>
        <p className="caption" style={{ margin: 0, lineHeight: 1.6 }}>{mod.description}</p>
      </div>

      {/* Lessons */}
      <div className="col" style={{ gap: 8, marginBottom: 20 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Leçons</div>
        {mod.lessons.map((lesson, i) => {
          const done = progress.completedLessons.includes(lesson.id)
          const canOpen = !!onOpenLesson
          return (
            <div
              key={lesson.id}
              className="panel"
              style={{
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                cursor: canOpen ? 'pointer' : 'default',
                transition: 'background 0.12s',
              }}
              onClick={canOpen ? () => onOpenLesson!(lesson.id) : undefined}
              onMouseEnter={e => {
                if (canOpen) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'
              }}
              onMouseLeave={e => {
                if (canOpen) (e.currentTarget as HTMLDivElement).style.background = ''
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: done ? 'var(--success)' : 'var(--surface-3)',
                color: done ? '#fff' : 'var(--ink-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {done ? <IconCheck /> : i + 1}
              </div>
              <span className="grow" style={{ fontSize: 14 }}>{lesson.title}</span>

              {done && (
                <>
                  <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>✓ Fait</span>
                  {canOpen && (
                    <button
                      className="btn"
                      style={{ fontSize: 11, padding: '3px 9px', height: 'auto', color: 'var(--ink-subtle)' }}
                      onClick={e => { e.stopPropagation(); onOpenLesson!(lesson.id) }}
                    >
                      Revoir
                    </button>
                  )}
                </>
              )}
              {!done && canOpen && (
                <button
                  className="btn"
                  style={{
                    fontSize: 12, padding: '4px 12px', height: 'auto',
                    background: 'var(--primary)', color: '#fff', border: 'none',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                  onClick={e => { e.stopPropagation(); onOpenLesson!(lesson.id) }}
                >
                  <IconPlay />
                  Commencer
                </button>
              )}
              {!done && !canOpen && (
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: '4px 10px', height: 'auto' }}
                  onClick={e => { e.stopPropagation(); onCompleteLesson(lesson.id) }}
                >
                  Marquer lu
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Exercises */}
      <div className="col" style={{ gap: 8 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Exercices</div>
        {mod.exercises.map((ex) => {
          const done = progress.completedExercises.includes(ex.id)
          const isFundamentalsEx = mod.id === 'fundamentals' && ex.id === 'f-e1'
          const isAllocationEx1 = mod.id === 'allocation' && ex.id === 'a-e1'
          const isAllocationEx2 = mod.id === 'allocation' && ex.id === 'a-e2'
          const isEnvelopesEx   = mod.id === 'envelopes'   && ex.id === 'e-e1'
          const isSelectionEx1  = mod.id === 'selection'   && ex.id === 's-e1'
          const isSelectionEx2  = mod.id === 'selection'   && ex.id === 's-e2'
          const isMarketsEx     = mod.id === 'markets'     && ex.id === 'm-e1'
          const isPortfolioEx   = mod.id === 'portfolio'   && ex.id === 'p-e1'
          const isTaxationEx    = mod.id === 'taxation'    && ex.id === 't-e1'
          const isAutoEx = isFundamentalsEx || isAllocationEx1 || isAllocationEx2 || isEnvelopesEx
            || isSelectionEx1 || isSelectionEx2 || isMarketsEx || isPortfolioEx || isTaxationEx
          return (
            <div
              key={ex.id}
              className="panel"
              style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                background: done ? 'var(--success)' : mod.color + '22',
                color: done ? '#fff' : mod.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11,
              }}>
                {done ? <IconCheck /> : '✎'}
              </div>
              <span className="grow" style={{ fontSize: 14 }}>{ex.title}</span>
              {done && (
                <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>✓ Validé</span>
              )}
              {!done && isFundamentalsEx && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 4
                </span>
              )}
              {!done && isAllocationEx1 && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 3
                </span>
              )}
              {!done && isAllocationEx2 && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 4
                </span>
              )}
              {!done && isEnvelopesEx && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 4
                </span>
              )}
              {!done && isSelectionEx1 && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 1
                </span>
              )}
              {!done && isSelectionEx2 && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 4
                </span>
              )}
              {!done && isMarketsEx && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 6
                </span>
              )}
              {!done && isPortfolioEx && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 5
                </span>
              )}
              {!done && isTaxationEx && (
                <span className="caption" style={{ fontSize: 11, fontStyle: 'italic' }}>
                  Validé en terminant la Leçon 4
                </span>
              )}
              {!done && !isAutoEx && (
                <>
                  <span className="caption" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Contenu à venir</span>
                  <button
                    className="btn"
                    style={{ fontSize: 12, padding: '4px 10px', height: 'auto' }}
                    onClick={() => onCompleteExercise(ex.id)}
                  >
                    Valider
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {progress.status === 'completed' && (
        <div style={{
          marginTop: 24, padding: '16px 20px', borderRadius: 'var(--r-lg)',
          background: 'var(--success)22', border: '1px solid var(--success)44',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <IconCheck />
          <div>
            <div className="subhead" style={{ color: 'var(--success)', fontSize: 14 }}>Module complété</div>
            <div className="caption" style={{ marginTop: 2 }}>Le module suivant est maintenant déverrouillé.</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip({
  progressMap,
}: {
  progressMap: Record<string, { status: string; completedLessons: string[]; completedExercises: string[] }>
}) {
  const completed = EDUCATION_MODULES.filter(m => progressMap[m.id]?.status === 'completed').length
  const inProgress = EDUCATION_MODULES.filter(m => progressMap[m.id]?.status === 'in_progress').length
  const totalLessons = EDUCATION_MODULES.reduce((s, m) => s + m.lessons.length, 0)
  const doneLessons = EDUCATION_MODULES.reduce((s, m) => s + (progressMap[m.id]?.completedLessons.length ?? 0), 0)

  return (
    <div className="row" style={{ gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
      {[
        { label: 'Modules complétés', value: `${completed} / ${EDUCATION_MODULES.length}` },
        { label: 'En cours', value: String(inProgress) },
        { label: 'Leçons lues', value: `${doneLessons} / ${totalLessons}` },
      ].map(kpi => (
        <div key={kpi.label} className="panel" style={{ padding: '12px 18px', flex: '1 1 140px', minWidth: 0 }}>
          <div className="kpi" style={{ fontSize: 22, marginBottom: 2 }}>{kpi.value}</div>
          <div className="caption">{kpi.label}</div>
        </div>
      ))}
    </div>
  )
}

// ── Completion screen ─────────────────────────────────────────────────────────

function CompletionScreen({ onViewModules }: { onViewModules: () => void }) {
  return (
    <div className="col" style={{ gap: 24, maxWidth: 680, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '24px 0 0' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎓</div>
        <h1 className="title" style={{ fontSize: 26, marginBottom: 8 }}>Parcours complété !</h1>
        <p className="caption" style={{ fontSize: 14, maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
          Tu as terminé les 7 modules du programme d'éducation financière. Voici les grands principes
          à garder en tête pour la suite.
        </p>
      </div>

      <div className="panel" style={{ padding: '20px 24px' }}>
        <div className="eyebrow" style={{ marginBottom: 14 }}>Les grands principes retenus</div>
        <div className="col" style={{ gap: 12 }}>
          {[
            {
              icon: '⏳',
              text: 'Commencer tôt, investir régulièrement, laisser les intérêts composés travailler — le temps est ton meilleur allié.',
            },
            {
              icon: '📊',
              text: 'Diversifier via des ETF à faibles frais — le marché bat la plupart des gérants actifs sur le long terme, sans effort.',
            },
            {
              icon: '🏛️',
              text: 'Optimiser les enveloppes fiscales (PEA, assurance-vie, PER) avant de choisir les actifs — la fiscalité amplifie les rendements nets.',
            },
            {
              icon: '🛡️',
              text: 'Maintenir une épargne de précaution de 3 à 6 mois de dépenses — avant d\'investir le moindre euro en marchés.',
            },
            {
              icon: '🧘',
              text: 'Ignorer le bruit médiatique, tenir sa stratégie, réviser son allocation une fois par an — la discipline prime sur le timing.',
            },
            {
              icon: '💪',
              text: 'Continuer d\'investir pendant les crises — les baisses sont des opportunités d\'achat, pas des raisons de vendre.',
            },
          ].map((item, i) => (
            <div key={i} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: '14px 18px', borderRadius: 'var(--r-lg)',
        background: 'rgba(76,183,130,0.07)', border: '1px solid rgba(76,183,130,0.2)',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
          Tous les modules restent consultables à tout moment. Reviens quand tu veux revoir un concept,
          explorer un simulateur ou refaire un exercice.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onViewModules}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 24px',
            borderRadius: 8, border: '1px solid var(--hairline)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', background: 'var(--surface-2)', color: 'var(--ink)',
          }}
        >
          Voir tous les modules
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EducationPage({ onGoToFinance }: { onGoToFinance?: () => void } = {}) {
  const { moduleProgress, completeLesson, completeExercise, resetProgress } = useEducationStore()
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showCompletionScreen, setShowCompletionScreen] = useState(true)

  const selectedModule = selectedModuleId
    ? EDUCATION_MODULES.find(m => m.id === selectedModuleId) ?? null
    : null

  const allModulesCompleted = EDUCATION_MODULES.every(m => moduleProgress[m.id]?.status === 'completed')

  function handleLessonComplete(lessonId: string) {
    completeLesson('fundamentals', lessonId)
    if (lessonId === 'f-l4') {
      completeExercise('fundamentals', 'f-e1')
    }
    setSelectedLessonId(null)
  }

  function handleAllocationLessonComplete(lessonId: string) {
    completeLesson('allocation', lessonId)
    if (lessonId === 'a-l3') completeExercise('allocation', 'a-e1')
    if (lessonId === 'a-l4') completeExercise('allocation', 'a-e2')
    setSelectedLessonId(null)
  }

  function handleEnvelopesLessonComplete(lessonId: string) {
    completeLesson('envelopes', lessonId)
    if (lessonId === 'e-l4') completeExercise('envelopes', 'e-e1')
    setSelectedLessonId(null)
  }

  function handleSelectionLessonComplete(lessonId: string) {
    completeLesson('selection', lessonId)
    if (lessonId === 's-l1') completeExercise('selection', 's-e1')
    if (lessonId === 's-l4') completeExercise('selection', 's-e2')
    setSelectedLessonId(null)
  }

  function handleMarketsLessonComplete(lessonId: string) {
    completeLesson('markets', lessonId)
    if (lessonId === 'm-l6') completeExercise('markets', 'm-e1')
    setSelectedLessonId(null)
  }

  function handlePortfolioLessonComplete(lessonId: string) {
    completeLesson('portfolio', lessonId)
    if (lessonId === 'p-l5') completeExercise('portfolio', 'p-e1')
    setSelectedLessonId(null)
  }

  function handleTaxationLessonComplete(lessonId: string) {
    completeLesson('taxation', lessonId)
    if (lessonId === 't-l4') completeExercise('taxation', 't-e1')
    setSelectedLessonId(null)
  }

  // Show lesson content (fundamentals)
  if (selectedModuleId === 'fundamentals' && selectedLessonId) {
    return (
      <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
        <LessonRouter
          lessonId={selectedLessonId}
          onComplete={() => handleLessonComplete(selectedLessonId)}
          onBack={() => setSelectedLessonId(null)}
        />
      </div>
    )
  }

  // Show lesson content (allocation)
  if (selectedModuleId === 'allocation' && selectedLessonId) {
    return (
      <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
        <LessonRouter
          lessonId={selectedLessonId}
          onComplete={() => handleAllocationLessonComplete(selectedLessonId)}
          onBack={() => setSelectedLessonId(null)}
        />
      </div>
    )
  }

  // Show lesson content (envelopes)
  if (selectedModuleId === 'envelopes' && selectedLessonId) {
    return (
      <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
        <LessonRouter
          lessonId={selectedLessonId}
          onComplete={() => handleEnvelopesLessonComplete(selectedLessonId)}
          onBack={() => setSelectedLessonId(null)}
        />
      </div>
    )
  }

  // Show lesson content (selection)
  if (selectedModuleId === 'selection' && selectedLessonId) {
    return (
      <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
        <LessonRouter
          lessonId={selectedLessonId}
          onComplete={() => handleSelectionLessonComplete(selectedLessonId)}
          onBack={() => setSelectedLessonId(null)}
        />
      </div>
    )
  }

  // Show lesson content (markets)
  if (selectedModuleId === 'markets' && selectedLessonId) {
    return (
      <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
        <LessonRouter
          lessonId={selectedLessonId}
          onComplete={() => handleMarketsLessonComplete(selectedLessonId)}
          onBack={() => setSelectedLessonId(null)}
          onGoToFinance={onGoToFinance}
        />
      </div>
    )
  }

  // Show lesson content (portfolio)
  if (selectedModuleId === 'portfolio' && selectedLessonId) {
    return (
      <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
        <LessonRouter
          lessonId={selectedLessonId}
          onComplete={() => handlePortfolioLessonComplete(selectedLessonId)}
          onBack={() => setSelectedLessonId(null)}
        />
      </div>
    )
  }

  // Show lesson content (taxation)
  if (selectedModuleId === 'taxation' && selectedLessonId) {
    return (
      <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
        <LessonRouter
          lessonId={selectedLessonId}
          onComplete={() => handleTaxationLessonComplete(selectedLessonId)}
          onBack={() => setSelectedLessonId(null)}
        />
      </div>
    )
  }

  return (
    <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px', position: 'relative' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }} data-tour-id="education-page-header">
        <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
          <div className="col grow" style={{ gap: 4 }}>
            <h1 className="title" style={{ fontSize: 22, marginBottom: 0 }}>Éducation financière</h1>
            <p className="caption" style={{ margin: 0 }}>
              7 modules progressifs pour maîtriser la gestion de patrimoine
            </p>
          </div>
          {!selectedModule && (
            <button
              className="btn"
              style={{
                fontSize: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 5,
                color: 'var(--ink-subtle)', background: 'var(--surface-2)', border: '1px solid var(--hairline)',
              }}
              onClick={() => setShowResetConfirm(true)}
              title="Réinitialiser la progression"
            >
              <IconRefresh />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Reset confirmation */}
      {showResetConfirm && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 'var(--r-lg)',
          background: 'var(--danger)11', border: '1px solid var(--danger)44',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="caption" style={{ flex: 1 }}>
            Réinitialiser toute la progression ? Cette action est irréversible.
          </span>
          <button
            className="btn"
            style={{ fontSize: 12, padding: '4px 12px', background: 'var(--danger)', color: '#fff', border: 'none' }}
            onClick={() => {
              resetProgress()
              setShowResetConfirm(false)
              setSelectedModuleId(null)
              setSelectedLessonId(null)
              setShowCompletionScreen(true)
            }}
          >
            Confirmer
          </button>
          <button
            className="btn"
            style={{ fontSize: 12, padding: '4px 12px' }}
            onClick={() => setShowResetConfirm(false)}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Catalogue view */}
      {!selectedModule && allModulesCompleted && showCompletionScreen && (
        <>
          <div data-tour-id="education-stats-strip">
            <StatsStrip progressMap={moduleProgress} />
          </div>
          <CompletionScreen onViewModules={() => setShowCompletionScreen(false)} />
        </>
      )}

      {!selectedModule && (!allModulesCompleted || !showCompletionScreen) && (
        <>
          <div data-tour-id="education-stats-strip">
            <StatsStrip progressMap={moduleProgress} />
          </div>
          <div data-tour-id="education-modules-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {EDUCATION_MODULES.map(mod => (
              <ModuleCard
                key={mod.id}
                mod={mod}
                progress={moduleProgress[mod.id] ?? { status: 'locked', completedLessons: [], completedExercises: [] }}
                onClick={() => setSelectedModuleId(mod.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Module detail view */}
      {selectedModule && (
        <ModuleView
          mod={selectedModule}
          progress={moduleProgress[selectedModule.id] ?? { status: 'locked', completedLessons: [], completedExercises: [] }}
          onBack={() => { setSelectedModuleId(null); setSelectedLessonId(null) }}
          onCompleteLesson={lessonId => completeLesson(selectedModule.id, lessonId)}
          onCompleteExercise={exerciseId => completeExercise(selectedModule.id, exerciseId)}
          onOpenLesson={
            (['fundamentals', 'allocation', 'envelopes', 'selection', 'markets', 'portfolio', 'taxation'].includes(selectedModule.id))
              ? lessonId => setSelectedLessonId(lessonId)
              : undefined
          }
        />
      )}
    </div>
  )
}

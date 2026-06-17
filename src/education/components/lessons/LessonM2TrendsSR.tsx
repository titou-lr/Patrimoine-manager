import { useMemo, useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'
import { EduCandleChart } from './markets/EduCandleChart'
import {
  PATRIMCORP_MAIN, MAIN_SUPPORT_RESISTANCE_LEVEL,
  MAIN_BREAKDOWN_INDEX, MAIN_FAKEOUT_INDEX, MAIN_REJECTION_INDEX,
} from '../../data/patrimcorpData'
import { findLevelTouches } from '../../data/marketAnnotations'

const QUESTIONS: QuizQuestion[] = [
  {
    text: 'Une tendance haussière se définit strictement par :',
    options: [
      'Un prix qui monte depuis plus de 3 mois',
      'Des sommets de plus en plus hauts uniquement',
      'Des sommets ET des creux de plus en plus hauts',
      'Un RSI supérieur à 50 en permanence',
    ],
    correct: 2,
    explanation:
      "Les deux conditions sont nécessaires : si seuls les sommets montent mais que les creux s'effondrent, la structure se dégrade — ce n'est plus une tendance haussière propre.",
  },
  {
    text: 'PatrimCorp avait un support solide à 80 € qui vient d\'être cassé à la baisse avec un fort volume. Que devient ce niveau ?',
    options: [
      'Il reste un support — le prix va rebondir dessus',
      'Il devient une résistance — les anciens acheteurs voudront vendre à ce niveau pour limiter leurs pertes',
      "Il n'a plus aucune signification",
      'Il devient un objectif de cours haussier',
    ],
    correct: 1,
    explanation:
      "Retournement de polarité : ceux qui ont acheté à 80 € et vu le prix chuter attendent ce niveau pour 'sortir sans perte'. Cette pression vendeuse concentrée transforme l'ancien support en résistance.",
  },
  {
    text: 'PatrimCorp casse brièvement sous son support à 75 € pendant quelques heures avant de remonter et clôturer la journée à 77 €. Comment interpréter ça ?',
    options: [
      'Le support est définitivement cassé — signal de vente clair',
      'Signal neutre — attendre confirmation sur plusieurs jours',
      'Probable fakeout — la clôture au-dessus du niveau invalide la cassure, les stops des traders ont été déclenchés inutilement',
      'Signal d\'achat fort car le prix a rebondi',
    ],
    correct: 2,
    explanation:
      "Règle pratique : attendre la clôture de la bougie au-dessus ou sous le niveau avant de considérer une cassure comme valide. Ici, la clôture à 77 € invalide la cassure intrajournalière.",
  },
]

export default function LessonM2TrendsSR({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [guess, setGuess] = useState<{ price: number; y: number } | null>(null)

  const slice = useMemo(() => PATRIMCORP_MAIN.slice(0, MAIN_REJECTION_INDEX + 6), [])

  const touches = useMemo(
    () => findLevelTouches(slice, MAIN_SUPPORT_RESISTANCE_LEVEL, 3),
    [slice]
  )

  const markers = useMemo(() => [
    ...touches.map(i => ({ index: i, position: 'belowBar' as const, color: 'var(--success)', shape: 'arrowUp' as const, text: 'support' })),
    { index: MAIN_BREAKDOWN_INDEX, position: 'aboveBar' as const, color: 'var(--danger)', shape: 'arrowDown' as const, text: 'cassure' },
    { index: MAIN_FAKEOUT_INDEX, position: 'belowBar' as const, color: 'var(--primary)', shape: 'circle' as const, text: 'fakeout' },
    { index: MAIN_REJECTION_INDEX, position: 'aboveBar' as const, color: 'var(--danger)', shape: 'arrowDown' as const, text: 'rejet' },
  ], [touches])

  // ── Exercice clic — placer une ligne de support/résistance ───────────────────
  const exerciseSlice = useMemo(() => PATRIMCORP_MAIN.slice(60, 124), [])
  const exMin = Math.min(...exerciseSlice.map(c => c.low))
  const exMax = Math.max(...exerciseSlice.map(c => c.high))
  const SVG_H = 220
  const priceFromY = (y: number) => exMax - (y / SVG_H) * (exMax - exMin)

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = ((e.clientY - rect.top) / rect.height) * SVG_H
    setGuess({ price: priceFromY(y), y })
  }

  const relevantLevels = [
    { price: MAIN_SUPPORT_RESISTANCE_LEVEL, label: 'support/résistance ~74 €' },
    { price: 76, label: 'zone de rejet ~76 €' },
  ]
  const nearest = guess
    ? relevantLevels.reduce((best, lvl) =>
        Math.abs(lvl.price - guess.price) < Math.abs(best.price - guess.price) ? lvl : best, relevantLevels[0])
    : null
  const distance = guess && nearest ? Math.abs(nearest.price - guess.price) : null
  const isGood = distance != null && distance <= 2.5

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Tendances et supports/résistances</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Les marchés ne bougent pas aléatoirement. Ils suivent des tendances, et ces tendances
            ont une mémoire. Certains niveaux de prix agissent comme des aimants — le marché y
            revient, y rebondit, ou y bloque. Comprendre <em>pourquoi</em> est aussi important que
            de savoir les identifier.
          </p>
        </div>

        {/* Tendances */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Les tendances</div>
          <div className="col" style={{ gap: 10 }}>
            {[
              ['Tendance haussière', 'Succession de sommets de plus en plus hauts ET de creux de plus en plus hauts. Les deux conditions sont nécessaires.', 'var(--success)'],
              ['Tendance baissière', 'Succession de sommets de plus en plus bas ET de creux de plus en plus bas.', 'var(--danger)'],
              ['Tendance latérale (range)', 'Prix oscillant entre deux niveaux horizontaux sans direction claire.', 'var(--ink-subtle)'],
            ].map(([name, desc, color]) => (
              <div key={name} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: `3px solid ${color}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3, color: color as string }}>{name}</div>
                <div className="caption" style={{ lineHeight: 1.55 }}>{desc}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            <strong>Sur plusieurs timeframes :</strong> une tendance haussière de long terme
            (journalier) peut contenir des corrections baissières de court terme (horaire). Un
            débutant qui ne regarde que le graphique horaire peut paniquer et vendre lors d'une
            correction qui n'est qu'un épisode normal dans une tendance haussière plus large.
          </p>
        </div>

        {/* Supports/résistances */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Supports et résistances</div>
          <div className="row" style={{ gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>Support</div>
              <div className="caption" style={{ lineHeight: 1.55 }}>Niveau de prix où les acheteurs reviennent historiquement — le prix a rebondi à ce niveau plusieurs fois dans le passé.</div>
            </div>
            <div style={{ flex: 1, minWidth: 220, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Résistance</div>
              <div className="caption" style={{ lineHeight: 1.55 }}>Niveau de prix où les vendeurs s'activent historiquement — le prix a bloqué ou rebroussé chemin à ce niveau plusieurs fois.</div>
            </div>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--primary)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--primary-hover)' }}>Pourquoi ça fonctionne — la psychologie</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
              À 50 €, des milliers d'investisseurs ont acheté PatrimCorp. Le prix est ensuite tombé
              à 40 € — ils sont en perte. Si le prix remonte à 50 €, ces investisseurs retrouvent
              leur point d'équilibre. Beaucoup vont vendre pour "sortir sans perte" ou "récupérer
              leur mise". Cette pression vendeuse concentrée et prévisible crée la résistance à
              50 €. Ce n'est pas de la magie — c'est de la psychologie de masse.
            </p>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--danger)', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--danger)' }}>Le retournement de polarité</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
              Quand un support est cassé à la baisse avec conviction, il devient une résistance.
              Pourquoi ? Ceux qui ont acheté à 50 € et ont vu le prix tomber à 35 € attendent
              maintenant que le prix remonte à 50 € pour vendre et "sortir sans perte". L'ancien
              niveau d'achat devient un niveau de vente.
            </p>
          </div>

          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--primary)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--primary-hover)' }}>Les faux cassages (fakeouts)</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
              Le prix casse brièvement sous un support à 49 €, déclenche les stops des traders,
              puis remonte immédiatement au-dessus de 50 €. C'est un fakeout — une cassure qui
              n'est pas confirmée. C'est l'un des pièges les plus fréquents pour les débutants.
              Règle pratique : attendre la clôture de la bougie au-dessus ou sous le niveau avant
              de considérer la cassure comme valide.
            </p>
          </div>
        </div>

        {/* Graphique annoté */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>PatrimCorp — phases et niveaux historiques</div>
          <EduCandleChart
            candles={slice}
            height={340}
            priceLines={[
              { price: MAIN_SUPPORT_RESISTANCE_LEVEL, color: 'var(--primary)', title: 'support → résistance ~74 €', dashed: true },
            ]}
            markers={markers}
          />
          <p className="caption" style={{ marginTop: 10, lineHeight: 1.6 }}>
            Repère les deux creux croissants qui testent le support (flèches vertes), la cassure
            avec fort volume (flèche rouge), le fakeout (cercle) et le rejet sur l'ancienne zone de
            support devenue résistance (seconde flèche rouge).
          </p>
        </div>

        {/* Exercice interactif */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>À toi de jouer — place ta ligne</div>
          <p className="caption" style={{ marginBottom: 10 }}>
            Clique dans le graphique ci-dessous à l'endroit où tu penses qu'un niveau de
            support/résistance pertinent se trouve.
          </p>
          <svg
            viewBox={`0 0 600 ${SVG_H}`}
            width="100%"
            height={SVG_H}
            onClick={handleSvgClick}
            style={{ cursor: 'crosshair', background: 'var(--surface-3)', borderRadius: 8 }}
            preserveAspectRatio="none"
          >
            <polyline
              points={exerciseSlice.map((c, i) => {
                const x = (i / (exerciseSlice.length - 1)) * 600
                const y = SVG_H - ((c.close - exMin) / (exMax - exMin)) * SVG_H
                return `${x},${y}`
              }).join(' ')}
              fill="none" stroke="#5e6ad2" strokeWidth="2"
            />
            {guess && (
              <line x1={0} y1={guess.y} x2={600} y2={guess.y} stroke={isGood ? 'var(--success)' : 'var(--danger)'} strokeWidth="2" strokeDasharray="6 4" />
            )}
          </svg>
          {guess && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.6,
              background: 'var(--surface-3)', borderLeft: `3px solid ${isGood ? 'var(--success)' : 'var(--danger)'}`,
              color: isGood ? 'var(--success)' : 'var(--danger)',
            }}>
              {isGood
                ? `Bien vu — ta ligne à ${guess.price.toFixed(1)} € est proche d'un niveau pertinent (${nearest!.label}).`
                : `Pas tout à fait — ta ligne à ${guess.price.toFixed(1)} € est loin des niveaux qui ont réellement compté ici (le plus proche : ${nearest!.label}). Réessaie en cherchant où le prix a rebondi ou bloqué plusieurs fois.`}
            </div>
          )}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={() => setScreen('quiz')}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
              borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: 'var(--primary)', color: '#fff',
            }}
          >
            Passer au QCM →
          </button>
        </div>
      </LessonShell>
    )
  }

  if (screen === 'quiz') {
    return (
      <LessonShell step={2} totalSteps={3} onBack={() => setScreen('content')} backLabel="← Retour au contenu">
        <div>
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Tendances et supports/résistances</h2>
          <p className="caption">3 questions · 3/3 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📐</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 2 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Tu sais maintenant reconnaître une tendance, repérer un support/résistance et te
          méfier des faux cassages. Place au premier indicateur : le RSI.
        </p>
        <button
          onClick={onComplete}
          style={{
            display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 24px',
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            background: 'var(--success)', color: '#fff', marginTop: 8,
          }}
        >
          Terminer la leçon
        </button>
      </div>
    </LessonShell>
  )
}

import { useMemo, useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'
import { EduCandleChart } from './markets/EduCandleChart'
import { EduIndicatorPanel, type EduActiveOverlays } from './markets/EduIndicatorPanel'
import { rsi } from '../../../finance/services/indicatorsService'
import { PATRIMCORP_MAIN } from '../../data/patrimcorpData'
import { findBearishDivergence } from '../../data/marketAnnotations'

const QUESTIONS: QuizQuestion[] = [
  {
    text: 'Le RSI de PatrimCorp passe sous 30. Que signifie cette zone ?',
    options: [
      'Le titre va obligatoirement rebondir maintenant',
      'Le titre est en zone de survente — les vendeurs ont fortement dominé, un rebond est possible mais pas garanti',
      'Le titre a perdu 30 % de sa valeur',
      'Il faut vendre immédiatement',
    ],
    correct: 1,
    explanation:
      "Survente signifie que les vendeurs ont dominé fortement sur 14 périodes — c'est un signal d'attention sur un possible essoufflement de la baisse, pas une garantie de rebond immédiat.",
  },
  {
    text: 'PatrimCorp fait un nouveau sommet à 120 €, mais le RSI à ce sommet est plus bas qu\'au sommet précédent à 100 €. Qu\'est-ce que cela indique ?',
    options: [
      'Signal haussier — le prix continue de monter',
      'Signal neutre — le RSI et le prix évoluent indépendamment',
      "Divergence baissière — la hausse perd de sa force, les acheteurs s'épuisent",
      'Signal d\'achat — le RSI va rattraper le prix',
    ],
    correct: 2,
    explanation:
      "Le prix monte mais avec moins de force qu'avant — les acheteurs s'épuisent. C'est l'utilisation la plus puissante du RSI : repérer l'essoufflement avant qu'il soit visible sur le prix seul.",
  },
  {
    text: 'Le RSI reste au-dessus de 70 pendant 3 semaines consécutives alors que le prix continue de monter. Comment interpréter ça ?',
    options: [
      'Signal de vente urgent — le surachat ne peut pas durer',
      'Les indicateurs sont défaillants',
      'En forte tendance haussière, le RSI peut rester en zone de surachat longtemps — c\'est un signal d\'attention, pas un ordre de vente',
      'Il faut réduire la période du RSI pour avoir un signal plus précis',
    ],
    correct: 2,
    explanation:
      "Surachat ne signifie pas 'va baisser maintenant'. En forte tendance, le RSI peut rester au-dessus de 70 pendant des semaines — c'est normal, pas une anomalie.",
  },
  {
    text: 'Quelle est la principale limite du RSI ?',
    options: [
      "Il ne fonctionne que sur les actions, pas les ETF",
      'Il calcule sur des données passées, génère des faux signaux en marché sans tendance, et ne doit jamais être utilisé seul',
      'Il est trop complexe pour être utilisé par des particuliers',
      'Il ne fonctionne que sur des timeframes journaliers',
    ],
    correct: 1,
    explanation:
      "Le RSI est un indicateur en retard, peu fiable en range, et doit toujours être confirmé par d'autres éléments — support/résistance, volume, ou un autre indicateur.",
  },
]

export default function LessonM3RSI({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [overlays, setOverlays] = useState<EduActiveOverlays>({ sma20: false, sma50: false, ema20: false, bollinger: false, volume: false })

  const slice = useMemo(() => PATRIMCORP_MAIN.slice(40, 100), [])
  const closes = useMemo(() => slice.map(c => c.close), [slice])
  const rsiVals = useMemo(() => rsi(closes, 14), [closes])
  const divergence = useMemo(() => findBearishDivergence(closes, rsiVals), [closes, rsiVals])

  const markers = divergence
    ? [
        { index: divergence.peak1, position: 'aboveBar' as const, color: 'var(--primary)', shape: 'circle' as const, text: `RSI ${rsiVals[divergence.peak1]?.toFixed(0)}` },
        { index: divergence.peak2, position: 'aboveBar' as const, color: 'var(--danger)', shape: 'circle' as const, text: `RSI ${rsiVals[divergence.peak2]?.toFixed(0)}` },
      ]
    : []

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>RSI : mesurer la force du mouvement</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Les prix bougent, mais à quelle vitesse ? Avec quelle force ? Un titre peut monter
            depuis 2 semaines — mais est-ce que cette hausse s'accélère ou s'essouffle ? Le RSI
            (Relative Strength Index) répond à cette question.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Le RSI expliqué pas à pas</div>
          <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            Sur les 14 dernières bougies, compte combien ont clôturé en hausse et combien en
            baisse. Calcule la hausse moyenne et la baisse moyenne. Si les hausses sont beaucoup
            plus fortes que les baisses, le RSI est élevé. Si les baisses dominent, il est bas.
            C'est le rapport de force entre acheteurs et vendeurs sur 14 périodes.
          </p>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150, padding: '10px 14px', borderRadius: 8, background: 'rgba(235,87,87,0.1)', borderLeft: '3px solid var(--danger)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>RSI &gt; 70</div>
              <div className="caption" style={{ marginTop: 2 }}>Surachat — pause ou correction possible</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>30 – 70</div>
              <div className="caption" style={{ marginTop: 2 }}>Zone neutre</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, padding: '10px 14px', borderRadius: 8, background: 'rgba(76,183,130,0.1)', borderLeft: '3px solid var(--success)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>RSI &lt; 30</div>
              <div className="caption" style={{ marginTop: 2 }}>Survente — rebond possible</div>
            </div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            <strong>Nuance importante :</strong> surachat ne signifie pas "va baisser maintenant".
            En forte tendance haussière, le RSI peut rester au-dessus de 70 pendant des semaines.
            C'est un signal d'attention, pas un ordre de vente automatique.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Les divergences RSI/prix</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            C'est l'utilisation la plus puissante du RSI.
          </p>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--danger)', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Divergence baissière</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
              PatrimCorp fait un nouveau sommet à 110 € (plus haut que le sommet précédent à
              100 €). Mais le RSI à ce nouveau sommet est à 65, alors qu'il était à 75 au sommet
              précédent. Le prix monte, mais avec moins de force. Les acheteurs s'épuisent. C'est
              un signal d'alerte — la tendance haussière perd de son élan.
            </p>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--success)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>Divergence haussière</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
              PatrimCorp fait un nouveau creux à 40 € (plus bas que le creux précédent à 50 €).
              Mais le RSI est à 35, alors qu'il était à 25 au creux précédent. La baisse ralentit
              malgré le nouveau plus bas. Les vendeurs s'épuisent.
            </p>
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Limites du RSI</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: 'var(--ink-subtle)' }}>
            <li><strong style={{ color: 'var(--ink)' }}>Indicateur en retard</strong> : il calcule sur des données passées, il ne prédit pas l'avenir.</li>
            <li><strong style={{ color: 'var(--ink)' }}>Faux signaux en range</strong> : en marché sans tendance, le RSI oscille sans cesse entre 30 et 70 en générant des signaux qui ne mènent nulle part.</li>
            <li><strong style={{ color: 'var(--ink)' }}>Ne jamais l'utiliser seul</strong> : toujours confirmer avec d'autres éléments (support/résistance, volume, autre indicateur).</li>
          </ul>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>PatrimCorp — une divergence baissière en direct</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '7', minWidth: 280 }}>
              <EduCandleChart candles={slice} height={300} markers={markers} showVolume={overlays.volume} />
              {divergence && (
                <p className="caption" style={{ marginTop: 8, lineHeight: 1.6 }}>
                  Le second sommet (cercle rouge) est plus haut en prix que le premier (cercle
                  bleu), mais son RSI est plus bas — la hausse s'essouffle malgré le nouveau
                  plus haut.
                </p>
              )}
            </div>
            <div style={{ flex: '3', minWidth: 220 }}>
              <EduIndicatorPanel candles={slice} show={{ rsi: true }} onOverlaysChange={setOverlays} />
            </div>
          </div>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — RSI</h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📊</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 3 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Le RSI mesure la force d'un mouvement et révèle les divergences avant qu'elles soient
          visibles sur le prix seul. Prochaine étape : le MACD, pour suivre la direction de la
          tendance.
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

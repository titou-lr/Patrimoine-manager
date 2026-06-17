import { useMemo, useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'
import { EduCandleChart } from './markets/EduCandleChart'
import { EduIndicatorPanel, type EduActiveOverlays } from './markets/EduIndicatorPanel'
import { bollinger } from '../../../finance/services/indicatorsService'
import { PATRIMCORP_MAIN } from '../../data/patrimcorpData'
import { findBollingerSqueeze } from '../../data/marketAnnotations'

const QUESTIONS: QuizQuestion[] = [
  {
    text: 'Les bandes de Bollinger de PatrimCorp se resserrent fortement depuis plusieurs jours. Qu\'est-ce que cela indique ?',
    options: [
      'Le titre est en zone de surachat',
      'Une période de faible volatilité qui précède souvent un mouvement fort — mais sans indication de direction',
      'Le titre va baisser — les bandes se resserrent toujours avant une chute',
      'Le volume est trop faible pour trader ce titre',
    ],
    correct: 1,
    explanation:
      "Le squeeze de Bollinger signale une énergie contenue qui finit toujours par se libérer — mais les bandes elles-mêmes ne disent jamais dans quelle direction.",
  },
  {
    text: 'Le prix de PatrimCorp sort au-dessus de la bande supérieure de Bollinger lors d\'une forte tendance haussière confirmée. Comment interpréter ça ?',
    options: [
      'Signal de vente immédiat — le titre est en surachat extrême',
      'Signal neutre — les bandes de Bollinger ne fonctionnent pas en tendance',
      'Souvent une confirmation de la force de la tendance, pas nécessairement un signal de vente',
      'Il faut attendre que le prix revienne dans les bandes avant d\'acheter',
    ],
    correct: 2,
    explanation:
      "Une sortie de bande en tendance forte confirme souvent l'ampleur du mouvement plutôt que d'annoncer un retournement imminent.",
  },
  {
    text: 'PatrimCorp cote 50 € avec un ATR de 2 €. Où placer un stop raisonnable pour éviter d\'être sorti par le bruit normal du marché ?',
    options: [
      '49 € — 1 € sous l\'entrée',
      '47 € — 3 € sous l\'entrée (1,5× ATR)',
      '45 € — 5 € sous l\'entrée',
      'L\'ATR ne sert pas à placer des stops',
    ],
    correct: 1,
    explanation:
      "Stop = entrée − 1,5×ATR = 50 − 1,5×2 = 47 €. Ce niveau laisse au titre sa respiration normale sans le coller trop près du prix.",
  },
  {
    text: 'Quelle combinaison d\'indicateurs permet d\'estimer la direction probable d\'une explosion après un squeeze de Bollinger ?',
    options: [
      'ATR + MACD uniquement',
      'La direction de la tendance précédant le squeeze + RSI pour évaluer le momentum et la zone (survente/surachat)',
      'Les bandes de Bollinger seules suffisent',
      'Il est impossible d\'estimer la direction',
    ],
    correct: 1,
    explanation:
      "Le squeeze dit 'quand', pas 'dans quel sens'. Combiner avec la tendance de fond et le RSI permet d'estimer une probabilité directionnelle, jamais une certitude.",
  },
]

export default function LessonM5BollingerATR({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [overlays, setOverlays] = useState<EduActiveOverlays>({ sma20: false, sma50: false, ema20: false, bollinger: true, volume: false })

  const slice = useMemo(() => PATRIMCORP_MAIN.slice(100, 170), [])
  const closes = useMemo(() => slice.map(c => c.close), [slice])
  const bollVals = useMemo(() => bollinger(closes, 20, 2), [closes])
  const squeeze = useMemo(() => findBollingerSqueeze(bollVals, closes), [bollVals, closes])

  const markers = squeeze
    ? [
        { index: squeeze.start, position: 'belowBar' as const, color: 'var(--primary)', shape: 'circle' as const, text: 'squeeze' },
        { index: squeeze.expansionIndex, position: 'belowBar' as const, color: 'var(--success)', shape: 'arrowUp' as const, text: 'expansion' },
      ]
    : []

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Bandes de Bollinger et ATR</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Tu sais lire un graphique, identifier une tendance, mesurer la force et la direction
            d'un mouvement. Il manque une dernière dimension : la <strong>volatilité</strong>. À
            quel point le marché est-il agité ? Est-ce que PatrimCorp bouge de 0,5 % par jour ou
            de 5 % ? Cette information change tout à la façon de dimensionner une position et de
            placer un stop.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>L'écart-type, sans intimidation</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            L'écart-type mesure à quel point les valeurs s'éloignent de leur moyenne. Si
            PatrimCorp clôture en moyenne à 100 € et que ses clôtures varient entre 98 € et
            102 €, l'écart-type est faible — le marché est calme. Si elles varient entre 80 € et
            120 €, l'écart-type est élevé — le marché est agité. En statistiques, 95 % des
            valeurs se trouvent dans un intervalle de ±2 écarts-types autour de la moyenne.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Bandes de Bollinger</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            <strong>Construction :</strong> moyenne mobile 20 périodes (bande centrale) + bande
            supérieure à +2 écarts-types + bande inférieure à −2 écarts-types.
          </p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            <li>Le prix reste dans les bandes ~95 % du temps.</li>
            <li>Quand le prix touche la bande supérieure : il est dans les 2,5 % des valeurs les plus hautes — statistiquement éloigné de la moyenne.</li>
            <li>Quand il touche la bande inférieure : dans les 2,5 % les plus basses.</li>
          </ul>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--primary)', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-hover)', marginBottom: 4 }}>La contraction des bandes (squeeze)</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
              Quand les bandes se resserrent fortement, l'écart-type est faible — le marché est
              dans une phase de calme, d'accumulation. Cette énergie contenue finit toujours par
              se libérer dans un mouvement fort. C'est le squeeze de Bollinger. Le problème : les
              bandes ne disent pas dans quelle direction l'explosion va se produire. C'est là
              qu'on combine avec le RSI — si le RSI est en zone de survente pendant le squeeze, la
              probabilité d'une explosion haussière augmente.
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            <strong>L'expansion des bandes :</strong> forte volatilité en cours, le marché est en
            mouvement. Attention : un prix qui sort de la bande supérieure en forte tendance n'est
            pas nécessairement un signal de vente — c'est souvent une confirmation de la force de
            la tendance.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>ATR (Average True Range)</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            L'ATR ne donne pas de signal directionnel — il ne dit pas "monte" ou "baisse". Il
            répond à une seule question : de combien PatrimCorp bouge-t-il en moyenne sur une
            période ?
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            <strong>Calcul simplifié :</strong> le True Range d'une bougie est le plus grand de
            ces trois écarts : High−Low de la bougie, High−Close précédent, Low−Close précédent.
            L'ATR est la moyenne de ces True Ranges sur 14 périodes.
          </p>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--success)', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>Exemple chiffré</div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
              PatrimCorp cote 100 €. Son ATR 14 périodes est à 3 € — il bouge en moyenne de 3 €
              par jour. Si tu places ton stop à 99 € (1 € sous ton entrée), il sera déclenché par
              le simple bruit quotidien du marché. <strong>Règle pratique :</strong> stop à 1,5×
              ou 2× l'ATR sous le point d'entrée. Ici : 100 − (1,5 × 3) = <strong>95,50 €</strong>.
              Ce niveau laisse au titre de la "respiration" normale sans déclencher le stop pour
              rien.
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            <strong>Second usage :</strong> comparer la volatilité de plusieurs titres pour
            choisir où investir ou dimensionner ses positions.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>PatrimCorp — squeeze puis expansion</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '7', minWidth: 280 }}>
              <EduCandleChart
                candles={slice} height={300} markers={markers} showVolume={overlays.volume}
                bollingerUpper={bollVals.upper} bollingerLower={bollVals.lower}
              />
              <p className="caption" style={{ marginTop: 8, lineHeight: 1.6 }}>
                Observe la zone où les bandes se resserrent (point bleu) avant l'expansion
                haussière franche (flèche verte).
              </p>
            </div>
            <div style={{ flex: '3', minWidth: 220 }}>
              <EduIndicatorPanel candles={slice} show={{ rsi: true, macd: true, bollinger: true, atr: true }} onOverlaysChange={setOverlays} />
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Bollinger & ATR</h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>🌪️</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 5 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Tu maîtrises maintenant les chandeliers, les tendances, le RSI, le MACD et la
          volatilité. Dernière étape : mettre tout ça en pratique sur un exercice de trading en
          conditions simulées.
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

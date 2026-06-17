import { useMemo, useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'
import { EduCandleChart } from './markets/EduCandleChart'
import { EduIndicatorPanel, type EduActiveOverlays } from './markets/EduIndicatorPanel'
import { macd } from '../../../finance/services/indicatorsService'
import { PATRIMCORP_MAIN } from '../../data/patrimcorpData'
import { findMacdCrossovers } from '../../data/marketAnnotations'

const QUESTIONS: QuizQuestion[] = [
  {
    text: 'La ligne MACD croise au-dessus de la ligne Signal. Que signifie ce signal ?',
    options: [
      "Signal de vente — la tendance s'inverse à la baisse",
      'Signal d\'achat potentiel — le momentum bascule à la hausse',
      "Signal neutre — le MACD n'est fiable qu'au-dessus de zéro",
      'Le prix va obligatoirement monter dans les prochaines heures',
    ],
    correct: 1,
    explanation:
      "Le croisement haussier indique que la moyenne courte (EMA12) reprend de la vigueur par rapport à la moyenne longue (EMA26) — un basculement de momentum, pas une certitude.",
  },
  {
    text: "L'histogramme MACD rétrécit progressivement alors que le prix continue de monter. Qu'est-ce que cela indique ?",
    options: [
      'Le signal haussier se renforce',
      "Le momentum de la hausse ralentit — premier signe d'essoufflement possible",
      "L'histogramme n'a aucune signification propre",
      'Le volume va augmenter prochainement',
    ],
    correct: 1,
    explanation:
      "L'écart entre la ligne MACD et la ligne Signal se réduit — c'est souvent le premier signe d'un retournement, avant même que le prix ne se retourne visiblement.",
  },
  {
    text: 'Pourquoi RSI et MACD ne constituent-ils pas deux confirmations totalement indépendantes ?',
    options: [
      'Ils sont calculés sur des périodes identiques',
      'Ils utilisent tous deux les prix de clôture comme données sources — leur dépendance limite la valeur de la double confirmation',
      'Ils donnent toujours le même signal simultanément',
      'Le MACD intègre déjà le RSI dans son calcul',
    ],
    correct: 1,
    explanation:
      "Les deux indicateurs dérivent de la même donnée brute (les clôtures). Ils peuvent se confirmer, mais ce n'est pas l'équivalent de croiser deux sources d'information indépendantes.",
  },
  {
    text: 'Le MACD donne un signal d\'achat sur un marché en range (sans tendance claire). Quelle est la fiabilité de ce signal ?',
    options: [
      'Très fiable — le MACD est précis dans toutes les configurations',
      'Faible — le MACD génère beaucoup de faux signaux en l\'absence de tendance',
      'Fiable uniquement si le RSI confirme',
      'Nulle — le MACD ne fonctionne qu\'en tendance baissière',
    ],
    correct: 1,
    explanation:
      "Comme la plupart des indicateurs basés sur des moyennes mobiles, le MACD multiplie les faux croisements en l'absence de tendance — il est conçu pour suivre des mouvements directionnels.",
  },
]

export default function LessonM4MACD({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [overlays, setOverlays] = useState<EduActiveOverlays>({ sma20: false, sma50: false, ema20: false, bollinger: false, volume: false })

  const slice = useMemo(() => PATRIMCORP_MAIN.slice(75, 165), [])
  const closes = useMemo(() => slice.map(c => c.close), [slice])
  const macdVals = useMemo(() => macd(closes), [closes])
  const crossovers = useMemo(() => findMacdCrossovers(macdVals), [macdVals])

  const markers = crossovers.map(ev => ({
    index: ev.index,
    position: ev.type === 'bullish' ? 'belowBar' as const : 'aboveBar' as const,
    color: ev.type === 'bullish' ? 'var(--success)' : 'var(--danger)',
    shape: ev.type === 'bullish' ? 'arrowUp' as const : 'arrowDown' as const,
    text: ev.type === 'bullish' ? 'MACD ▲' : 'MACD ▽',
  }))

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>MACD : suivre la tendance</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Le RSI mesure la force d'un mouvement. Le MACD mesure sa direction et son momentum en
            comparant deux moyennes mobiles exponentielles. Avant d'expliquer le MACD, il faut
            comprendre ce qu'est une moyenne mobile — c'est la fondation de tout ce qui suit.
          </p>
        </div>

        {/* Étape 1 — SMA avec exemple chiffré */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Étape 1 — La SMA (Simple Moving Average)</div>
          <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            La SMA est la <strong>moyenne arithmétique des N derniers prix de clôture</strong>,
            recalculée à chaque nouvelle bougie. Elle lisse les fluctuations et révèle la tendance
            sous-jacente.
          </p>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.8 }}>
            <div style={{ color: 'var(--ink-subtle)', marginBottom: 4 }}>Exemple sur 5 jours :</div>
            <div>Clôtures : <span style={{ color: 'var(--ink)' }}>100 € — 102 € — 98 € — 105 € — 103 €</span></div>
            <div style={{ marginTop: 4 }}>
              SMA(5) = <span style={{ color: 'var(--primary-hover)' }}>(100 + 102 + 98 + 105 + 103) / 5 = <strong>101,6 €</strong></span>
            </div>
            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-subtle)' }}>
              Demain, la dernière valeur entre, la première sort — la fenêtre glisse.
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            <strong style={{ color: 'var(--ink)' }}>Limite :</strong> la SMA donne un poids égal à
            toutes les données — une clôture d'il y a 20 jours compte autant qu'hier. Ça peut
            rendre la moyenne lente à réagir.
          </p>
        </div>

        {/* Étape 2 — EMA */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Étape 2 — L'EMA (Exponential Moving Average)</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            L'EMA est comme la SMA, mais <strong>les données récentes ont plus de poids</strong>.
            Plus une valeur est ancienne, moins elle compte dans le calcul.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 140, padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>SMA</div>
              <div className="caption">Poids égal à toutes les périodes. Lente à réagir.</div>
            </div>
            <div style={{ flex: 1, minWidth: 140, padding: '10px 14px', borderRadius: 8, background: 'rgba(94,106,210,0.1)', borderLeft: '3px solid var(--primary)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, color: 'var(--primary-hover)' }}>EMA</div>
              <div className="caption">Poids plus fort sur les données récentes. Réagit plus vite aux mouvements récents que la SMA.</div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            La formule exacte n'est pas nécessaire — l'essentiel : l'EMA est une SMA qui
            <strong> privilégie le présent</strong>. Si le prix fait un mouvement brusque
            aujourd'hui, l'EMA réagit plus vite que la SMA.
          </p>
        </div>

        {/* Étape 3 — Pourquoi comparer EMA12 et EMA26 */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Étape 3 — Pourquoi comparer une EMA courte et une EMA longue</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            L'EMA12 reflète les 12 dernières périodes (tendance récente). L'EMA26 reflète les 26
            dernières périodes (tendance plus longue).
          </p>
          <div className="col" style={{ gap: 8 }}>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(76,183,130,0.1)', borderLeft: '3px solid var(--success)' }}>
              <div className="caption">
                <strong style={{ color: 'var(--success)' }}>EMA12 au-dessus de EMA26</strong> → les prix récents sont plus élevés
                que les prix plus anciens → <strong>momentum haussier</strong>.
              </div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(235,87,87,0.1)', borderLeft: '3px solid var(--danger)' }}>
              <div className="caption">
                <strong style={{ color: 'var(--danger)' }}>EMA12 en dessous de EMA26</strong> → les prix récents sont plus bas
                que les prix plus anciens → <strong>momentum baissier</strong>.
              </div>
            </div>
          </div>
        </div>

        {/* Étape 4 — Ligne MACD */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Étape 4 — La ligne MACD = EMA12 − EMA26</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            La ligne MACD est <strong>simplement l'écart entre les deux moyennes</strong>.
            C'est tout. Rien de plus complexe que ça.
          </p>
          <div className="col" style={{ gap: 6 }}>
            <div className="caption">
              <span style={{ fontFamily: 'var(--font-mono)' }}>MACD positif</span> → EMA12 au-dessus de EMA26 → momentum haussier.
            </div>
            <div className="caption">
              <span style={{ fontFamily: 'var(--font-mono)' }}>MACD négatif</span> → EMA12 en dessous de EMA26 → momentum baissier.
            </div>
            <div className="caption">
              <span style={{ fontFamily: 'var(--font-mono)' }}>MACD = 0</span> → les deux EMA se croisent — moment charnière.
            </div>
          </div>
        </div>

        {/* Étape 5 — Ligne Signal */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Étape 5 — La ligne Signal = EMA9 du MACD</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            La ligne Signal est <strong>la moyenne des 9 dernières valeurs de la ligne MACD</strong>.
            C'est une EMA appliquée non pas au prix, mais à la ligne MACD elle-même.
          </p>
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-3)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            Elle lisse la ligne principale pour <strong style={{ color: 'var(--ink)' }}>filtrer le bruit</strong>.
            Quand la ligne MACD est au-dessus de la ligne Signal, les 9 dernières périodes de
            momentum sont en accélération haussière — le signal se confirme. Quand elle passe
            en dessous, le momentum bascule.
          </div>
        </div>

        {/* Étape 6 — Histogramme */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Étape 6 — L'histogramme = MACD − Signal</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            L'histogramme représente l'<strong>écart entre la ligne MACD et la ligne Signal</strong>.
          </p>
          <div className="col" style={{ gap: 8 }}>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
              <div className="caption">
                <strong style={{ color: 'var(--ink)' }}>Quand il grandit</strong> → l'écart entre les deux lignes augmente
                → le momentum s'<strong>accélère</strong>.
              </div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
              <div className="caption">
                <strong style={{ color: 'var(--ink)' }}>Quand il rétrécit</strong> → le momentum <strong>ralentit</strong>.
                C'est souvent le premier signe d'un retournement — visible sur l'histogramme
                avant même que les lignes ne se croisent.
              </div>
            </div>
          </div>
        </div>

        {/* Étape 7 — Signaux de croisement */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Étape 7 — Les signaux de croisement</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            Maintenant que tu comprends les 3 composants, les signaux deviennent évidents :
          </p>
          <div className="col" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 14 }}>▲</span>
              <span className="caption"><strong style={{ color: 'var(--ink)' }}>Croisement haussier :</strong> ligne MACD croise au-dessus de la ligne Signal → signal d'achat potentiel.</span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 14 }}>▽</span>
              <span className="caption"><strong style={{ color: 'var(--ink)' }}>Croisement baissier :</strong> ligne MACD croise en dessous de la ligne Signal → signal de vente potentiel.</span>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <span style={{ fontSize: 14 }}>0</span>
              <span className="caption"><strong style={{ color: 'var(--ink)' }}>Zero line cross :</strong> ligne MACD passe au-dessus de zéro → confirmation de tendance haussière.</span>
            </div>
          </div>
        </div>

        {/* Limites */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Limites du MACD</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: 'var(--ink-subtle)' }}>
            <li><strong style={{ color: 'var(--ink)' }}>Indicateur en retard</strong> : basé sur des moyennes mobiles, il réagit après le mouvement.</li>
            <li>Génère beaucoup de <strong style={{ color: 'var(--ink)' }}>faux signaux</strong> en marché sans tendance.</li>
            <li>RSI et MACD utilisent tous deux les prix de clôture — ce ne sont pas deux confirmations totalement indépendantes.</li>
          </ul>
        </div>

        {/* Demo chart */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>PatrimCorp — croisements MACD en direct</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: '7', minWidth: 280 }}>
              <EduCandleChart candles={slice} height={300} markers={markers} showVolume={overlays.volume} />
              <p className="caption" style={{ marginTop: 8, lineHeight: 1.6 }}>
                Les flèches vertes marquent les croisements haussiers du MACD, les rouges les
                croisements baissiers — observe leur position par rapport aux retournements de
                prix.
              </p>
            </div>
            <div style={{ flex: '3', minWidth: 220 }}>
              <EduIndicatorPanel candles={slice} show={{ rsi: true, macd: true }} onOverlaysChange={setOverlays} />
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — MACD</h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📉</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 4 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Le MACD te donne la direction et le momentum de la tendance. Prochaine étape : mesurer
          la volatilité avec les bandes de Bollinger et l'ATR.
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

import { useMemo, useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'
import { EduCandleChart } from './markets/EduCandleChart'
import { PATRIMCORP_MAIN, aggregateCandles } from '../../data/patrimcorpData'

const QUESTIONS: QuizQuestion[] = [
  {
    text: 'Une bougie dont le corps est rouge/plein (close < open) signifie :',
    options: [
      'Le prix a baissé sur toute la période sans exception',
      'Les vendeurs ont dominé la période — le prix de clôture est inférieur au prix d\'ouverture',
      'Le volume a été très faible sur cette période',
      'Le prix va continuer à baisser la période suivante',
    ],
    correct: 1,
    explanation:
      "Une bougie baissière indique simplement que la clôture est sous l'ouverture — les vendeurs ont eu le dernier mot sur cette période précise, rien de plus.",
  },
  {
    text: "Le cours de PatrimCorp monte de 3 % en une journée, mais le volume est 5x inférieur à la moyenne habituelle. Comment interpréter ça ?",
    options: [
      'Signal haussier fort — la hausse est d\'autant plus significative',
      'La hausse est fragile — peu de participants, mouvement peu crédible à confirmer',
      "Signal neutre — le volume n'a aucun lien avec la validité d'un mouvement",
      'Signal baissier — un faible volume indique toujours une prochaine baisse',
    ],
    correct: 1,
    explanation:
      "Peu d'acteurs ont participé à cette hausse. Sans relais d'acheteurs, le mouvement manque de carburant pour continuer — il est fragile, pas nécessairement faux.",
  },
  {
    text: "Que représente la mèche haute d'une bougie ?",
    options: [
      "Le prix d'ouverture de la période",
      'Le prix le plus haut atteint, mais que les vendeurs ont empêché de tenir — rejet du haut',
      'Le volume échangé pendant la période',
      'La résistance technique la plus proche',
    ],
    correct: 1,
    explanation:
      "La mèche haute raconte une bataille perdue par les acheteurs : le prix est monté jusque-là, puis les vendeurs ont repris le contrôle avant la clôture.",
  },
  {
    text: "Tu analyses PatrimCorp sur un graphique journalier et tu vois une tendance haussière depuis 2 mois. En passant sur le graphique horaire, tu vois une baisse depuis 3 jours. Comment interprètes-tu cette situation ?",
    options: [
      'Les deux graphiques se contredisent — les indicateurs sont peu fiables',
      'La tendance journalière annule la baisse horaire',
      'Ce sont deux réalités cohérentes à des échelles différentes — correction court terme dans une tendance long terme haussière',
      'Il faut toujours privilégier le timeframe le plus court',
    ],
    correct: 2,
    explanation:
      "Même réalité, deux échelles. Une correction de 3 jours est invisible sur 2 mois de tendance — l'horizon d'analyse doit correspondre à l'horizon d'investissement.",
  },
]

// ── Schéma d'anatomie — bougie haussière vs baissière, annoté par flèches ───────

function AnnotatedCandle({ bullish }: { bullish: boolean }) {
  const color = bullish ? '#4cb782' : '#eb5757'
  const markerId = bullish ? 'arrow-bull' : 'arrow-bear'
  // Haussière : close (prix le plus élevé du corps) en haut, open en bas.
  // Baissière : open (prix le plus élevé du corps) en haut, close en bas.
  const topLabel = bullish ? 'CLOSE' : 'OPEN'
  const bottomLabel = bullish ? 'OPEN' : 'CLOSE'
  return (
    <div className="col" style={{ alignItems: 'center', gap: 10 }}>
      <svg viewBox="0 0 190 230" width={190} height={230}>
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-subtle)" />
          </marker>
        </defs>
        {/* mèche */}
        <line x1="90" y1="18" x2="90" y2="208" stroke={color} strokeWidth="2" />
        {/* corps */}
        <rect x="65" y="68" width="50" height="84" fill={color} opacity="0.92" rx="2" />

        {/* HIGH — haut de la mèche */}
        <line x1="138" y1="18" x2="117" y2="18" stroke="var(--ink-subtle)" strokeWidth="1.4" markerEnd={`url(#${markerId})`} />
        <text x="141" y="22" fontSize="12" fontWeight="700" fill="var(--ink)">HIGH</text>

        {/* haut du corps */}
        <line x1="138" y1="68" x2="117" y2="68" stroke="var(--ink-subtle)" strokeWidth="1.4" markerEnd={`url(#${markerId})`} />
        <text x="141" y="72" fontSize="12" fontWeight="700" fill={color}>{topLabel}</text>

        {/* bas du corps */}
        <line x1="138" y1="152" x2="117" y2="152" stroke="var(--ink-subtle)" strokeWidth="1.4" markerEnd={`url(#${markerId})`} />
        <text x="141" y="156" fontSize="12" fontWeight="700" fill={color}>{bottomLabel}</text>

        {/* LOW — bas de la mèche */}
        <line x1="138" y1="208" x2="117" y2="208" stroke="var(--ink-subtle)" strokeWidth="1.4" markerEnd={`url(#${markerId})`} />
        <text x="141" y="212" fontSize="12" fontWeight="700" fill="var(--ink)">LOW</text>
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{bullish ? 'Bougie haussière' : 'Bougie baissière'}</span>
    </div>
  )
}

function MiniCandle({ open, close, high, low, label }: { open: number; close: number; high: number; low: number; label: string }) {
  const up = close >= open
  const color = up ? '#4cb782' : '#eb5757'
  const yScale = (v: number) => 90 - v * 70
  const bodyTop = yScale(Math.max(open, close))
  const bodyBottom = yScale(Math.min(open, close))
  return (
    <div className="col" style={{ alignItems: 'center', gap: 6 }}>
      <svg viewBox="0 0 60 100" width={60} height={100}>
        <line x1="30" y1={yScale(high)} x2="30" y2={yScale(low)} stroke={color} strokeWidth="2" />
        <rect x="16" y={Math.min(bodyTop, bodyBottom - 1.5)} width="28" height={Math.max(1.5, bodyBottom - bodyTop)} fill={color} opacity="0.9" rx="1.5" />
      </svg>
      <span className="caption" style={{ fontSize: 11, textAlign: 'center', maxWidth: 90 }}>{label}</span>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────

export default function LessonM1Candles({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick')
  const [timeframe, setTimeframe] = useState<'1J' | '1S' | '1M'>('1J')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const displayed = useMemo(() => {
    if (timeframe === '1S') return aggregateCandles(PATRIMCORP_MAIN, 7)
    if (timeframe === '1M') return aggregateCandles(PATRIMCORP_MAIN, 30)
    return PATRIMCORP_MAIN
  }, [timeframe])

  const hovered = hoverIdx != null ? displayed[hoverIdx] : displayed[displayed.length - 1]

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Lire un graphique de cours</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Avant même de regarder un graphique, il faut comprendre ce qu'est un{' '}
            <strong>cours de bourse</strong>. Un cours, c'est simplement le prix auquel deux
            personnes ont accepté d'échanger un titre à un instant T. Ni plus, ni moins. Le
            graphique raconte l'histoire de tous ces échanges dans le temps — pour PatrimCorp
            (ticker <span style={{ fontFamily: 'var(--font-mono)' }}>PTMC</span>) comme pour
            n'importe quel actif cotée.
          </p>
        </div>

        {/* Ligne vs chandeliers */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Graphique en ligne vs chandeliers</div>
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            Un graphique en ligne relie simplement les prix de <strong>clôture</strong> entre eux.
            Simple à lire, mais limité : il ne montre pas ce qui s'est passé <em>pendant</em> la
            période. Le titre a-t-il fortement chuté puis remonté dans la journée ? Le graphique
            en ligne ne le dira jamais. Les <strong>chandeliers japonais</strong> résolvent ce
            problème : chaque bougie raconte toute l'histoire d'une période — ouverture, plus
            haut, plus bas et clôture.
          </p>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => setChartType('line')}
              className="btn"
              style={{
                fontSize: 12, padding: '4px 10px',
                background: chartType === 'line' ? 'var(--primary)' : undefined,
                color: chartType === 'line' ? '#fff' : undefined,
              }}
            >
              📈 Ligne
            </button>
            <button
              onClick={() => setChartType('candlestick')}
              className="btn"
              style={{
                fontSize: 12, padding: '4px 10px',
                background: chartType === 'candlestick' ? 'var(--primary)' : undefined,
                color: chartType === 'candlestick' ? '#fff' : undefined,
              }}
            >
              🕯 Chandeliers
            </button>
          </div>
        </div>

        {/* Anatomie — le schéma précède tout texte explicatif */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Anatomie d'une bougie</div>

          <div className="row" style={{ gap: 36, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 6 }}>
            <AnnotatedCandle bullish />
            <AnnotatedCandle bullish={false} />
          </div>

          <div style={{
            margin: '4px 0 18px', padding: '12px 16px', borderRadius: 8,
            background: 'var(--surface-3)', textAlign: 'center', fontSize: 14, fontWeight: 600,
          }}>
            <span style={{ color: 'var(--success)' }}>Haussière</span> = close au-dessus de l'open (vert).{' '}
            <span style={{ color: 'var(--danger)' }}>Baissière</span> = close en dessous de l'open (rouge).
          </div>

          <div className="col" style={{ gap: 8 }}>
            {[
              ['Open (ouverture)', 'Prix au début de la période.'],
              ['Close (clôture)', 'Prix à la fin de la période.'],
              ['High (plus haut)', 'Prix le plus élevé atteint pendant la période.'],
              ['Low (plus bas)', 'Prix le plus bas atteint pendant la période.'],
              ['Corps', "Rectangle entre l'ouverture et la clôture — l'essentiel du mouvement."],
              ['Mèche haute', 'Les acheteurs ont poussé le prix jusque-là, mais les vendeurs ont repris le dessus.'],
              ['Mèche basse', 'Les vendeurs ont poussé le prix jusque-là, mais les acheteurs ont repris le dessus.'],
            ].map(([label, desc]) => (
              <div key={label} className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 130, flexShrink: 0 }}>{label}</span>
                <span className="caption" style={{ lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Types de bougies */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Quelques bougies types</div>
          <div className="row" style={{ gap: 28, flexWrap: 'wrap' }}>
            <MiniCandle open={0.15} close={0.95} high={0.97} low={0.13} label="Marubozu haussier — corps plein sans mèches : force totale des acheteurs" />
            <MiniCandle open={0.5} close={0.52} high={0.85} low={0.15} label="Doji — open ≈ close : indécision totale entre acheteurs et vendeurs" />
            <MiniCandle open={0.55} close={0.65} high={0.7} low={0.05} label="Marteau — longue mèche basse : rejet du bas, les acheteurs sont revenus" />
          </div>
        </div>

        {/* Volumes */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Les volumes</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            Le <strong>volume</strong> est le nombre de titres échangés sur la période. Ce n'est
            pas un prix — c'est une mesure de <strong>participation</strong>.
          </p>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, color: 'var(--ink-subtle)' }}>
            <li>Mouvement de prix <strong style={{ color: 'var(--ink)' }}>avec</strong> volume fort = beaucoup d'acteurs participent = mouvement crédible.</li>
            <li>Mouvement de prix <strong style={{ color: 'var(--ink)' }}>sans</strong> volume = peu de participants = mouvement fragile, potentiellement non confirmé.</li>
          </ul>
          <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-3)', borderLeft: '3px solid var(--primary)', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            Si le prix monte à 55 € mais que seulement 1 000 titres ont été échangés sur la
            journée (contre 50 000 en moyenne), qui va continuer à acheter pour pousser le prix
            plus haut ?
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 600 }}>
            Règle pratique : toujours regarder le volume quand un niveau important est cassé ou
            quand le prix fait un mouvement fort.
          </p>
        </div>

        {/* Timeframes */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Les timeframes</div>
          <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            Le même titre peut raconter des histoires différentes selon l'horizon regardé :
          </p>
          <div className="col" style={{ gap: 6, marginBottom: 12 }}>
            {[
              ['1 minute / 5 minutes', 'Trading intraday, très bruité'],
              ['1 heure / 4 heures', 'Swing trading, quelques jours'],
              ['1 jour', 'Tendance de moyen terme, quelques semaines/mois'],
              ['1 semaine / 1 mois', 'Tendance de long terme'],
            ].map(([tf, desc]) => (
              <div key={tf} className="row" style={{ gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 150, color: 'var(--primary-hover)' }}>{tf}</span>
                <span className="caption">{desc}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            PatrimCorp peut être en tendance haussière sur le graphique journalier (depuis 3 mois)
            et en correction baissière sur le graphique horaire (depuis 3 jours). Ce n'est pas une
            contradiction — c'est la même réalité vue à deux échelles différentes. L'horizon
            d'analyse doit correspondre à l'horizon d'investissement.
          </p>
          <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="caption" style={{ fontWeight: 600 }}>Journalier (3 mois) — tendance haussière</span>
              <svg viewBox="0 0 160 50" width={160} height={50}>
                <polyline
                  points="0,45 30,35 60,32 90,20 120,12 160,5"
                  fill="none" stroke="#4cb782" strokeWidth="2"
                />
              </svg>
            </div>
            <div className="col" style={{ gap: 4 }}>
              <span className="caption" style={{ fontWeight: 600 }}>Horaire (3 jours) — correction court terme</span>
              <svg viewBox="0 0 160 50" width={160} height={50}>
                <polyline
                  points="0,8 30,15 60,28 90,38 120,30 160,16"
                  fill="none" stroke="#eb5757" strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Graphique interactif */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div className="eyebrow">PatrimCorp (PTMC) — graphique interactif</div>
            <div className="row" style={{ gap: 6 }}>
              {(['1J', '1S', '1M'] as const).map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className="btn"
                  style={{
                    fontSize: 11, padding: '3px 9px',
                    background: timeframe === tf ? 'var(--primary)' : undefined,
                    color: timeframe === tf ? '#fff' : undefined,
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div onMouseLeave={() => setHoverIdx(null)}>
            <EduCandleChart
              candles={displayed}
              chartType={chartType}
              showVolume
              height={320}
            />
          </div>

          {hovered && (
            <div className="row" style={{ gap: 18, marginTop: 12, flexWrap: 'wrap', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              <span>O <strong>{hovered.open.toFixed(2)} €</strong></span>
              <span>H <strong>{hovered.high.toFixed(2)} €</strong></span>
              <span>L <strong>{hovered.low.toFixed(2)} €</strong></span>
              <span>C <strong>{hovered.close.toFixed(2)} €</strong></span>
              <span>Vol <strong>{hovered.volume?.toLocaleString('fr-FR')}</strong></span>
            </div>
          )}
          <p className="caption" style={{ marginTop: 8 }}>
            Survole le graphique pour explorer les bougies de PatrimCorp — passe en mode ligne pour
            voir ce que l'on perd en détail.
          </p>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Lire un graphique de cours</h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>🕯️</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 1 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Tu sais désormais lire l'anatomie d'une bougie, interpréter le volume et choisir le bon
          timeframe. La prochaine étape : comprendre comment les prix s'organisent en tendances et
          en niveaux clés.
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

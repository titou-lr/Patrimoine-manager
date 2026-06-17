import { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Tu as besoin de cet argent dans 1 an. Quel actif est le plus adapté ?",
    options: ['Actions', 'Crypto', 'Livret A', 'SCPI'],
    correct: 2,
    explanation:
      "Le Livret A est sans risque et disponible à tout moment. Actions, SCPI et crypto peuvent perdre 20–70 % en un an — inadaptés sur un horizon aussi court.",
  },
  {
    text: "Un ETF actions monde a une volatilité annuelle de ~15 %. Que peut-on attendre sur une année donnée ?",
    options: [
      "Le fonds perd 15 % chaque année",
      "Les rendements fluctuent d'environ ±15 % autour de la moyenne annuelle",
      "Le rendement maximum est plafonné à 15 %",
      "Un rendement de 15 % est garanti",
    ],
    correct: 1,
    explanation:
      "La volatilité (σ) mesure la dispersion des rendements. À 15 %, une année typique peut afficher +15 % ou −15 % autour de la moyenne — ce n'est pas une perte certaine, c'est une mesure d'incertitude.",
  },
  {
    text: "Le drawdown maximum du S&P 500 a atteint −57 % en 2009. Qu'indique cette mesure ?",
    options: [
      "La perte annuelle moyenne de l'indice",
      "La plus forte baisse depuis un sommet historique jusqu'au creux suivant",
      "Le rendement minimal garanti sur 10 ans",
      "La volatilité mensuelle de l'indice",
    ],
    correct: 1,
    explanation:
      "Le drawdown maximum mesure la plus forte baisse entre un sommet et le creux qui suit. −57 % signifie qu'un investisseur ayant investi au pic aurait temporairement perdu plus de la moitié de son capital — sans vendre, il aurait récupéré.",
  },
  {
    text: "Portefeuille A : 10 %/an pour 20 % de volatilité. Portefeuille B : 7 %/an pour 8 % de volatilité. Taux sans risque : 2 %. Lequel est le plus efficace ?",
    options: [
      "Le portefeuille A, car son rendement absolu est plus élevé",
      "Le portefeuille B, car son Ratio de Sharpe est plus élevé",
      "Ils sont équivalents en efficacité",
      "Le portefeuille A, car prendre plus de risque est toujours payant",
    ],
    correct: 1,
    explanation:
      "Sharpe A = (10−2)/20 = 0,40. Sharpe B = (7−2)/8 = 0,625. B est plus efficace : il génère plus de rendement par unité de risque prise. Le Ratio de Sharpe permet de comparer des portefeuilles à niveaux de risque différents.",
  },
  {
    text: "Un ETF a un bêta (β) de 1,5 par rapport à son indice. Si l'indice monte de 10 %, quelle performance attend-on ?",
    options: [
      "~10 % — il suit le marché exactement",
      "~15 % — il amplifie les mouvements du marché",
      "~7 % — il amortit les mouvements du marché",
      "~1,5 % — le bêta est le rendement espéré",
    ],
    correct: 1,
    explanation:
      "Le bêta mesure la sensibilité à l'indice de référence. β = 1,5 → chaque +10 % du marché donne ~+15 %, et chaque −10 % donne ~−15 %. Un bêta > 1 amplifie les mouvements dans les deux sens.",
  },
]

interface Asset {
  name: string
  label: string
  risk: number
  ret: number
  color: string
}

const ASSETS: Asset[] = [
  { name: 'Livret A', label: 'Livret A', risk: 0.5, ret: 3, color: '#4cb782' },
  { name: 'Obligations IG', label: 'Oblig. IG', risk: 5, ret: 4, color: '#6c8cd5' },
  { name: 'SCPI', label: 'SCPI', risk: 9, ret: 5, color: '#8b6bd2' },
  { name: 'Actions monde', label: 'Actions', risk: 15, ret: 8, color: '#5e6ad2' },
  { name: 'Small caps', label: 'Small caps', risk: 22, ret: 10, color: '#f5a623' },
  { name: 'Crypto', label: 'Crypto', risk: 60, ret: 20, color: '#eb5757' },
]

const MEASURES = [
  {
    name: 'Volatilité (σ)',
    desc: "Écart-type annualisé des rendements. Une σ de 15 % signifie des fluctuations de ±15 % autour de la moyenne.",
  },
  {
    name: 'Drawdown maximum',
    desc: "Plus forte baisse depuis un sommet. Le S&P 500 a vu −57 % en 2009 — un investisseur doit pouvoir y survivre sans vendre.",
  },
  {
    name: 'Ratio de Sharpe',
    desc: "Excès de rendement par unité de risque. Sharpe = (R − Rf) / σ. Plus c'est élevé, plus le portefeuille est efficace.",
  },
  {
    name: 'Bêta (β)',
    desc: "Sensibilité à un indice de référence. β = 1 → suit le marché. β > 1 → amplifie les mouvements (actions cycliques, crypto).",
  },
]

// Dot only — labels are shown in the legend below the chart to avoid overlap
function CustomDot(props: { cx?: number; cy?: number; payload?: Asset }) {
  const { cx = 0, cy = 0, payload } = props
  if (!payload) return null
  return (
    <circle cx={cx} cy={cy} r={7} fill={payload.color} opacity={0.85} />
  )
}

export default function Lesson3RiskReturn({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')

  // ── Content ────────────────────────────────────────────────────────────────

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Risque, rendement et horizon</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            <strong>Risque et rendement sont indissociables.</strong> Il n'existe pas de rendement
            élevé sans risque — si quelqu'un vous promet le contraire, fuyez. La règle d'or :
            plus vous visez haut, plus vous devez accepter la volatilité, les baisses temporaires
            et le risque de perte. L'horizon de placement est votre principal outil pour transformer
            ce risque en opportunité.
          </p>
        </div>

        {/* 4 mesures */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Les 4 mesures clés du risque</div>
          <div className="col" style={{ gap: 14 }}>
            {MEASURES.map(m => (
              <div key={m.name} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                  color: 'var(--primary-hover)', background: 'var(--primary-tint)',
                  padding: '3px 8px', borderRadius: 5, flexShrink: 0, minWidth: 110, textAlign: 'center',
                }}>
                  {m.name}
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scatter chart */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Frontière risque / rendement — grandes classes d'actifs</div>

          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis
                dataKey="risk"
                type="number"
                name="Volatilité"
                unit=" %"
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                label={{ value: 'Risque — volatilité annuelle (%)', position: 'insideBottom', offset: -16, fontSize: 11, fill: 'var(--ink-subtle)' }}
                domain={[0, 70]}
              />
              <YAxis
                dataKey="ret"
                type="number"
                name="Rendement"
                unit=" %"
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                label={{ value: 'Rendement %/an', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: 'var(--ink-subtle)' }}
                domain={[0, 25]}
                width={48}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  borderRadius: 8, fontSize: 12,
                }}
                content={(props) => {
                  if (!props.active || !props.payload?.length) return null
                  const p = props.payload[0]?.payload as Asset
                  return (
                    <div style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                      <div className="caption">Rendement attendu : ~{p.ret} %/an</div>
                      <div className="caption">Volatilité : ~{p.risk} %</div>
                    </div>
                  )
                }}
              />
              <Scatter
                data={ASSETS}
                shape={(shapeProps: { cx?: number; cy?: number; payload?: Asset }) => (
                  <CustomDot cx={shapeProps.cx} cy={shapeProps.cy} payload={shapeProps.payload} />
                )}
              />
            </ScatterChart>
          </ResponsiveContainer>

          {/* Legend below chart — avoids SVG text overlap */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', marginTop: 12 }}>
            {ASSETS.map(a => (
              <div key={a.name} className="row" style={{ gap: 7 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
                <span className="caption" style={{ fontSize: 11 }}>
                  {a.name} — ~{a.ret} %/an, vol. {a.risk} %
                </span>
              </div>
            ))}
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

  // ── Quiz ───────────────────────────────────────────────────────────────────

  if (screen === 'quiz') {
    return (
      <LessonShell step={2} totalSteps={3} onBack={() => setScreen('content')} backLabel="← Retour au contenu">
        <div>
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM situationnel — Risque & rendement</h2>
          <p className="caption">5 questions · 5/5 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  // ── Résultat ───────────────────────────────────────────────────────────────

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>⚖️</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 3 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Tu comprends maintenant que risque et rendement sont indissociables, et que l'horizon
          de placement est ton meilleur allié pour dompter la volatilité. Sur 20 ans, la patience
          l'emporte presque toujours.
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

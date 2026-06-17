import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "À 6 %/an, en combien d'années un capital double-t-il (règle des 72) ?",
    options: ['6 ans', '10 ans', '12 ans', '8 ans'],
    correct: 2,
    explanation: 'Règle des 72 : 72 ÷ 6 = 12 ans. Formule approchée mais remarquablement précise.',
  },
  {
    text: "10 000 € investis à 25 ans à 7 %/an vs 20 000 € investis à 35 ans au même taux. À 55 ans, lequel est plus grand ?",
    options: ['20 000 € à 35 ans', '10 000 € à 25 ans', 'Ils sont égaux'],
    correct: 1,
    explanation:
      '10 000 € × 1,07^30 ≈ 76 123 € ; 20 000 € × 1,07^20 ≈ 77 394 €. Quasi-identiques : 10 ans de composition supplémentaires compensent un capital initial doublé.',
  },
  {
    text: "Qu'est-ce qui distingue les intérêts composés des intérêts simples ?",
    options: [
      'Le taux est plus élevé',
      'Les intérêts sont réinvestis et génèrent à leur tour des intérêts',
      "Il n'y a pas de différence sur 10 ans",
      "Ils s'appliquent uniquement aux actions",
    ],
    correct: 1,
    explanation:
      "Avec les intérêts composés, chaque période de gain s'accumule sur une base plus grande. Sur 30 ans, l'écart avec les intérêts simples devient spectaculaire.",
  },
]

const RATES = [
  { key: 'c4' as const, label: '4 % (prudent)', color: '#4cb782' },
  { key: 'c7' as const, label: '7 % (équilibré)', color: '#5e6ad2' },
  { key: 'c10' as const, label: '10 % (dynamique)', color: '#f5a623' },
]

function fmtEur(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace('.', ',')} M€`
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

function fmtTooltip(v: number) {
  return Math.round(v).toLocaleString('fr-FR') + ' €'
}

export default function Lesson2Compound({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [capital, setCapital] = useState(10000)
  const [capitalInput, setCapitalInput] = useState('10000')

  const data = useMemo(() => {
    const c = Math.max(1000, Math.min(1_000_000, capital))
    return Array.from({ length: 31 }, (_, t) => ({
      year: t,
      c4: Math.round(c * Math.pow(1.04, t)),
      c7: Math.round(c * Math.pow(1.07, t)),
      c10: Math.round(c * Math.pow(1.10, t)),
    }))
  }, [capital])

  function applyCapital() {
    const n = parseInt(capitalInput.replace(/\D/g, ''), 10)
    if (!isNaN(n) && n >= 1000) setCapital(Math.min(1_000_000, n))
  }

  // ── Content ────────────────────────────────────────────────────────────────

  if (screen === 'content') {
    const last = data[30]
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Les intérêts composés</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Les intérêts composés, c'est la <strong>magie du réinvestissement</strong> : chaque intérêt
            s'ajoute au capital et génère lui-même des intérêts au cycle suivant. L'effet est{' '}
            <em>non-linéaire</em> — les gains s'accélèrent avec le temps. Sur 30 ans, la courbe à 10 %
            ressemble davantage à un décollage qu'à une progression régulière.
          </p>
          <p style={{ margin: '12px 0 0', lineHeight: 1.75, fontSize: 14 }}>
            <strong>Insight clé :</strong> commencer tôt bat souvent investir beaucoup. 10 000 €
            placés à 25 ans peuvent valoir autant que 20 000 € placés à 35 ans — grâce à 10 ans de
            composition supplémentaires.
          </p>
        </div>

        {/* Formules */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Formules clés</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2,
            background: 'var(--surface-3)', padding: '12px 16px', borderRadius: 8,
          }}>
            <div>V(t) = C₀ × (1 + r)ⁿ</div>
            <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginTop: 2 }}>
              C₀ = capital initial · r = taux annuel · n = nombre d'années
            </div>
            <div style={{ marginTop: 10, borderTop: '1px solid var(--hairline)', paddingTop: 10 }}>
              Règle des 72 : Doublement ≈ 72 / Taux (%)
            </div>
          </div>
          <div className="row" style={{ gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
            {[4, 6, 8, 10, 12].map(t => (
              <span key={t} className="caption">
                {t} % → <strong style={{ color: 'var(--ink)' }}>{Math.round(72 / t)} ans</strong>
              </span>
            ))}
          </div>
        </div>

        {/* Graphique interactif */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div className="eyebrow">Croissance sur 30 ans</div>
            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
              <span className="caption">Capital :</span>
              <input
                value={capitalInput}
                onChange={e => setCapitalInput(e.target.value)}
                onBlur={applyCapital}
                onKeyDown={e => e.key === 'Enter' && applyCapital()}
                style={{
                  width: 90, height: 28, padding: '0 8px',
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  background: 'var(--surface-3)', border: '1px solid var(--hairline)',
                  borderRadius: 6, color: 'var(--ink)', outline: 'none',
                }}
              />
              <span className="caption">€</span>
            </div>
          </div>

          <div className="row" style={{ gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
            {RATES.map(({ label, color }) => (
              <div key={label} className="row" style={{ gap: 6 }}>
                <div style={{ width: 14, height: 3, background: color, borderRadius: 2, flexShrink: 0 }} />
                <span className="caption">{label}</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => (v === 0 ? 'Auj.' : `${v} ans`)}
                interval={5}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M€`
                    : `${Math.round(v / 1000)}k€`
                }
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  borderRadius: 8, fontSize: 12,
                }}
                formatter={((value: number, name: string) => {
                  const label = { c4: 'Taux 4 %', c7: 'Taux 7 %', c10: 'Taux 10 %' }[name] ?? name
                  return [fmtTooltip(value), label]
                }) as never}
                labelFormatter={v => `Année ${v}`}
              />
              <Line type="monotone" dataKey="c4" stroke="#4cb782" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="c7" stroke="#5e6ad2" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="c10" stroke="#f5a623" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <div className="row" style={{ gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {([last.c4, last.c7, last.c10] as number[]).map((val, i) => (
              <span key={i} className="caption" style={{ color: RATES[i].color }}>
                {RATES[i].label.split(' ')[0]} % → <strong>{fmtEur(val)}</strong>
              </span>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Intérêts composés</h2>
          <p className="caption">3 questions · 3/3 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  // ── Résultat ───────────────────────────────────────────────────────────────

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📈</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 2 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Les intérêts composés transforment une somme modeste en capital important sur le long terme.
          Le secret ? Commencer tôt, réinvestir systématiquement, et ne jamais interrompre la composition.
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

import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Un placement rapporte 4 %/an, l'inflation est à 2,5 %. Quel est le rendement réel approximatif ?",
    options: ['6,5 %', '1,5 %', '4 %', '2 %'],
    correct: 1,
    explanation: 'Rendement réel ≈ Rendement nominal − Inflation = 4 % − 2,5 % = 1,5 %.',
  },
  {
    text: "50 000 € laissés sur un compte à 0 % pendant 10 ans avec 2 % d'inflation valent en réalité environ...",
    options: ['50 000 €', '60 000 €', '41 000 €', '45 000 €'],
    correct: 2,
    explanation: "50 000 € ÷ (1,02)^10 ≈ 41 000 €. L'inflation a érodé ~18 % du pouvoir d'achat.",
  },
  {
    text: "Quel est l'ennemi principal d'une épargne non investie sur le long terme ?",
    options: ['Les impôts', "L'inflation", 'Les frais bancaires', 'La volatilité'],
    correct: 1,
    explanation: "L'inflation érode silencieusement le pouvoir d'achat, même si le solde nominal reste stable sur le compte.",
  },
]

function fmtEur(n: number) {
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

export default function Lesson1Inflation({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [inflation, setInflation] = useState(2)

  const data = useMemo(() => {
    const r = inflation / 100
    return Array.from({ length: 26 }, (_, t) => ({
      year: t,
      cash: Math.round(100000 / Math.pow(1 + r, t)),
      invest: Math.round(100000 * Math.pow(1.07, t)),
    }))
  }, [inflation])

  // ── Content ────────────────────────────────────────────────────────────────

  if (screen === 'content') {
    const cashAt20 = Math.round(100000 / Math.pow(1 + inflation / 100, 20))
    const cashAt25 = data[25].cash
    const investAt25 = data[25].invest

    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>L'inflation, l'ennemi silencieux</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            <strong>L'inflation</strong> mesure la hausse générale des prix. À 2 %/an, un panier qui vaut
            100 € aujourd'hui en coûtera 149 € dans 20 ans. Pour l'épargnant, cela signifie que chaque
            euro non investi — ou placé à un taux inférieur à l'inflation —{' '}
            <em>perd du pouvoir d'achat silencieusement</em>, même si le solde nominal reste le même.
          </p>
        </div>

        {/* Formules */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Formules clés</div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 2,
            background: 'var(--surface-3)', padding: '12px 16px', borderRadius: 8,
          }}>
            <div>Rendement réel ≈ Rendement nominal − Inflation</div>
            <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginTop: 2 }}>
              Formule exacte de Fisher : (1 + r_réel) = (1 + r_nom) / (1 + π)
            </div>
          </div>
          <div className="caption" style={{ marginTop: 10 }}>
            Avec {inflation} % d'inflation, 100 000 € non investis valent réellement{' '}
            <strong style={{ color: '#eb5757' }}>{fmtEur(cashAt20)}</strong> après 20 ans.
          </div>
        </div>

        {/* Graphique interactif */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div className="eyebrow">Cash vs investi à 7 %/an — 25 ans</div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="caption">Inflation :</span>
              <input
                type="range" min={1} max={5} step={0.5} value={inflation}
                onChange={e => setInflation(Number(e.target.value))}
                style={{ width: 90 }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 38 }}>
                {inflation} %
              </span>
            </div>
          </div>

          <div className="row" style={{ gap: 20, marginBottom: 12, flexWrap: 'wrap' }}>
            {[
              { color: '#eb5757', label: "Cash (pouvoir d'achat réel)" },
              { color: '#5e6ad2', label: 'Investi à 7 %/an' },
            ].map(({ color, label }) => (
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
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `${Math.round(v / 1000)}k€`}
                width={46}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  borderRadius: 8, fontSize: 12,
                }}
                formatter={((value: number, name: string) => [
                  fmtEur(value),
                  name === 'cash' ? "Cash réel" : "Investi 7 %",
                ]) as never}
                labelFormatter={v => `Année ${v}`}
              />
              <Line type="monotone" dataKey="cash" stroke="#eb5757" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="invest" stroke="#5e6ad2" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
            <span className="caption" style={{ color: '#eb5757' }}>
              Cash à 25 ans : <strong>{fmtEur(cashAt25)}</strong>
            </span>
            <span className="caption" style={{ color: '#5e6ad2' }}>
              Investi à 25 ans : <strong>{fmtEur(investAt25)}</strong>
            </span>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — L'inflation</h2>
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
        <div style={{ fontSize: 44 }}>🎯</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 1 complétée !</div>
        <p className="caption" style={{ maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
          Tu sais désormais que l'inflation est l'ennemi silencieux du capital non investi.
          Investir au-delà du taux d'inflation, c'est préserver — et faire croître — ton
          pouvoir d'achat réel sur la durée.
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

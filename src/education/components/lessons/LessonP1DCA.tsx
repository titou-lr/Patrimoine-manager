import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Sur quel type de marché le lump-sum est-il statistiquement avantageux par rapport au DCA ?",
    options: [
      "Sur les marchés baissiers uniquement",
      "Sur les marchés haussiers de long terme — car les marchés montent plus souvent qu'ils ne baissent",
      "Sur les marchés très volatils sans tendance claire",
      "Le lump-sum n'est jamais statistiquement avantageux",
    ],
    correct: 1,
    explanation: "Historiquement, les marchés progressent ~70 % du temps. Investir immédiatement expose l'intégralité du capital au rendement moyen positif dès le premier jour.",
  },
  {
    text: "Tu reçois ton salaire chaque mois et investis systématiquement 300 € à chaque versement, faute d'avoir un capital plus important d'avance. De quel type de DCA s'agit-il ?",
    options: [
      "DCA choisi — tu pourrais investir plus si tu le voulais",
      "DCA obligatoire — c'est une contrainte de flux de revenus, pas un choix face au lump-sum",
      "Ce n'est pas du DCA, c'est du lump-sum mensuel",
      "La distinction n'a pas d'importance pratique",
    ],
    correct: 1,
    explanation: "Le DCA obligatoire résulte d'une contrainte de revenus : tu n'as pas de capital disponible d'avance. Il n'y a pas de choix à faire entre DCA et lump-sum — c'est la seule option.",
  },
  {
    text: "Quel est l'avantage psychologique principal du DCA par rapport au lump-sum ?",
    options: [
      "Il garantit un rendement supérieur",
      "Il élimine totalement le risque de marché",
      "Il réduit le stress de devoir choisir le bon moment et permet d'investir sereinement même en marché baissier",
      "Il évite de payer des frais de courtage",
    ],
    correct: 2,
    explanation: "Le DCA retire la pression du timing. En marché baissier, chaque versement achète plus de parts — on investit sans angoisser sur le « bon moment ».",
  },
]

const TRAJECTORIES = [
  { label: "Haussière régulière", prices: [100,102,104,106,108,110,112,114,116,118,120,122] },
  { label: "Volatile (creux puis reprise)", prices: [100,97,89,78,70,75,84,95,106,114,119,122] },
  { label: "Baissière puis forte hausse", prices: [100,95,89,82,75,68,65,72,84,99,114,125] },
]

function simulateDCA(capital: number, prices: number[]) {
  const monthly = capital / prices.length
  let shares = 0
  return prices.map(p => { shares += monthly / p; return shares * p })
}

function simulateLumpSum(capital: number, prices: number[]) {
  const shares = capital / prices[0]
  return prices.map(p => shares * p)
}

function fmtEur(n: number) { return Math.round(n).toLocaleString('fr-FR') + ' €' }

export default function LessonP1DCA({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [capital, setCapital] = useState(20000)
  const [trajIdx, setTrajIdx] = useState(0)

  const traj = TRAJECTORIES[trajIdx]

  const chartData = useMemo(() => {
    const dca = simulateDCA(capital, traj.prices)
    const ls = simulateLumpSum(capital, traj.prices)
    return traj.prices.map((_, i) => ({ month: i + 1, dca: Math.round(dca[i]), lumpsum: Math.round(ls[i]) }))
  }, [capital, trajIdx])

  const finalDCA = chartData[chartData.length - 1].dca
  const finalLS = chartData[chartData.length - 1].lumpsum
  const diff = finalLS - finalDCA

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>DCA vs investissement unique</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Tu reçois un héritage de 20 000 €.{' '}
            <strong>Tout investir aujourd'hui, ou étaler sur 12 mois ?</strong>{' '}
            Les deux approches existent, et la réponse n'est pas universelle — elle dépend entièrement
            du chemin emprunté par les prix.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            {
              title: 'Lump-sum', color: '#5e6ad2',
              desc: "Investir la totalité d'un capital disponible en une seule fois dès maintenant.",
              pro: "Statistiquement supérieur 2 fois sur 3 sur les marchés haussiers de long terme.",
              con: "Risque de tomber exactement au mauvais moment (veille d'une baisse).",
            },
            {
              title: 'DCA', color: '#1abc9c',
              desc: "Investir une somme fixe à intervalles réguliers, indépendamment des conditions de marché.",
              pro: "Achète plus de parts lors des baisses. Réduit le stress du timing.",
              con: "Une part du capital reste non-investie (cash) pendant la période d'étalement.",
            },
          ].map(({ title, color, desc, pro, con }) => (
            <div key={title} className="panel" style={{ padding: '14px 16px', borderTop: `3px solid ${color}` }}>
              <div className="subhead" style={{ color, marginBottom: 8 }}>{title}</div>
              <p className="caption" style={{ margin: '0 0 8px', lineHeight: 1.5 }}>{desc}</p>
              <div style={{ fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--success)' }}>✓</span>{' '}{pro}
              </div>
              <div style={{ fontSize: 12 }}>
                <span style={{ color: 'var(--danger)' }}>✗</span>{' '}{con}
              </div>
            </div>
          ))}
        </div>

        <div className="panel" style={{ padding: '14px 16px' }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Distinction essentielle</div>
          <p className="caption" style={{ margin: 0, lineHeight: 1.6 }}>
            <strong>DCA choisi</strong> — tu as un capital disponible mais tu choisis de l'étaler volontairement.{' '}
            <strong>DCA obligatoire</strong> — tu investis ton salaire mensuel car tu n'as pas de capital d'avance.
            Ce n'est pas la même situation : le DCA obligatoire n'est pas un choix stratégique face au lump-sum,
            c'est une contrainte de flux de revenus.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Simulateur — explore les trajectoires</div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="caption">Capital :</span>
              <input type="range" min={5000} max={50000} step={5000} value={capital}
                onChange={e => setCapital(Number(e.target.value))} style={{ width: 100 }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, minWidth: 60 }}>
                {capital.toLocaleString('fr-FR')} €
              </span>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {TRAJECTORIES.map((t, i) => (
                <button key={i} onClick={() => setTrajIdx(i)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  background: trajIdx === i ? 'var(--primary)' : 'var(--surface-3)',
                  color: trajIdx === i ? '#fff' : 'var(--ink-subtle)',
                  border: `1px solid ${trajIdx === i ? 'var(--primary)' : 'var(--hairline)'}`,
                }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { color: '#5e6ad2', label: 'Lump-sum' },
              { color: '#1abc9c', label: 'DCA (étalé sur 12 mois)', dashed: true },
            ].map(({ color, label, dashed }) => (
              <div key={label} className="row" style={{ gap: 6 }}>
                <div style={{
                  width: 20, height: 2, flexShrink: 0, marginTop: 6,
                  borderTop: dashed ? `2px dashed ${color}` : `2px solid ${color}`,
                  background: dashed ? 'none' : color,
                }} />
                <span className="caption">{label}</span>
              </div>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `M${v}`} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `${Math.round(v / 1000)}k€`} width={44} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 12 }}
                formatter={((v: number, name: string) => [fmtEur(v), name === 'lumpsum' ? 'Lump-sum' : 'DCA']) as never}
                labelFormatter={v => `Mois ${v}`}
              />
              <Line type="monotone" dataKey="lumpsum" stroke="#5e6ad2" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="dca" stroke="#1abc9c" strokeWidth={2} dot={false} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 6 }}>
            <span className="caption" style={{ color: '#5e6ad2' }}>Lump-sum final : <strong>{fmtEur(finalLS)}</strong></span>
            <span className="caption" style={{ color: '#1abc9c' }}>DCA final : <strong>{fmtEur(finalDCA)}</strong></span>
            <span className="caption" style={{ fontWeight: 600, color: Math.abs(diff) < 100 ? 'var(--ink-muted)' : diff > 0 ? '#5e6ad2' : '#1abc9c' }}>
              {Math.abs(diff) < 100 ? 'Résultat identique'
                : `${diff > 0 ? 'Lump-sum' : 'DCA'} gagne (+${fmtEur(Math.abs(diff))})`}
            </span>
          </div>
          <p className="caption" style={{ margin: '8px 0 0', fontStyle: 'italic', color: 'var(--ink-muted)' }}>
            Essaie les 3 trajectoires — le gagnant change selon le chemin des prix.
          </p>
        </div>

        <div className="panel" style={{ padding: '14px 16px', background: 'var(--surface-3)' }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Recommandation pratique</div>
          <p className="caption" style={{ margin: 0, lineHeight: 1.6 }}>
            Capital existant → <strong>lump-sum étalé sur 3–6 mois</strong> si tu veux limiter le
            risque de timing sans perdre totalement l'avantage statistique.
            Épargne mensuelle → <strong>DCA automatique</strong> : c'est la seule option disponible.
          </p>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button onClick={() => setScreen('quiz')} style={{
            display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
            borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            background: 'var(--primary)', color: '#fff',
          }}>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — DCA vs Lump-sum</h2>
          <p className="caption">3 questions · 3/3 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📈</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 1 complétée !</div>
        <p className="caption" style={{ maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
          Tu comprends maintenant la différence entre DCA et lump-sum et surtout quand chaque approche
          est pertinente. La prochaine leçon te montrera pourquoi les grosses pertes sont
          mathématiquement plus dangereuses qu'elles n'y paraissent.
        </p>
        <button onClick={onComplete} style={{
          display: 'inline-flex', alignItems: 'center', height: 38, padding: '0 24px',
          borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          background: 'var(--success)', color: '#fff', marginTop: 8,
        }}>
          Terminer la leçon
        </button>
      </div>
    </LessonShell>
  )
}

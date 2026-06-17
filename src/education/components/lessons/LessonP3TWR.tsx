import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Tu veux comparer la performance de ton portefeuille à celle du MSCI World sur les 5 dernières années. Quelle métrique utiliser ?",
    options: [
      "Le Money-Weighted Return — il reflète ta performance réelle",
      "Le Time-Weighted Return — il neutralise l'effet du timing des versements pour permettre une comparaison équitable",
      "Les deux donnent toujours le même résultat",
      "Aucune des deux ne permet de comparer à un benchmark",
    ],
    correct: 1,
    explanation: "Le TWR neutralise l'impact du timing et du montant des versements personnels. C'est la mesure standard pour comparer à un benchmark ou entre gestionnaires.",
  },
  {
    text: "Deux investisseurs ont placé leur argent dans le même fonds, avec un TWR identique, mais des MWR différents. Quelle est la cause la plus probable de cet écart ?",
    options: [
      "Le fonds a appliqué des frais différents à chacun",
      "Le timing et le montant de leurs versements personnels diffèrent — un investisseur a pu verser au mauvais moment",
      "C'est impossible, le TWR et le MWR sont toujours identiques",
      "Un des deux a payé plus d'impôts",
    ],
    correct: 1,
    explanation: "Le TWR mesure la performance du fonds indépendamment des flux. Le MWR intègre quand et combien chaque investisseur a versé — des versements mal timés dégradent le MWR personnel.",
  },
  {
    text: "Que mesure précisément le Money-Weighted Return ?",
    options: [
      "La performance du gestionnaire du fonds, indépendamment des flux",
      "La performance réelle de l'investisseur en tenant compte du timing et des montants de ses propres versements",
      "Le rendement moyen du marché sur la période",
      "La volatilité du portefeuille de l'investisseur",
    ],
    correct: 1,
    explanation: "Le MWR (équivalent du TRI) pondère les rendements par le capital effectivement exposé à chaque période. Un gros versement avant une baisse dégrade fortement le MWR personnel.",
  },
]

// Fund trajectory: months 0-11, start 100, peak at month 5 (130), drop to 95 at month 8, recover to 115 at month 11
const FUND_PRICES = [100, 108, 116, 122, 128, 130, 118, 105, 95, 100, 108, 115]

// Investor A: 10k at month 0 + 20k at month 5 (at the peak, bad timing)
// Investor B: 10k at month 0 + 20k at month 8 (at the trough, good timing)

function buildPortfolio(
  initial: number,
  extraAt: number,
  extraAmount: number,
  prices: number[]
): number[] {
  let shares = initial / prices[0]
  return prices.map((p, i) => {
    if (i === extraAt) shares += extraAmount / p
    return shares * p
  })
}

function fmtEur(n: number) { return Math.round(n).toLocaleString('fr-FR') + ' €' }
function fmtPct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(1) + ' %' }

export default function LessonP3TWR({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [showB, setShowB] = useState(false)

  const portfolioA = buildPortfolio(10000, 5, 20000, FUND_PRICES)
  const portfolioB = buildPortfolio(10000, 8, 20000, FUND_PRICES)

  const fundReturn = (FUND_PRICES[11] / FUND_PRICES[0] - 1) * 100  // TWR = +15%

  const totalA = 10000 + 20000
  const finalA = portfolioA[11]
  const mwrA = ((finalA - totalA) / totalA) * 100

  const totalB = 10000 + 20000
  const finalB = portfolioB[11]
  const mwrB = ((finalB - totalB) / totalB) * 100

  const chartData = FUND_PRICES.map((_, i) => ({
    month: i,
    a: Math.round(portfolioA[i]),
    b: showB ? Math.round(portfolioB[i]) : undefined,
    fund: Math.round(10000 * FUND_PRICES[i] / 100),
  }))

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Mesurer sa performance : TWR et MWR</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Ton ami et toi avez investi dans le même fonds, sur la même période.
            Lui dit avoir gagné 15 %, toi seulement 8 %. <strong>Le fonds vous a-t-il menti ?</strong>{' '}
            Non — vous mesurez probablement deux choses différentes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            {
              title: 'TWR — Time-Weighted Return',
              color: '#5e6ad2',
              desc: "Mesure la performance du fonds ou du gestionnaire, indépendamment du timing et du montant des versements.",
              use: "Comparer son portefeuille à un benchmark (MSCI World, S&P 500…)",
            },
            {
              title: 'MWR — Money-Weighted Return',
              color: '#1abc9c',
              desc: "Mesure la performance réelle de l'investisseur, en tenant compte du timing et du montant de ses propres versements. Équivalent du TRI (Taux de Rendement Interne).",
              use: "Évaluer sa propre performance compte tenu de ses décisions de timing",
            },
          ].map(({ title, color, desc, use }) => (
            <div key={title} className="panel" style={{ padding: '14px 16px', borderTop: `3px solid ${color}` }}>
              <div className="subhead" style={{ color, marginBottom: 8, fontSize: 13 }}>{title}</div>
              <p className="caption" style={{ margin: '0 0 8px', lineHeight: 1.5 }}>{desc}</p>
              <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>
                <strong>Utiliser pour :</strong> {use}
              </div>
            </div>
          ))}
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Exemple concret — même fonds, timing différent
          </div>
          <p className="caption" style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
            <strong>Investisseur A</strong> : 10 000 € au départ + 20 000 € supplémentaires au mois 5
            (au sommet du marché, juste avant la correction).{' '}
            <strong>Investisseur B</strong> : 10 000 € au départ + 20 000 € au mois 8
            (au creux, après la correction).
            Les deux investissent le même montant total dans le même fonds.
          </p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={showB} onChange={e => setShowB(e.target.checked)} />
              Afficher aussi l'investisseur B
            </label>
          </div>

          <div className="row" style={{ gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
            <div className="row" style={{ gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: '#5e6ad2', marginTop: 1 }} />
              <span className="caption">Investisseur A (versement au sommet)</span>
            </div>
            {showB && (
              <div className="row" style={{ gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#1abc9c', marginTop: 1 }} />
                <span className="caption">Investisseur B (versement au creux)</span>
              </div>
            )}
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `M${v}`} interval={1} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `${Math.round(v / 1000)}k€`} width={44} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, fontSize: 12 }}
                formatter={((v: number, name: string) => [fmtEur(v), name === 'a' ? 'Invest. A' : name === 'b' ? 'Invest. B' : 'Fonds (10k)']) as never}
                labelFormatter={v => `Mois ${v}`}
              />
              <Line type="monotone" dataKey="a" stroke="#5e6ad2" strokeWidth={2} dot={false} />
              {showB && <Line type="monotone" dataKey="b" stroke="#1abc9c" strokeWidth={2} dot={false} />}
            </LineChart>
          </ResponsiveContainer>

          <div style={{ display: 'grid', gridTemplateColumns: showB ? '1fr 1fr' : '1fr', gap: 10, marginTop: 14 }}>
            <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #5e6ad2' }}>
              <div className="eyebrow" style={{ marginBottom: 6, color: '#5e6ad2' }}>Investisseur A</div>
              <div className="row" style={{ gap: 20 }}>
                <div>
                  <div className="caption">TWR (fonds)</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>{fmtPct(fundReturn)}</div>
                </div>
                <div>
                  <div className="caption">MWR personnel</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: mwrA < 0 ? 'var(--danger)' : 'var(--ink)' }}>{fmtPct(mwrA)}</div>
                </div>
              </div>
              <p className="caption" style={{ margin: '6px 0 0', color: 'var(--ink-muted)' }}>
                Versement au sommet → le gros capital a subi la correction. MWR dégradé.
              </p>
            </div>
            {showB && (
              <div className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid #1abc9c' }}>
                <div className="eyebrow" style={{ marginBottom: 6, color: '#1abc9c' }}>Investisseur B</div>
                <div className="row" style={{ gap: 20 }}>
                  <div>
                    <div className="caption">TWR (fonds)</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--success)' }}>{fmtPct(fundReturn)}</div>
                  </div>
                  <div>
                    <div className="caption">MWR personnel</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: mwrB >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmtPct(mwrB)}</div>
                  </div>
                </div>
                <p className="caption" style={{ margin: '6px 0 0', color: 'var(--ink-muted)' }}>
                  Versement au creux → le gros capital a profité de la reprise. MWR bien meilleur.
                </p>
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: '10px 14px', marginTop: 10, background: 'var(--surface-3)' }}>
            <p className="caption" style={{ margin: 0, lineHeight: 1.6 }}>
              <strong>Même TWR pour les deux</strong> : le fonds a eu la même performance — c'est juste.
              <br />
              <strong>MWR différents</strong> : le timing personnel des versements explique tout l'écart.
            </p>
          </div>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — TWR et MWR</h2>
          <p className="caption">3 questions · 3/3 obligatoire pour valider la leçon.</p>
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
        <p className="caption" style={{ maxWidth: 420, lineHeight: 1.7, margin: 0 }}>
          TWR pour comparer à un benchmark. MWR pour comprendre ta performance réelle.
          Ne confonds pas les deux — un fonds peut avoir un excellent TWR pendant que ton
          MWR est négatif à cause d'un mauvais timing personnel.
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

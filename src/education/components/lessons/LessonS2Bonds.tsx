import { useState, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from 'recharts'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Les taux d'intérêt du marché augmentent de 1 %. Que se passe-t-il au prix des obligations existantes ?",
    options: [
      'Le prix augmente — les obligations rapportent plus',
      'Le prix ne change pas — le coupon est fixé contractuellement',
      'Le prix diminue — les anciennes obligations sont moins attractives que les nouvelles',
      'Le prix augmente uniquement pour les obligations Investment Grade',
    ],
    correct: 2,
    explanation:
      "Si les taux montent, les nouvelles obligations émises offrent un meilleur rendement. Pour rester compétitive, une ancienne obligation à coupon fixe inférieur doit voir son prix baisser jusqu'à ce que son rendement effectif redevienne attractif.",
  },
  {
    text: 'Qu\'est-ce qu\'une obligation "Investment Grade" ?',
    options: [
      'Une obligation émise uniquement par des États souverains',
      'Une obligation avec un coupon supérieur à 5 %',
      'Une obligation notée BBB- ou supérieur par les agences de notation — risque de défaut faible',
      'Une obligation cotée en bourse avec une liquidité élevée',
    ],
    correct: 2,
    explanation:
      "La notation Investment Grade (BBB- et au-dessus chez S&P/Fitch, équivalent chez Moody's) signale un risque de défaut jugé faible par les agences de notation. En dessous, on parle de High Yield — rendement plus élevé pour compenser un risque de défaut significatif.",
  },
  {
    text: 'Une obligation a une duration de 7 ans. Les taux de marché montent de 1 %. Quelle est la perte approximative sur le prix ?',
    options: ['1 %', '3,5 %', '7 %', '14 %'],
    correct: 2,
    explanation:
      'ΔPrix ≈ −Duration × ΔTaux = −7 × 1 % = −7 %. La duration mesure directement la sensibilité du prix aux variations de taux : plus elle est élevée, plus l\'obligation est volatile face aux mouvements de taux.',
  },
  {
    text: 'Quelle est la différence entre le taux coupon et le rendement actuariel (YTM) ?',
    options: [
      'Il n\'y a aucune différence — les deux mesurent la même chose',
      'Le coupon est le taux fixe contractuel, le YTM est le rendement réel tenant compte du prix de marché actuel et de tous les flux futurs',
      'Le YTM est toujours supérieur au coupon',
      'Le coupon s\'applique aux actions, le YTM aux obligations',
    ],
    correct: 1,
    explanation:
      "Le coupon est fixé à l'émission et ne change jamais. Le YTM (Yield to Maturity) recalcule le rendement réel obtenu si tu achètes l'obligation à son prix de marché actuel et la conserves jusqu'à l'échéance — il varie avec le prix, donc avec les taux du marché.",
  },
]

const NOMINAL = 1000
const COUPON_RATE = 0.03
const MATURITY = 10
const COUPON = NOMINAL * COUPON_RATE

function bondPrice(rate: number): number {
  const y = rate / 100
  if (y === 0) return NOMINAL + COUPON * MATURITY
  let price = 0
  for (let t = 1; t <= MATURITY; t++) {
    price += COUPON / Math.pow(1 + y, t)
  }
  price += NOMINAL / Math.pow(1 + y, MATURITY)
  return price
}

const CURVE = Array.from({ length: 33 }, (_, i) => {
  const rate = i * 0.25
  return { rate, price: Math.round(bondPrice(rate)) }
})

function fmtEur(n: number) {
  return Math.round(n).toLocaleString('fr-FR') + ' €'
}

export default function LessonS2Bonds({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [rate, setRate] = useState(3)

  const price = useMemo(() => bondPrice(rate), [rate])
  const delta = price - NOMINAL
  const deltaPct = (delta / NOMINAL) * 100

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Comprendre une obligation</h2>

        {/* Distinction fondamentale */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Quand tu achètes une <strong>action</strong>, tu deviens copropriétaire d'une entreprise —
            tu participes à ses succès et ses échecs. Quand tu achètes une <strong>obligation</strong>,
            tu prêtes de l'argent à une entreprise ou à un État, qui s'engage contractuellement à te
            rembourser avec des intérêts. <em>C'est un contrat de dette, pas de propriété.</em>
          </p>
        </div>

        {/* Composantes */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Les 4 composantes d'une obligation</div>
          <div className="col" style={{ gap: 8 }}>
            {[
              { icon: '💵', label: 'Nominal', desc: 'Montant emprunté, remboursé intégralement à l\'échéance.' },
              { icon: '🎟️', label: 'Coupon', desc: "Intérêt périodique versé (ex : 3 %/an du nominal)." },
              { icon: '📅', label: 'Maturité', desc: 'Date à laquelle le nominal est remboursé.' },
              { icon: '📈', label: 'Prix de marché', desc: 'Peut différer du nominal selon les taux en vigueur.' },
            ].map(r => (
              <div key={r.label} style={{
                display: 'flex', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-3)',
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Relation inverse */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>La relation inverse prix / taux</div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--ink-subtle)' }}>
            Contre-intuitive et pourtant fondamentale : <strong style={{ color: 'var(--ink)' }}>
            si les taux du marché montent à 5 % et que ton obligation paie 3 %, personne ne voudra
            la payer 100 quand il peut acheter une nouvelle obligation à 5 % pour le même prix</strong>.
            Son prix baisse jusqu'à ce que son rendement devienne compétitif.
          </p>
          <div style={{
            marginTop: 12, padding: '12px 16px', borderRadius: 8,
            fontFamily: 'var(--font-mono)', fontSize: 13,
            background: 'var(--surface-3)',
          }}>
            ΔPrix ≈ −Duration × ΔTaux
            <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginTop: 4, fontFamily: 'inherit' }}>
              Exemple : duration 5 ans → perte de ~5 % si les taux montent de 1 %
            </div>
          </div>
        </div>

        {/* Investment Grade / High Yield */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Qualité de crédit</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Investment Grade', sub: 'BBB- ou supérieur', desc: 'Risque de défaut faible, rendement modéré.', color: 'var(--success)' },
              { label: 'High Yield', sub: 'BB+ ou inférieur', desc: 'Rendement élevé, risque de défaut significatif.', color: 'var(--danger)' },
            ].map(g => (
              <div key={g.label} style={{
                padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)',
                borderLeft: `3px solid ${g.color}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: g.color, marginBottom: 2 }}>{g.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 6 }}>{g.sub}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{g.desc}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            Le <strong>spread de crédit</strong> est le différentiel de rendement entre une obligation
            et une obligation souveraine de même maturité — il mesure le risque de défaut perçu par
            le marché.
          </p>
        </div>

        {/* Simulateur prix/taux */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
            <div className="eyebrow">Simulateur prix / taux</div>
            <span className="caption" style={{ fontFamily: 'var(--font-mono)' }}>
              Nominal 1000 € · Coupon 3 % · Maturité 10 ans
            </span>
          </div>

          <div className="row" style={{ gap: 10, alignItems: 'center', margin: '16px 0 18px' }}>
            <span className="caption">Taux du marché :</span>
            <input
              type="range" min={0} max={8} step={0.25} value={rate}
              onChange={e => setRate(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, minWidth: 50, textAlign: 'right' }}>
              {rate.toFixed(2)} %
            </span>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={CURVE} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis
                dataKey="rate"
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `${v}%`}
                type="number"
                domain={[0, 8]}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ink-muted)' }}
                tickFormatter={v => `${Math.round(v)}€`}
                width={56}
                domain={[600, 1300]}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  borderRadius: 8, fontSize: 12,
                }}
                formatter={((value: number) => [fmtEur(value), 'Prix']) as never}
                labelFormatter={v => `Taux ${v}%`}
              />
              <Line type="monotone" dataKey="price" stroke="#5e6ad2" strokeWidth={2} dot={false} />
              <ReferenceLine x={rate} stroke="var(--ink-muted)" strokeDasharray="4 4" />
              <ReferenceDot x={rate} y={price} r={5} fill="#eb5757" stroke="#fff" strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 16 }}>
            {[
              { label: 'Prix actuel', val: fmtEur(price), color: 'var(--ink)' },
              { label: 'Écart au nominal', val: `${delta >= 0 ? '+' : ''}${fmtEur(delta)}`, color: delta >= 0 ? 'var(--success)' : 'var(--danger)' },
              { label: 'Variation %', val: `${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)} %`, color: delta >= 0 ? 'var(--success)' : 'var(--danger)' },
            ].map(r => (
              <div key={r.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 6 }}>{r.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.color }}>
                  {r.val}
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            À 3 % de taux de marché, le prix vaut exactement le nominal (1000 €) — le coupon de
            l'obligation correspond au rendement exigé. Déplace le curseur : au-dessus de 3 %, le
            prix chute ; en dessous, il monte.
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>
            QCM — Les obligations
          </h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📜</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 2 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Une obligation est un contrat de dette : son prix évolue à l'inverse des taux du marché.
          La duration mesure cette sensibilité — un repère essentiel pour juger le risque obligataire.
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

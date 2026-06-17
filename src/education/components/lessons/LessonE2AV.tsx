import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Dans une assurance-vie, que se passe-t-il fiscalement lors d'un retrait ?",
    options: [
      "La totalité du retrait est imposée au PFU 30 %",
      "Seule la part de plus-value incluse dans le retrait est imposée",
      "Le retrait est totalement exonéré d'impôts",
      "Le capital retiré est imposé, mais pas les gains",
    ],
    correct: 1,
    explanation:
      "L'AV est une enveloppe de capitalisation : les gains et le capital sont mélangés. Lors d'un retrait, seule la quote-part de gains (proportionnelle à la part de gains dans le contrat) est imposable — pas la totalité du retrait.",
  },
  {
    text: "Ton AV vaut 40 000 € dont 8 000 € de gains (20 %). Tu retires 10 000 €. Quel montant est soumis à l'impôt ?",
    options: [
      "10 000 € — la totalité du retrait",
      "8 000 € — la totalité des gains du contrat",
      "2 000 € — 20 % du retrait",
      "0 € — le capital retiré n'est jamais imposé",
    ],
    correct: 2,
    explanation:
      "La quote-part imposable = retrait × (gains / valeur totale) = 10 000 × 20 % = 2 000 €. Les 8 000 € restants sont du capital remboursé — non imposables, car déjà investis avec de l'argent net d'impôt.",
  },
  {
    text: "Quel est le principal avantage successoral de l'assurance-vie ?",
    options: [
      "Les gains sont exonérés d'impôts à la succession",
      "Les sommes versées avant 70 ans bénéficient d'un abattement de 152 500 € par bénéficiaire, hors droits de succession",
      "L'assurance-vie est automatiquement transmise sans frais à tous les héritiers",
      "Les bénéficiaires ne paient aucun impôt quelle que soit la somme",
    ],
    correct: 1,
    explanation:
      "Les capitaux décès de l'AV sont hors succession civile. Chaque bénéficiaire désigné bénéficie d'un abattement de 152 500 € sur les sommes issues de versements avant 70 ans — un avantage considérable pour la transmission.",
  },
  {
    text: "Après combien d'années l'abattement annuel sur les gains s'applique-t-il ?",
    options: ["5 ans", "10 ans", "8 ans", "3 ans"],
    correct: 2,
    explanation:
      "Après 8 ans, chaque retrait bénéficie d'un abattement annuel de 4 600 € (célibataire) ou 9 200 € (couple) sur la quote-part de gains imposable. Au-delà, le taux passe à 24,7 % (7,5 % IR + 17,2 % PS) au lieu de 30 %.",
  },
]

const fmt = (v: number) =>
  v.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €'

export default function LessonE2AV({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')

  // Simulateur
  const [totalValue, setTotalValue] = useState(50000)
  const [totalGains, setTotalGains] = useState(10000)
  const [withdrawal, setWithdrawal] = useState(5000)
  const [isCouple, setIsCouple] = useState(false)
  const [isAfter8, setIsAfter8] = useState(true)

  const gainRatio  = totalValue > 0 ? Math.min(1, totalGains / totalValue) : 0
  const taxable    = withdrawal * gainRatio
  const abattement = isAfter8 ? (isCouple ? 9200 : 4600) : 0
  const taxableNet = Math.max(0, taxable - abattement)
  const taxAfter8  = taxableNet * 0.247
  const taxBefore8 = taxable * 0.30
  const tax        = isAfter8 ? taxAfter8 : taxBefore8
  const netReceived = withdrawal - tax

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>L'Assurance-vie</h2>

        {/* Déconstruction idée reçue */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            L'assurance-vie n'est <strong>pas une assurance</strong> au sens classique. C'est
            l'enveloppe la plus polyvalente du patrimoine français — elle combine avantages fiscaux,
            liberté totale d'investissement, et un avantage successoral unique : les sommes transmises
            échappent à la succession civile.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { icon: '📈', label: 'Unités de compte (UC)', desc: 'Investi en marchés — rendement potentiel élevé, capital non garanti' },
              { icon: '🔒', label: 'Fonds euros', desc: 'Capital garanti — rendement faible (1–3 %) mais sécurisé' },
            ].map(c => (
              <div key={c.label} style={{
                flex: '1 1 200px', padding: '12px 14px', borderRadius: 8,
                background: 'var(--surface-3)',
              }}>
                <div style={{ fontSize: 16, marginBottom: 6 }}>{c.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-subtle)', lineHeight: 1.5 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fiscalité quote-part */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>La fiscalité des rachats — le principe clé</div>
          <div style={{
            padding: '12px 16px', borderRadius: 8,
            background: 'var(--surface-3)', fontFamily: 'var(--font-mono)',
            fontSize: 13, marginBottom: 14, color: 'var(--primary)',
          }}>
            Quote-part imposable = Retrait × (Gains totaux ÷ Valeur totale)
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            Exemple : 50 000 € dans l'AV dont 10 000 € de gains (20 %). Tu retires 5 000 €.
            Seuls 20 % du retrait = <strong style={{ color: 'var(--ink)' }}>1 000 €</strong> sont des
            gains imposables. Les 4 000 € restants sont du capital — non imposables.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            {[
              { label: 'Avant 8 ans', rate: 'PFU 30 %', color: 'var(--danger)', bg: 'rgba(235,87,87,0.06)' },
              { label: 'Après 8 ans', rate: '7,5 % IR + 17,2 % PS = 24,7 %', color: 'var(--success)', bg: 'rgba(76,183,130,0.06)', bonus: 'Abattement 4 600 €/an (célibataire) ou 9 200 €/an (couple)' },
            ].map(r => (
              <div key={r.label} style={{ padding: '12px 14px', borderRadius: 8, background: r.bg }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: r.color, marginBottom: 6 }}>{r.label}</div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink)', marginBottom: r.bonus ? 6 : 0 }}>{r.rate}</div>
                {r.bonus && <div style={{ fontSize: 11, color: r.color }}>{r.bonus}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Avantage successoral */}
        <div className="panel" style={{ padding: '14px 18px', borderLeft: '3px solid #f5a623' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#f5a623', marginBottom: 6 }}>
            Avantage successoral unique
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            Les versements effectués <strong style={{ color: 'var(--ink)' }}>avant 70 ans</strong> bénéficient
            d'un abattement de{' '}
            <strong style={{ color: 'var(--ink)' }}>152 500 € par bénéficiaire</strong>, totalement hors droits
            de succession. Pour deux enfants : 305 000 € transmis sans impôt.
          </p>
        </div>

        {/* Simulateur de rachat */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Simulateur de rachat — essaie tes chiffres</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'Valeur totale du contrat (€)', val: totalValue, set: setTotalValue },
              { label: 'Gains totaux dans le contrat (€)', val: totalGains, set: setTotalGains },
              { label: 'Montant du retrait souhaité (€)', val: withdrawal, set: setWithdrawal },
            ].map(f => (
              <div key={f.label} style={{ gridColumn: f.label.includes('retrait') ? 'span 2' : 'span 1' }}>
                <label style={{ fontSize: 12, color: 'var(--ink-subtle)', display: 'block', marginBottom: 5 }}>
                  {f.label}
                </label>
                <input
                  type="number"
                  value={f.val}
                  min={0}
                  step={1000}
                  onChange={e => f.set(Math.max(0, Number(e.target.value)))}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    border: '1px solid var(--hairline)', background: 'var(--surface-2)',
                    color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="row" style={{ gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={isCouple}
                onChange={e => setIsCouple(e.target.checked)}
                style={{ accentColor: 'var(--primary)', width: 14, height: 14 }}
              />
              Déclaration couple (abattement 9 200 €)
            </label>
            <div className="row" style={{ gap: 6 }}>
              {[false, true].map(after => (
                <button
                  key={String(after)}
                  onClick={() => setIsAfter8(after)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid',
                    background: isAfter8 === after ? 'var(--primary)' : 'var(--surface-3)',
                    color: isAfter8 === after ? '#fff' : 'var(--ink-subtle)',
                    borderColor: isAfter8 === after ? 'var(--primary)' : 'var(--hairline)',
                  }}
                >
                  {after ? '≥ 8 ans' : '< 8 ans'}
                </button>
              ))}
            </div>
          </div>

          {/* Résultats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              {
                label: 'Quote-part imposable',
                val: fmt(taxable),
                sub: `${(gainRatio * 100).toFixed(1)} % du retrait`,
                color: 'var(--ink)',
              },
              {
                label: isAfter8 ? `Impôt (24,7 % après abatt.)` : 'Impôt (PFU 30 %)',
                val: `−${fmt(tax)}`,
                sub: isAfter8 && abattement > 0 ? `Abattement ${fmt(abattement)} appliqué` : '',
                color: 'var(--danger)',
              },
              {
                label: 'Gain net perçu',
                val: fmt(netReceived),
                sub: isAfter8
                  ? `Économie vs <8 ans : ${fmt(taxBefore8 - tax)}`
                  : 'Sans avantage fiscal',
                color: 'var(--success)',
              },
            ].map(r => (
              <div key={r.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 6 }}>{r.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: r.color }}>
                  {r.val}
                </div>
                {r.sub && (
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>{r.sub}</div>
                )}
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

  if (screen === 'quiz') {
    return (
      <LessonShell step={2} totalSteps={3} onBack={() => setScreen('content')} backLabel="← Retour au contenu">
        <div>
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>
            QCM — L'assurance-vie
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
        <div style={{ fontSize: 44 }}>🏛️</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 2 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          L'assurance-vie est l'enveloppe la plus polyvalente : fiscalité réduite après 8 ans,
          quote-part imposable au lieu de la totalité du retrait, et un avantage successoral sans équivalent.
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

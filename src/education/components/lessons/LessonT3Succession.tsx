import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen, type QuizQuestion } from './QuizScreen'

const LIENS = [
  { id: 'enfant',       label: 'Enfant / Parent',              abattement: 100000, note: 'renouvelable tous les 15 ans' },
  { id: 'petit_enfant', label: 'Petit-enfant',                  abattement: 31865,  note: 'renouvelable tous les 15 ans' },
  { id: 'frere_soeur',  label: 'Frère / Sœur',                 abattement: 15932,  note: 'conditions spécifiques' },
  { id: 'neveu_niece',  label: 'Neveu / Nièce',                abattement: 7967,   note: '' },
  { id: 'conjoint',     label: 'Conjoint / Partenaire PACS',   abattement: Infinity, note: 'exonération totale' },
  { id: 'tiers',        label: 'Tiers (sans lien de parenté)', abattement: 1594,   note: '' },
]

function computeTax(taxable: number, lienId: string): number {
  if (taxable <= 0) return 0
  if (lienId === 'conjoint') return 0

  if (lienId === 'enfant' || lienId === 'petit_enfant') {
    const brackets = [
      { limit: 8072,    rate: 0.05 },
      { limit: 12109,   rate: 0.10 },
      { limit: 15932,   rate: 0.15 },
      { limit: 552324,  rate: 0.20 },
      { limit: 902838,  rate: 0.30 },
      { limit: 1805677, rate: 0.40 },
      { limit: Infinity, rate: 0.45 },
    ]
    let tax = 0
    let prev = 0
    for (const b of brackets) {
      if (taxable <= prev) break
      tax += (Math.min(taxable, b.limit) - prev) * b.rate
      prev = b.limit
    }
    return tax
  }

  if (lienId === 'frere_soeur') {
    const brackets = [
      { limit: 24430,   rate: 0.35 },
      { limit: Infinity, rate: 0.45 },
    ]
    let tax = 0
    let prev = 0
    for (const b of brackets) {
      if (taxable <= prev) break
      tax += (Math.min(taxable, b.limit) - prev) * b.rate
      prev = b.limit
    }
    return tax
  }

  if (lienId === 'neveu_niece') return taxable * 0.55
  return taxable * 0.60
}

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Quel abattement s'applique sur une transmission de parent à enfant ?",
    options: [
      "31 865 €",
      "100 000 €",
      "152 500 €",
      "Aucun abattement spécifique",
    ],
    correct: 1,
    explanation:
      "L'abattement entre parent et enfant (et réciproquement) est de 100 000 € — renouvelable tous les 15 ans. Au-delà, un barème progressif s'applique sur le montant taxable.",
  },
  {
    text: "Cet abattement parent/enfant se renouvelle-t-il dans le temps ?",
    options: [
      "Non, il s'applique une seule fois dans la vie",
      "Oui, tous les 5 ans",
      "Oui, tous les 15 ans",
      "Oui, chaque année",
    ],
    correct: 2,
    explanation:
      "L'abattement de 100 000 € se renouvelle tous les 15 ans. Une donation faite aujourd'hui permet d'en refaire une autre dans 15 ans, entièrement exonérée. C'est la clé d'une stratégie de donations échelonnées.",
  },
  {
    text: "Un conjoint marié ou pacsé doit-il payer des droits de succession sur l'héritage de son partenaire décédé ?",
    options: [
      "Oui, au taux plein comme un tiers",
      "Oui, mais avec un abattement de 100 000 €",
      "Non — exonération totale de droits de succession entre conjoints/partenaires PACS",
      "Cela dépend du régime matrimonial uniquement",
    ],
    correct: 2,
    explanation:
      "Depuis 2007, les conjoints mariés et partenaires de PACS sont totalement exonérés de droits de succession, quel que soit le montant transmis. Ce n'est pas un abattement — c'est une exonération complète.",
  },
  {
    text: "Pourquoi étaler des donations dans le temps (tous les 15 ans) plutôt que tout transmettre au décès peut réduire la fiscalité totale ?",
    options: [
      "Les taux d'imposition diminuent automatiquement avec le temps",
      "Chaque renouvellement de l'abattement permet de transmettre à nouveau un montant exonéré, réduisant le montant final taxé au décès",
      "Les donations ne sont jamais imposées contrairement aux successions",
      "Cela n'a aucun impact, le montant total taxé reste identique",
    ],
    correct: 1,
    explanation:
      "À chaque cycle de 15 ans, l'abattement se renouvelle. Si tu donnes 100 000 € aujourd'hui et 100 000 € dans 15 ans, tu transmets 200 000 € totalement exonérés — alors qu'ils auraient été partiellement taxés en une seule transmission au décès.",
  },
]

function fmtEur(v: number) { return Math.round(v).toLocaleString('fr-FR') + ' €' }

export default function LessonT3Succession({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [amount, setAmount] = useState(200000)
  const [lienId, setLienId] = useState('enfant')

  const lien = LIENS.find(l => l.id === lienId)!
  const abattement = lien.abattement === Infinity ? amount : Math.min(lien.abattement, amount)
  const taxable = Math.max(0, amount - abattement)
  const tax = computeTax(taxable, lienId)
  const netTransmis = amount - tax
  const effRate = amount > 0 ? (tax / amount) * 100 : 0

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Transmettre son patrimoine : les bases de la succession</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            La transmission de patrimoine n'est pas un sujet réservé aux grandes fortunes. Sans
            anticipation, les droits de succession peuvent représenter plusieurs dizaines de milliers
            d'euros — parfois évitables avec un peu de préparation en amont.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Abattements par lien de parenté</div>
          <div className="col" style={{ gap: 6 }}>
            {LIENS.map(l => (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, background: 'var(--surface-2)',
              }}>
                <span className="grow" style={{ fontSize: 13 }}>{l.label}</span>
                {l.note && (
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)', fontStyle: 'italic' }}>{l.note}</span>
                )}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                  color: l.id === 'conjoint' ? 'var(--success)' : l.id === 'tiers' ? 'var(--danger)' : 'var(--ink)',
                }}>
                  {l.id === 'conjoint' ? 'Exonéré' : fmtEur(l.abattement)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Deux principes fondamentaux</div>
          <div className="col" style={{ gap: 12 }}>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Barème progressif, pas un taux unique</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
                Comme l'impôt sur le revenu, seule la part <em>au-delà</em> de l'abattement est taxée,
                et progressivement. En ligne directe, le taux débute à 5 % pour les premières tranches
                et monte jusqu'à 45 % pour les montants très élevés.
              </p>
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(76,183,130,0.08)', border: '1px solid rgba(76,183,130,0.2)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--success)' }}>Le renouvellement des abattements tous les 15 ans</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
                Si tu donnes 100 000 € à ton enfant aujourd'hui sans droits, tu pourras à nouveau lui
                donner 100 000 € sans droits dans 15 ans. C'est ce qui permet une vraie stratégie de
                donations échelonnées dans le temps — bien plus efficace qu'une transmission unique
                au moment du décès.
              </p>
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Simulateur de droits de succession</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-subtle)', display: 'block', marginBottom: 5 }}>
                Montant à transmettre (€)
              </label>
              <input
                type="number"
                value={amount}
                min={0}
                step={10000}
                onChange={e => setAmount(Math.max(0, Number(e.target.value)))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6,
                  border: '1px solid var(--hairline)', background: 'var(--surface-2)',
                  color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--ink-subtle)', display: 'block', marginBottom: 5 }}>
                Lien de parenté
              </label>
              <select
                value={lienId}
                onChange={e => setLienId(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 6,
                  border: '1px solid var(--hairline)', background: 'var(--surface-2)',
                  color: 'var(--ink)', fontSize: 13, boxSizing: 'border-box', cursor: 'pointer',
                }}
              >
                {LIENS.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 10 }}>
            {[
              { label: 'Abattement applicable', val: fmtEur(abattement), color: 'var(--success)' },
              { label: 'Montant taxable', val: fmtEur(taxable), color: taxable > 0 ? 'var(--ink)' : 'var(--ink-muted)' },
            ].map(r => (
              <div key={r.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.val}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)' }}>{r.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 8, background: lienId === 'conjoint' ? 'rgba(76,183,130,0.08)' : 'var(--surface-3)', border: lienId === 'conjoint' ? '1px solid rgba(76,183,130,0.3)' : 'none' }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 4 }}>Droits de succession estimés</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: tax > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {tax > 0 ? `−${fmtEur(tax)}` : '0 €'}
                </div>
                {tax > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 3 }}>
                    soit {effRate.toFixed(1)} % du montant transmis
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 4 }}>Reçu net par l'héritier</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>
                  {fmtEur(netTransmis)}
                </div>
              </div>
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Succession et transmission</h2>
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
        <div className="title" style={{ fontSize: 20 }}>Leçon 3 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Les abattements par lien de parenté permettent de transmettre des sommes importantes
          sans imposition. Clé à retenir : l'abattement parent/enfant (100 000 €) se renouvelle
          tous les 15 ans — c'est la base de toute stratégie successorale.
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

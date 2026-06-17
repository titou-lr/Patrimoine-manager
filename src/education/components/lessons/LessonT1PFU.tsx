import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen, type QuizQuestion } from './QuizScreen'

const TMI_PALIERS = [
  { tmi: 0,  label: '0 %',  baremePlusPS: 17.2 },
  { tmi: 11, label: '11 %', baremePlusPS: 28.2 },
  { tmi: 30, label: '30 %', baremePlusPS: 47.2 },
  { tmi: 41, label: '41 %', baremePlusPS: 58.2 },
  { tmi: 45, label: '45 %', baremePlusPS: 62.2 },
]

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Le PFU de 30 % s'applique-t-il automatiquement sur tes revenus du capital, ou faut-il en faire la demande ?",
    options: [
      "Il faut explicitement le demander chaque année",
      "Il s'applique automatiquement par défaut, l'option pour le barème doit être explicitement choisie",
      "Il ne s'applique qu'aux gros patrimoines",
      "Il dépend du courtier utilisé",
    ],
    correct: 1,
    explanation:
      "Le PFU est le régime par défaut sur tous les revenus du capital. C'est l'option pour le barème progressif qui nécessite une démarche explicite dans la déclaration de revenus.",
  },
  {
    text: "Tu es à TMI 11 %. Quelle option fiscale est globalement plus avantageuse sur tes revenus du capital ?",
    options: [
      "Le PFU à 30 %",
      "Le barème progressif (total 28,2 %)",
      "Les deux options sont strictement équivalentes",
      "Cela dépend uniquement du montant des gains",
    ],
    correct: 1,
    explanation:
      "À TMI 11 %, barème + PS = 11 % + 17,2 % = 28,2 % — légèrement inférieur au PFU de 30 %. Le barème progressif est ici plus avantageux.",
  },
  {
    text: "L'option pour le barème progressif s'applique-t-elle uniquement au placement de ton choix, ou à l'ensemble de tes revenus du capital de l'année ?",
    options: [
      "Uniquement au placement choisi par le contribuable",
      "À l'ensemble de tes revenus du capital de l'année — c'est une option globale et irrévocable",
      "Cela dépend du type d'enveloppe concernée",
      "Elle s'applique sur 3 années consécutives automatiquement",
    ],
    correct: 1,
    explanation:
      "L'option pour le barème est globale et irrévocable pour l'année entière. Impossible de panacher : barème pour un placement et PFU pour un autre la même année.",
  },
  {
    text: "À partir de quelle tranche marginale d'imposition le PFU devient-il clairement préférable au barème progressif ?",
    options: [
      "Dès 11 %",
      "À partir de 30 %",
      "Uniquement à 45 %",
      "Le PFU n'est jamais préférable",
    ],
    correct: 1,
    explanation:
      "À partir de TMI 30 %, barème + PS = 47,2 % — bien supérieur au PFU de 30 %. Le PFU devient clairement avantageux dès cette tranche.",
  },
]

function fmtPct(v: number) { return v.toFixed(1) + ' %' }

export default function LessonT1PFU({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [selectedIdx, setSelectedIdx] = useState(1)

  const palier = TMI_PALIERS[selectedIdx]
  const baremeBetter = palier.baremePlusPS < 30
  const pfuBetter = palier.baremePlusPS > 30

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Flat tax (PFU) vs barème progressif</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Chaque année, sur tes revenus du capital, la France applique automatiquement un taux unique
            de <strong>30 %</strong>. Mais c'est une option par défaut — pas une obligation. Selon ta
            tranche d'imposition, choisir le barème progressif peut te faire économiser de l'argent.
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
            Tu as manipulé le PFU dans tout le Module 3 (PEA, AV, CTO). Cette leçon en détaille le fonctionnement complet et la règle pour décider quand le barème progressif lui est préférable.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Le Prélèvement Forfaitaire Unique (PFU)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'IR forfaitaire', val: '12,8 %', color: 'var(--primary)' },
              { label: 'Prélèvements sociaux', val: '17,2 %', color: '#e67e22' },
              { label: 'Total PFU', val: '30 %', color: 'var(--ink)', bold: true },
            ].map(r => (
              <div key={r.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: r.bold ? 800 : 600, color: r.color, marginBottom: 4 }}>
                  {r.val}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)' }}>{r.label}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            Appliqué <strong style={{ color: 'var(--ink)' }}>automatiquement par défaut</strong> sur les plus-values,
            dividendes et intérêts des placements financiers hors enveloppes fiscales (PEA, AV, PER).
            Pour choisir le barème progressif, tu dois cocher l'option dans ta déclaration — et ce choix est{' '}
            <strong style={{ color: 'var(--ink)' }}>global et irrévocable pour toute l'année</strong>.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Tableau de décision par TMI</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['TMI', 'Barème + PS', 'PFU (30 %)', 'Recommandation'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '8px 10px',
                      borderBottom: '1px solid var(--hairline)',
                      fontSize: 11, color: 'var(--ink-subtle)', fontWeight: 600,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TMI_PALIERS.map(p => {
                  const isBetter = p.baremePlusPS < 30
                  return (
                    <tr key={p.tmi} style={{ borderBottom: '1px solid var(--hairline)' }}>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{p.label}</td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: isBetter ? 'var(--success)' : 'var(--danger)' }}>
                        {fmtPct(p.baremePlusPS)}
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: !isBetter ? 'var(--success)' : 'var(--ink-muted)' }}>
                        30,0 %
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: isBetter ? 'rgba(76,183,130,0.12)' : 'rgba(94,106,210,0.12)',
                          color: isBetter ? 'var(--success)' : 'var(--primary)',
                        }}>
                          {isBetter ? 'Choisir le barème' : 'Rester au PFU'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 18px', borderLeft: '3px solid #e67e22' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#e67e22', marginBottom: 6 }}>
            Nuance : dividendes d'actions françaises
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            L'abattement de 40 % sur les dividendes d'actions françaises ne s'applique{' '}
            <em>qu'avec</em> l'option pour le barème. Dans certains cas très spécifiques,
            cet abattement peut partiellement compenser un TMI plus élevé — mais ce n'est pas
            une règle générale qui inverserait les recommandations du tableau.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Comparateur interactif — sélectionne ta TMI</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {TMI_PALIERS.map((p, i) => (
              <button
                key={p.tmi}
                onClick={() => setSelectedIdx(i)}
                style={{
                  padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid', fontFamily: 'var(--font-mono)',
                  background: selectedIdx === i ? '#e67e22' : 'var(--surface-3)',
                  color: selectedIdx === i ? '#fff' : 'var(--ink-subtle)',
                  borderColor: selectedIdx === i ? '#e67e22' : 'var(--hairline)',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{
              padding: '16px 18px', borderRadius: 10,
              background: pfuBetter ? 'rgba(76,183,130,0.08)' : 'var(--surface-3)',
              border: `2px solid ${pfuBetter ? 'var(--success)' : 'var(--hairline)'}`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 8 }}>PFU (défaut)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: pfuBetter ? 'var(--success)' : 'var(--ink-muted)' }}>
                30,0 %
              </div>
              {pfuBetter && (
                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6, fontWeight: 600 }}>
                  ✓ Recommandé à TMI {palier.label}
                </div>
              )}
            </div>
            <div style={{
              padding: '16px 18px', borderRadius: 10,
              background: baremeBetter ? 'rgba(76,183,130,0.08)' : 'var(--surface-3)',
              border: `2px solid ${baremeBetter ? 'var(--success)' : 'var(--hairline)'}`,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink-subtle)', marginBottom: 8 }}>Barème + PS (TMI {palier.label})</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 800, color: baremeBetter ? 'var(--success)' : 'var(--danger)' }}>
                {fmtPct(palier.baremePlusPS)}
              </div>
              {baremeBetter && (
                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 6, fontWeight: 600 }}>
                  ✓ Recommandé à TMI {palier.label}
                </div>
              )}
            </div>
          </div>
          {palier.tmi === 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(76,183,130,0.08)', fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
              À TMI 0 %, seuls les prélèvements sociaux (17,2 %) s'appliquent avec le barème — contre 30 % pour le PFU.
              C'est l'écart maximum possible : 12,8 % d'économie sur chaque euro de gain imposé.
            </div>
          )}
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — PFU vs barème</h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>💶</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 1 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Le PFU de 30 % est le régime par défaut. Aux TMI 0 % et 11 %, le barème progressif est
          plus avantageux. Rappelle-toi : l'option est globale — elle s'applique à tous tes revenus
          du capital pour l'année entière.
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

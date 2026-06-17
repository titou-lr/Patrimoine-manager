import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen, type QuizQuestion } from './QuizScreen'

interface Position {
  id: string
  name: string
  gain: number
}

const POSITIONS: Position[] = [
  { id: 'a', name: 'ETF MSCI World (Amundi)',         gain:  3200 },
  { id: 'b', name: 'ETF MSCI World (BNP Paribas)',    gain:  -800 },
  { id: 'c', name: 'Apple Inc.',                       gain:  1800 },
  { id: 'd', name: 'SolarEdge Technologies',           gain: -1500 },
  { id: 'e', name: 'iShares Core S&P 500',            gain:   900 },
  { id: 'f', name: 'Atos SE',                          gain: -2100 },
]

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Qu'est-ce que le tax-loss harvesting, en une phrase ?",
    options: [
      "Une stratégie pour éviter totalement de payer des impôts sur ses gains",
      "Matérialiser des moins-values latentes pour les imputer sur des plus-values et réduire l'assiette imposable",
      "Un crédit d'impôt automatique sur les pertes boursières",
      "Une exonération fiscale réservée aux PEA",
    ],
    correct: 1,
    explanation:
      "Le tax-loss harvesting consiste à vendre des positions en perte avant la fin de l'année pour constater ces pertes fiscalement — elles viennent ensuite réduire les plus-values imposables.",
  },
  {
    text: "Tu as 3 000 € de plus-values réalisées et 1 200 € de moins-values latentes sur ton CTO cette année. Si tu matérialises ces moins-values avant le 31 décembre, quelle est ton assiette imposable ?",
    options: [
      "3 000 € — les moins-values latentes ne comptent pas",
      "1 800 € — plus-values moins moins-values imputées",
      "1 200 € — uniquement les moins-values",
      "4 200 € — l'addition des deux montants",
    ],
    correct: 1,
    explanation:
      "Les moins-values réalisées s'imputent directement sur les plus-values de même nature. 3 000 € − 1 200 € = 1 800 € d'assiette imposable, soit une économie de 1 200 € × 30 % = 360 € d'impôt.",
  },
  {
    text: "Peux-tu compenser une moins-value réalisée sur ton PEA avec une plus-value réalisée sur ton CTO la même année ?",
    options: [
      "Oui, sans aucune restriction",
      "Non — chaque enveloppe a sa propre étanchéité fiscale, impossible de compenser entre un PEA et un CTO",
      "Oui, mais seulement dans la limite de 1 000 €",
      "Oui, uniquement si le PEA a plus de 5 ans",
    ],
    correct: 1,
    explanation:
      "Les enveloppes fiscales (PEA, assurance-vie) sont étanches : les pertes à l'intérieur ne peuvent pas compenser les gains à l'extérieur. Le tax-loss harvesting ne s'applique qu'aux positions du CTO.",
  },
  {
    text: "Pendant combien d'années une moins-value non imputée dans l'année est-elle reportable sur les plus-values futures ?",
    options: [
      "3 ans",
      "5 ans",
      "10 ans",
      "Indéfiniment, sans limite de temps",
    ],
    correct: 2,
    explanation:
      "Les moins-values non utilisées dans l'année sont reportables pendant 10 ans. Si tu n'as pas assez de plus-values cette année pour les absorber, ne perds pas cet avantage — il s'appliquera aux prochaines années.",
  },
]

function fmtEur(v: number) {
  return (v >= 0 ? '+' : '') + Math.round(v).toLocaleString('fr-FR') + ' €'
}

export default function LessonT2TaxLoss({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [harvested, setHarvested] = useState<Set<string>>(new Set())

  function toggleHarvest(id: string) {
    setHarvested(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalGains = POSITIONS.filter(p => p.gain > 0).reduce((s, p) => s + p.gain, 0)
  const harvestedLosses = POSITIONS
    .filter(p => p.gain < 0 && harvested.has(p.id))
    .reduce((s, p) => s + Math.abs(p.gain), 0)
  const assietteBefore = totalGains
  const assietteAfter = Math.max(0, totalGains - harvestedLosses)
  const taxBefore = assietteBefore * 0.30
  const taxAfter = assietteAfter * 0.30
  const savings = taxBefore - taxAfter

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Tax-loss harvesting</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Une de tes lignes en CTO est en perte de 2 000 € depuis le début de l'année. Le réflexe
            naturel est de l'ignorer en espérant que ça remonte. Mais cette perte, si tu la{' '}
            <strong>« matérialises »</strong> avant le 31 décembre, peut activement réduire l'impôt
            que tu paies sur tes gains.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Le mécanisme</div>
          <div className="col" style={{ gap: 10 }}>
            {[
              {
                icon: '📉',
                title: 'Moins-values réalisées',
                desc: "En vendant une position en perte, tu « constates » la perte fiscalement. Elle devient imputable sur tes plus-values de même nature dans l'année.",
              },
              {
                icon: '🔄',
                title: 'Racheter un actif équivalent (pas identique)',
                desc: "Pour maintenir ton exposition au marché sans interruption, rachète un actif similaire — par exemple un autre ETF MSCI World d'un émetteur différent, pas le même ETF. L'objectif est d'éviter une vente-rachat purement artificielle du même titre.",
              },
              {
                icon: '📅',
                title: 'Report pendant 10 ans',
                desc: "Si tu n'as pas assez de plus-values cette année pour absorber toutes tes moins-values, le solde non utilisé est reportable sur les 10 années suivantes — ne perds pas cet avantage.",
              },
              {
                icon: '🔒',
                title: 'Étanchéité fiscale entre enveloppes',
                desc: "Les moins-values d'un PEA ou d'une assurance-vie ne peuvent jamais compenser les plus-values d'un CTO, et inversement. Le tax-loss harvesting ne s'applique qu'au sein du CTO.",
              },
            ].map(item => (
              <div key={item.icon} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Simulateur — ton CTO fin d'année</div>
          <p className="caption" style={{ marginBottom: 16 }}>
            Coche les positions en perte que tu veux récolter avant le 31 décembre.
          </p>

          <div className="col" style={{ gap: 8, marginBottom: 20 }}>
            {POSITIONS.map(pos => {
              const isLoss = pos.gain < 0
              const isSelected = harvested.has(pos.id)
              return (
                <div
                  key={pos.id}
                  onClick={isLoss ? () => toggleHarvest(pos.id) : undefined}
                  style={{
                    padding: '12px 14px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12,
                    border: `1px solid ${isLoss && isSelected ? 'var(--success)' : 'var(--hairline)'}`,
                    background: isLoss && isSelected ? 'rgba(76,183,130,0.07)' : 'var(--surface-2)',
                    cursor: isLoss ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  {isLoss ? (
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: '2px solid',
                      borderColor: isSelected ? 'var(--success)' : 'var(--hairline)',
                      background: isSelected ? 'var(--success)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>✓</span>}
                    </div>
                  ) : (
                    <div style={{ width: 18, height: 18, flexShrink: 0 }} />
                  )}
                  <span className="grow" style={{ fontSize: 13 }}>{pos.name}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600,
                    color: pos.gain > 0 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {fmtEur(pos.gain)}
                  </span>
                  {isLoss && (
                    <span style={{ fontSize: 11, color: isSelected ? 'var(--success)' : 'var(--ink-muted)', fontWeight: 600 }}>
                      {isSelected ? 'Récoltée' : 'À récolter'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              {
                label: 'Plus-values totales',
                val: `+${Math.round(assietteBefore).toLocaleString('fr-FR')} €`,
                color: 'var(--success)',
              },
              {
                label: 'Moins-values récoltées',
                val: harvestedLosses > 0 ? `−${Math.round(harvestedLosses).toLocaleString('fr-FR')} €` : '0 €',
                color: harvestedLosses > 0 ? 'var(--primary)' : 'var(--ink-muted)',
              },
              {
                label: 'Assiette imposable',
                val: `${Math.round(assietteAfter).toLocaleString('fr-FR')} €`,
                color: 'var(--ink)',
              },
            ].map(r => (
              <div key={r.label} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: r.color, marginBottom: 4 }}>{r.val}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-subtle)' }}>{r.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 8, background: savings > 0 ? 'rgba(76,183,130,0.08)' : 'var(--surface-3)' }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-subtle)', marginBottom: 4 }}>Impôt PFU 30 % — sans harvesting</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--danger)' }}>
                  −{Math.round(taxBefore).toLocaleString('fr-FR')} €
                </div>
              </div>
              <div style={{ fontSize: 18, color: 'var(--ink-muted)' }}>→</div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-subtle)', marginBottom: 4 }}>Impôt — après harvesting</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: savings > 0 ? 'var(--success)' : 'var(--danger)' }}>
                  −{Math.round(taxAfter).toLocaleString('fr-FR')} €
                </div>
              </div>
              {savings > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--success)', marginBottom: 4 }}>Économie</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>
                    +{Math.round(savings).toLocaleString('fr-FR')} €
                  </div>
                </div>
              )}
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Tax-loss harvesting</h2>
          <p className="caption">4 questions · 4/4 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>🌾</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 2 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          Le tax-loss harvesting transforme les pertes latentes en économies d'impôt concrètes.
          Les moins-values se reportent jusqu'à 10 ans — et restent cantonnées au CTO,
          loin des enveloppes fiscales comme le PEA ou l'AV.
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

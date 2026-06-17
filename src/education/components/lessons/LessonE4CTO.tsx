import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Tu veux investir dans un ETF qui réplique le S&P500 (indice américain) sur 15 ans. Le PEA pose-t-il un problème ?",
    options: [
      "Oui, le PEA est limité aux actions de la zone euro uniquement",
      "Non, tous les ETF sont éligibles au PEA sans restriction",
      "Non, les ETF synthétiques répliquant des indices hors UE sont éligibles au PEA",
      "Oui, les ETF sont interdits dans un PEA",
    ],
    correct: 2,
    explanation:
      "Les ETF synthétiques utilisent des swaps pour répliquer des indices hors UE (S&P500, Nasdaq, MSCI World…) tout en restant investis en actions UE. Ils sont éligibles au PEA — c'est une des astuces les plus utiles de la fiscalité française.",
  },
  {
    text: "Tu as atteint le plafond de 150 000 € de ton PEA. Tu veux continuer à investir en ETF monde. Quelle est la prochaine enveloppe logique ?",
    options: [
      "Ouvrir un deuxième PEA",
      "L'assurance-vie, qui n'a pas de plafond de versements",
      "Attendre que le plafond PEA augmente",
      "Investir directement en CTO pour éviter les frais d'AV",
    ],
    correct: 1,
    explanation:
      "Il est impossible d'avoir deux PEA en France (un par personne). L'assurance-vie en unités de compte est la suite naturelle : sans plafond, accès aux ETF monde, et avantages fiscaux à terme. Le CTO reste une option mais sans avantage fiscal.",
  },
  {
    text: "Tu es cadre supérieur à 41 % de TMI. Tu veux réduire ta facture fiscale cette année. Quelle enveloppe activer en priorité ?",
    options: [
      "PEA — meilleure fiscalité long terme",
      "CTO — plus de liberté d'investissement",
      "AV — avantage successoral important",
      "PER — déduction immédiate du revenu imposable",
    ],
    correct: 3,
    explanation:
      "À 41 % de TMI, verser sur un PER génère une économie de 41 cents pour chaque euro versé. C'est l'effet levier fiscal le plus immédiat disponible. Le PEA et l'AV agissent à la sortie — pas cette année.",
  },
  {
    text: "Tu veux transmettre 300 000 € à tes deux enfants en minimisant les droits de succession. Quelle enveloppe est la plus adaptée ?",
    options: [
      "PEA — exonération IR après 5 ans",
      "CTO — pas de contraintes",
      "Assurance-vie — 152 500 € d'abattement par bénéficiaire hors succession",
      "PER — déductibilité des versements",
    ],
    correct: 2,
    explanation:
      "Avec deux enfants et 152 500 € d'abattement chacun, 305 000 € peuvent être transmis hors droits de succession via l'AV. Le PEA et le CTO font partie de la succession civile — soumis aux droits de succession classiques.",
  },
  {
    text: "Dans quel ordre optimal faut-il ouvrir et utiliser ses enveloppes ?",
    options: [
      "PER → PEA → AV → CTO",
      "CTO → PEA → AV → PER",
      "PEA + AV simultané → remplir PEA → AV diversification → PER si TMI ≥ 30 % → CTO en dernier",
      "AV → PER → PEA → CTO",
    ],
    correct: 2,
    explanation:
      "Ouvrir PEA et AV ensemble le plus tôt possible pour activer les horloges fiscales de 5 et 8 ans. Remplir le PEA en priorité pour les actions, utiliser l'AV pour la diversification et la transmission, activer le PER si TMI ≥ 30 %, et le CTO en dernier recours.",
  },
]

type EnvelopeRow = {
  name: string
  plafond: { val: string; level: 'good' | 'mid' | 'bad' }
  actifs: { val: string; level: 'good' | 'mid' | 'bad' }
  fiscal: { val: string; level: 'good' | 'mid' | 'bad' }
  liquidite: { val: string; level: 'good' | 'mid' | 'bad' }
  succession: { val: string; level: 'good' | 'mid' | 'bad' }
  priorite: { val: string; level: 'good' | 'mid' | 'bad' }
}

const ENVELOPES: EnvelopeRow[] = [
  {
    name: 'PEA',
    plafond:    { val: '150 000 €', level: 'mid' },
    actifs:     { val: 'Actions UE + ETF synthétiques', level: 'mid' },
    fiscal:     { val: 'IR 0 % après 5 ans (PS 17,2 %)', level: 'good' },
    liquidite:  { val: 'Faible < 5 ans', level: 'bad' },
    succession: { val: '✗ Héritage classique', level: 'bad' },
    priorite:   { val: '1 — Actions long terme', level: 'good' },
  },
  {
    name: 'AV',
    plafond:    { val: 'Illimité', level: 'good' },
    actifs:     { val: 'UC + fonds euros', level: 'good' },
    fiscal:     { val: 'Abatt. 4 600 €/an après 8 ans', level: 'good' },
    liquidite:  { val: 'Libre à tout moment', level: 'good' },
    succession: { val: '✓ 152 500 €/bénéf hors succes.', level: 'good' },
    priorite:   { val: '2 — Diversif. + transmission', level: 'good' },
  },
  {
    name: 'PER',
    plafond:    { val: 'Illimité (déduction plafonnée)', level: 'good' },
    actifs:     { val: 'UC + fonds euros', level: 'good' },
    fiscal:     { val: 'Déduction entrée selon TMI', level: 'good' },
    liquidite:  { val: '✗ Bloqué jusqu\'à la retraite', level: 'bad' },
    succession: { val: 'Partiel (≤ 70 ans)', level: 'mid' },
    priorite:   { val: '3 — Si TMI ≥ 30 %', level: 'mid' },
  },
  {
    name: 'CTO',
    plafond:    { val: 'Illimité', level: 'good' },
    actifs:     { val: 'Tout — actions, ETF, crypto, options…', level: 'good' },
    fiscal:     { val: '✗ PFU 30 % à chaque cession', level: 'bad' },
    liquidite:  { val: 'Libre à tout moment', level: 'good' },
    succession: { val: '✗ Héritage classique', level: 'bad' },
    priorite:   { val: '4 — Dernier recours', level: 'bad' },
  },
]

const LEVEL_STYLE: Record<'good' | 'mid' | 'bad', { color: string; bg: string }> = {
  good: { color: 'var(--success)', bg: 'rgba(76,183,130,0.08)' },
  mid:  { color: '#f5a623',        bg: 'rgba(245,166,35,0.08)' },
  bad:  { color: 'var(--danger)',  bg: 'rgba(235,87,87,0.08)' },
}

const CRITERIA = [
  { key: 'plafond', label: 'Plafond' },
  { key: 'actifs', label: 'Actifs' },
  { key: 'fiscal', label: 'Avantage fiscal' },
  { key: 'liquidite', label: 'Liquidité' },
  { key: 'succession', label: 'Succession' },
  { key: 'priorite', label: 'Priorité' },
] as const

const STRATEGY_STEPS = [
  {
    step: 1,
    title: 'Ouvrir PEA + AV simultanément',
    detail: 'Même vides — activer les horloges fiscales des 5 ans (PEA) et 8 ans (AV) immédiatement',
    color: 'var(--primary)',
  },
  {
    step: 2,
    title: 'Remplir le PEA en priorité',
    detail: 'Meilleure fiscalité long terme sur les actions — viser les 150 000 €',
    color: '#4cb782',
  },
  {
    step: 3,
    title: 'Utiliser l\'AV pour diversifier',
    detail: 'Fonds euros, SCPI, UC internationales — et préparer la transmission',
    color: '#8b6bd2',
  },
  {
    step: 4,
    title: 'Activer le PER si TMI ≥ 30 %',
    detail: 'Réduction fiscale immédiate — pari sur une TMI plus faible à la retraite',
    color: '#f5a623',
  },
  {
    step: 5,
    title: 'CTO en dernier recours',
    detail: 'Pour les actifs non éligibles ailleurs (crypto, options) ou une fois les plafonds atteints',
    color: 'var(--danger)',
  },
]

export default function LessonE4CTO({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>
          Le CTO et la stratégie multi-enveloppes
        </h2>

        {/* Intro CTO par contraste */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Après trois enveloppes avec des règles, des plafonds et des avantages fiscaux spécifiques,
            le CTO est l'anti-thèse : <strong>aucune contrainte, aucun plafond, accès à tous les marchés mondiaux</strong>.
            En contrepartie : <strong style={{ color: 'var(--danger)' }}>aucun avantage fiscal</strong>.
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)' }}>
            C'est l'enveloppe de <strong style={{ color: 'var(--ink)' }}>dernier recours</strong> — utile quand
            les autres sont pleines ou insuffisantes pour ce qu'on veut faire. Le PFU de 30 % s'applique
            sur chaque cession réalisée, sans effet de capitalisation fiscale.
          </p>
        </div>

        {/* Tableau comparatif */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Comparatif — 4 enveloppes × 6 critères</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hairline-strong)' }}>
                  <th style={{
                    padding: '8px 10px', textAlign: 'left',
                    color: 'var(--ink-subtle)', fontWeight: 600, fontSize: 11,
                    whiteSpace: 'nowrap', width: 80,
                  }}>
                    Critère
                  </th>
                  {ENVELOPES.map(e => (
                    <th key={e.name} style={{
                      padding: '8px 10px', textAlign: 'left',
                      color: 'var(--ink)', fontWeight: 700, fontSize: 12,
                    }}>
                      {e.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map(c => (
                  <tr key={c.key} style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
                    <td style={{
                      padding: '9px 10px', fontSize: 11, fontWeight: 600,
                      color: 'var(--ink-subtle)', whiteSpace: 'nowrap', verticalAlign: 'top',
                    }}>
                      {c.label}
                    </td>
                    {ENVELOPES.map(e => {
                      const cell = e[c.key]
                      const s = LEVEL_STYLE[cell.level]
                      return (
                        <td key={e.name} style={{ padding: '9px 10px', verticalAlign: 'top' }}>
                          <span style={{
                            display: 'inline-block', fontSize: 11, padding: '3px 7px',
                            borderRadius: 5, background: s.bg, color: s.color,
                            lineHeight: 1.5,
                          }}>
                            {cell.val}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ordre optimal */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Ordre optimal d'utilisation</div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-subtle)', lineHeight: 1.6 }}>
            La vraie question n'est pas quoi investir, mais{' '}
            <strong style={{ color: 'var(--ink)' }}>où</strong> investir —
            c'est souvent cette décision qui détermine le rendement net final.
          </p>
          <div className="col" style={{ gap: 8 }}>
            {STRATEGY_STEPS.map(s => (
              <div key={s.step} style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 14px', borderRadius: 8, background: 'var(--surface-3)',
                borderLeft: `3px solid ${s.color}`,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: s.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-subtle)', lineHeight: 1.5 }}>{s.detail}</div>
                </div>
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
            QCM situationnel — Quelle enveloppe choisir ?
          </h2>
          <p className="caption">5 questions · 5/5 obligatoire pour valider le module.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>🎯</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 4 complétée !</div>
        <p className="caption" style={{ maxWidth: 460, lineHeight: 1.7, margin: 0 }}>
          Tu maîtrises maintenant les 4 enveloppes fiscales françaises et l'ordre optimal pour les utiliser.
          PEA pour les actions, AV pour la diversification et la transmission, PER pour réduire les impôts
          aujourd'hui, et CTO quand tout le reste est plein.
        </p>
        <button
          onClick={onComplete}
          style={{
            display: 'inline-flex', alignItems: 'center', height: 42, padding: '0 28px',
            borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            background: 'var(--success)', color: '#fff', marginTop: 8,
          }}
        >
          Valider et terminer le Module 3
        </button>
        <span className="caption">Le Module 4 sera déverrouillé.</span>
      </div>
    </LessonShell>
  )
}

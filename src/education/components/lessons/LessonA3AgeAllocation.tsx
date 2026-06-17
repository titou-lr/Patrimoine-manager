import { useState } from 'react'
import { LessonShell } from './LessonShell'
import { QuizScreen } from './QuizScreen'
import type { QuizQuestion } from './QuizScreen'

const QUESTIONS: QuizQuestion[] = [
  {
    text: "Selon la règle moderne (âge − 10), quelle part d'obligations est recommandée pour un investisseur de 45 ans ?",
    options: ['45 %', '35 %', '55 %', '25 %'],
    correct: 1,
    explanation:
      "Règle moderne : obligations ≈ âge − 10 = 45 − 10 = 35 %. La règle classique (obligations ≈ âge) aurait donné 45 %. La règle moderne laisse plus de place aux actions pour compenser une espérance de vie plus longue.",
  },
  {
    text: "Pourquoi les règles modernes recommandent-elles moins d'obligations que la règle classique ?",
    options: [
      "Les obligations sont devenues trop risquées",
      "L'espérance de vie a augmenté — un retraité a encore 25–30 ans d'horizon devant lui",
      "Les actions sont devenues moins volatiles",
      "Les règles classiques étaient conçues pour des portefeuilles plus grands",
    ],
    correct: 1,
    explanation:
      "Un retraité de 65 ans a en moyenne encore 20–25 ans devant lui. Rester trop défensif dès 40 ans sacrifie du rendement sur plusieurs décennies. L'horizon long justifie une part d'actions plus élevée qu'avec l'ancienne règle.",
  },
  {
    text: "Un investisseur de 30 ans avec un profil prudent devrait-il suivre aveuglément la règle des 100 − âge ?",
    options: [
      "Oui, c'est la règle standard à suivre absolument",
      "Non — la règle est un point de départ, le profil investisseur et les objectifs personnels restent prioritaires",
      "Oui, mais uniquement s'il a plus de 50 000 € investis",
      "Non, cette règle ne s'applique qu'aux retraités",
    ],
    correct: 1,
    explanation:
      "Les règles d'âge sont des heuristiques (points de départ), pas des lois. Un investisseur de 30 ans très prudent ou avec un horizon court (achat immobilier dans 3 ans) doit adapter son allocation à son profil réel — comme vu en Leçon 4 du Module 1.",
  },
]

const COLORS = {
  actions:     '#5e6ad2',
  immo:        '#8b6bd2',
  obligations: '#4cb782',
  cash:        '#6c8cd5',
}

interface AllocSlice { key: string; label: string; value: number; color: string }

function computeAlloc(age: number, modern: boolean): AllocSlice[] {
  const equityPct = modern ? Math.min(100, 110 - age) : Math.max(0, 100 - age)
  const bondsPct  = 100 - equityPct

  const actions    = Math.round(equityPct * 0.8)
  const immo       = equityPct - actions
  const obligations = Math.round(bondsPct * 0.85)
  const cash       = bondsPct - obligations

  return [
    { key: 'actions',     label: 'Actions',     value: actions,     color: COLORS.actions },
    { key: 'immo',        label: 'Immo',         value: immo,        color: COLORS.immo },
    { key: 'obligations', label: 'Obligations',  value: obligations, color: COLORS.obligations },
    { key: 'cash',        label: 'Cash',         value: cash,        color: COLORS.cash },
  ].filter(s => s.value > 0)
}

function AllocationBar({ slices, label, subtitle }: { slices: AllocSlice[]; label: string; subtitle: string }) {
  return (
    <div className="col" style={{ flex: 1, gap: 0 }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-subtle)', marginTop: 2 }}>
          {subtitle}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', height: 180, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
        {slices.map(s => (
          <div
            key={s.key}
            style={{
              background: s.color,
              height: `${s.value}%`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
              opacity: 0.88,
              transition: 'height 0.35s cubic-bezier(0.4,0,0.2,1)',
              minHeight: s.value > 0 ? 2 : 0,
            }}
          >
            {s.value >= 9 && `${s.value} %`}
          </div>
        ))}
      </div>
      <div className="col" style={{ gap: 3, marginTop: 10 }}>
        {slices.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'var(--ink-subtle)', flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {s.value} %
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LessonA3AgeAllocation({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [age, setAge] = useState(35)

  const classicEquity = Math.max(0, 100 - age)
  const modernEquity  = Math.min(100, 110 - age)
  const classicSlices = computeAlloc(age, false)
  const modernSlices  = computeAlloc(age, true)
  const actionsGap    = modernSlices.find(s => s.key === 'actions')!.value -
                        classicSlices.find(s => s.key === 'actions')!.value

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Allocation selon l'âge</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Imagine que tu aies <strong>62 ans</strong> et que les marchés chutent de 40 %. Tu as
            3 ans avant la retraite — <em>pas le temps de récupérer</em> cette perte avant d'en avoir
            besoin. Si tu as <strong>32 ans</strong>, ce même krach est une opportunité : tu achètes
            moins cher et attends la reprise.
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6 }}>
            C'est le <strong>risque de séquence</strong> : une mauvaise performance au mauvais
            moment peut être catastrophique. L'âge change fondamentalement la tolérance aux pertes.
          </p>
        </div>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Les deux règles d'allocation</div>
          <div className="col" style={{ gap: 10 }}>
            {[
              {
                label:   'Règle classique (100 − âge)',
                formula: 'obligations ≈ âge %',
                ex:      `À 45 ans : 45 % oblig. / 55 % actions`,
                border:  'var(--hairline-strong)',
                color:   'var(--ink-muted)',
              },
              {
                label:   'Règle moderne (110 − âge)',
                formula: 'obligations ≈ (âge − 10) %',
                ex:      `À 45 ans : 35 % oblig. / 65 % actions`,
                border:  'var(--primary)',
                color:   'var(--primary)',
              },
            ].map(r => (
              <div key={r.label} style={{
                padding: '12px 16px', background: 'var(--surface-3)', borderRadius: 8,
                borderLeft: `3px solid ${r.border}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: r.color, marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--primary)', marginBottom: 3 }}>
                  {r.formula}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>{r.ex}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--ink-subtle)', fontStyle: 'italic' }}>
            La règle moderne compense l'allongement de l'espérance de vie : un retraité de 65 ans
            a encore 20–25 ans devant lui. Rester trop défensif trop tôt coûte en rendement.
          </p>
        </div>

        {/* Interactive age timeline */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
            <div className="eyebrow">Comparatif règles classique vs moderne</div>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="caption">Âge :</span>
              <input
                type="range" min={20} max={70} step={1} value={age}
                onChange={e => setAge(Number(e.target.value))}
                style={{ width: 110 }}
              />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, minWidth: 26 }}>
                {age}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <AllocationBar
              slices={classicSlices}
              label="Règle classique"
              subtitle={`${classicEquity} % actions / ${100 - classicEquity} % oblig.`}
            />
            <AllocationBar
              slices={modernSlices}
              label="Règle moderne"
              subtitle={`${modernEquity} % actions / ${100 - modernEquity} % oblig.`}
            />
          </div>

          <div style={{
            marginTop: 16, padding: '9px 14px', background: 'var(--surface-3)', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>
              La règle moderne recommande
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
              +{actionsGap} %
            </span>
            <span style={{ fontSize: 12, color: 'var(--ink-subtle)' }}>
              d'actions supplémentaires.
            </span>
          </div>
        </div>

        <div className="panel" style={{ padding: '14px 18px', borderLeft: '3px solid var(--primary)' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
            <strong>Limite importante :</strong> ces règles sont des points de départ, pas des
            vérités absolues. Ton profil investisseur, ton horizon réel et ta tolérance au risque
            (Module 1) restent prioritaires sur toute règle mécanique.
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
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>QCM — Allocation selon l'âge</h2>
          <p className="caption">3 questions · 3/3 obligatoire pour valider la leçon.</p>
        </div>
        <QuizScreen questions={QUESTIONS} onPass={() => setScreen('result')} />
      </LessonShell>
    )
  }

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 16, alignItems: 'center', textAlign: 'center', padding: '32px 0' }}>
        <div style={{ fontSize: 44 }}>📅</div>
        <div className="title" style={{ fontSize: 20 }}>Leçon 3 complétée !</div>
        <p className="caption" style={{ maxWidth: 440, lineHeight: 1.7, margin: 0 }}>
          L'âge influence l'allocation mais ne la détermine pas seul. Les règles classiques et
          modernes sont des boussoles — ton profil de risque et tes objectifs personnels restent
          le Nord véritable.
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

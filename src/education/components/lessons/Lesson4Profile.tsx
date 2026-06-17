import { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { LessonShell } from './LessonShell'

// ── Data ──────────────────────────────────────────────────────────────────────

interface ProfileOption {
  text: string
  points: number
}

interface ProfileQuestion {
  text: string
  options: ProfileOption[]
}

const QUESTIONS: ProfileQuestion[] = [
  {
    text: "Quel est ton horizon de placement principal ?",
    options: [
      { text: 'Moins de 3 ans', points: 1 },
      { text: '3 à 8 ans', points: 2 },
      { text: '8 à 15 ans', points: 3 },
      { text: 'Plus de 15 ans', points: 4 },
    ],
  },
  {
    text: "Si ton portefeuille perd 20 % en 1 mois, tu...",
    options: [
      { text: 'Vends tout immédiatement', points: 1 },
      { text: "T'inquiètes mais tu attends", points: 2 },
      { text: "Restes calme, c'est temporaire", points: 3 },
      { text: 'En rachètes davantage', points: 4 },
    ],
  },
  {
    text: "Quelle perte maximale pourrais-tu supporter sans paniquer ?",
    options: [
      { text: '5 %', points: 1 },
      { text: '15 %', points: 2 },
      { text: '30 %', points: 3 },
      { text: 'Plus de 40 %', points: 4 },
    ],
  },
  {
    text: "Ton objectif principal ?",
    options: [
      { text: 'Protéger mon capital avant tout', points: 1 },
      { text: 'Croissance modérée et stable', points: 2 },
      { text: "Croissance forte, j'accepte la volatilité", points: 3 },
      { text: 'Maximiser le rendement à tout prix', points: 4 },
    ],
  },
  {
    text: "Quelle part de ton épargne globale investis-tu ?",
    options: [
      { text: 'Moins de 10 %', points: 1 },
      { text: '10 à 30 %', points: 2 },
      { text: '30 à 60 %', points: 3 },
      { text: 'Plus de 60 %', points: 4 },
    ],
  },
]

interface AllocSlice {
  label: string
  value: number
  color: string
}

interface ProfileData {
  name: string
  emoji: string
  scoreRange: string
  description: string
  color: string
  allocation: AllocSlice[]
}

const PROFILES: Record<string, ProfileData> = {
  prudent: {
    name: 'Prudent',
    emoji: '🛡️',
    scoreRange: '5–8 points',
    description:
      "Tu privilégies la sécurité avant tout. Ton portefeuille est bien protégé contre les crises, mais la croissance sera limitée. Idéal pour un horizon court (< 5 ans) ou une très faible tolérance au risque.",
    color: '#4cb782',
    allocation: [
      { label: 'Obligations / Livrets', value: 80, color: '#6c8cd5' },
      { label: 'Actions', value: 20, color: '#5e6ad2' },
    ],
  },
  equilibre: {
    name: 'Équilibré',
    emoji: '⚖️',
    scoreRange: '9–12 points',
    description:
      "Tu cherches un juste milieu entre sécurité et performance. Ton portefeuille supporte des corrections modérées (−20 %) en échange d'une croissance stable sur 5–10 ans.",
    color: '#5e6ad2',
    allocation: [
      { label: 'Obligations', value: 50, color: '#6c8cd5' },
      { label: 'Actions', value: 40, color: '#5e6ad2' },
      { label: 'Immobilier', value: 10, color: '#8b6bd2' },
    ],
  },
  dynamique: {
    name: 'Dynamique',
    emoji: '🚀',
    scoreRange: '13–16 points',
    description:
      "Tu acceptes la volatilité pour viser une forte croissance. Ton portefeuille est majoritairement en actions, avec un horizon de 8–15 ans pour lisser les cycles de marché.",
    color: '#f5a623',
    allocation: [
      { label: 'Actions', value: 65, color: '#5e6ad2' },
      { label: 'Obligations', value: 25, color: '#6c8cd5' },
      { label: 'Immobilier', value: 10, color: '#8b6bd2' },
    ],
  },
  offensif: {
    name: 'Offensif',
    emoji: '⚡',
    scoreRange: '17–20 points',
    description:
      "Tu maximises le rendement long terme, quitte à traverser des baisses de 40 % ou plus. Ce profil exige une discipline de fer, un horizon de 15+ ans et la certitude de ne jamais avoir besoin de cet argent à court terme.",
    color: '#eb5757',
    allocation: [
      { label: 'Actions', value: 85, color: '#5e6ad2' },
      { label: 'Immobilier', value: 10, color: '#8b6bd2' },
      { label: 'Alternatif', value: 5, color: '#e2b550' },
    ],
  },
}

function getProfileKey(score: number): string {
  if (score <= 8) return 'prudent'
  if (score <= 12) return 'equilibre'
  if (score <= 16) return 'dynamique'
  return 'offensif'
}

const PROFILE_TABLE = [
  { profile: 'Prudent', alloc: '20 % actions / 80 % oblig.–cash', horizon: '< 5 ans', color: '#4cb782' },
  { profile: 'Équilibré', alloc: '40 % actions / 50 % oblig. / 10 % immo', horizon: '5–10 ans', color: '#5e6ad2' },
  { profile: 'Dynamique', alloc: '65 % actions / 25 % oblig. / 10 % immo', horizon: '8–15 ans', color: '#f5a623' },
  { profile: 'Offensif', alloc: '85 % actions / 10 % immo / 5 % alt.', horizon: '15+ ans', color: '#eb5757' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Lesson4Profile({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack: () => void
}) {
  const [screen, setScreen] = useState<'content' | 'quiz' | 'result'>('content')
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null))
  const [profile, setProfile] = useState<string | null>(null)

  const allAnswered = answers.every(a => a !== null)

  function pick(qi: number, oi: number) {
    setAnswers(prev => { const n = [...prev]; n[qi] = oi; return n })
  }

  function computeProfile() {
    let score = 0
    answers.forEach((a, i) => {
      if (a !== null) score += QUESTIONS[i].options[a].points
    })
    setProfile(getProfileKey(score))
    setScreen('result')
  }

  // ── Content ──────────────────────────────────────────────────────────────

  if (screen === 'content') {
    return (
      <LessonShell step={1} totalSteps={3} onBack={onBack} backLabel="← Retour aux leçons">
        <h2 className="title" style={{ fontSize: 20, marginTop: 4 }}>Ton profil investisseur</h2>

        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14 }}>
            Il n'existe pas de portefeuille universel. Ton profil investisseur est le reflet de{' '}
            <strong>ta tolérance au risque, ton horizon et tes objectifs</strong>. Un profil mal
            calibré conduit soit à prendre trop de risques (et vendre au pire moment lors d'une crise),
            soit à rester trop prudent (et sacrifier du rendement sur la durée).
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 14, lineHeight: 1.6, color: 'var(--ink-subtle)', fontStyle: 'italic' }}>
            Réponds honnêtement — le résultat guidera toute ta stratégie d'investissement.
          </p>
        </div>

        {/* Tableau des 4 profils */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>Les 4 profils types</div>
          <div className="col" style={{ gap: 0 }}>
            {PROFILE_TABLE.map((row, i) => (
              <div
                key={row.profile}
                className="row"
                style={{
                  gap: 12, padding: '10px 0',
                  borderBottom: i < PROFILE_TABLE.length - 1 ? '1px solid var(--hairline-soft)' : 'none',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: 2, background: row.color, flexShrink: 0,
                }} />
                <div style={{ flex: '0 0 90px', fontSize: 13, fontWeight: 600, color: row.color }}>
                  {row.profile}
                </div>
                <div className="caption" style={{ flex: 1, fontSize: 11.5 }}>{row.alloc}</div>
                <div className="caption" style={{ fontSize: 11, flexShrink: 0, color: 'var(--ink-muted)' }}>
                  {row.horizon}
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
            Passer au questionnaire →
          </button>
        </div>
      </LessonShell>
    )
  }

  // ── Questionnaire ─────────────────────────────────────────────────────────

  if (screen === 'quiz') {
    return (
      <LessonShell step={2} totalSteps={3} onBack={() => setScreen('content')} backLabel="← Retour au contenu">
        <div>
          <h2 className="title" style={{ fontSize: 20, marginTop: 4, marginBottom: 4 }}>
            Questionnaire de profiling
          </h2>
          <p className="caption">5 questions · réponds honnêtement pour un résultat pertinent.</p>
        </div>

        <div className="col" style={{ gap: 16 }}>
          {QUESTIONS.map((q, qi) => (
            <div key={qi} className="panel" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12, lineHeight: 1.5 }}>
                {qi + 1}. {q.text}
              </div>
              <div className="col" style={{ gap: 7 }}>
                {q.options.map((opt, oi) => {
                  const sel = answers[qi] === oi
                  return (
                    <button
                      key={oi}
                      onClick={() => pick(qi, oi)}
                      style={{
                        textAlign: 'left', padding: '9px 13px', borderRadius: 8, fontSize: 13,
                        cursor: 'pointer',
                        border: `1px solid ${sel ? 'var(--primary)' : 'var(--hairline)'}`,
                        background: sel ? 'rgba(94,106,210,0.12)' : 'var(--surface-2)',
                        color: 'var(--ink)',
                        transition: 'all 0.12s',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, marginRight: 8, opacity: 0.6 }}>
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {opt.text}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button
            onClick={computeProfile}
            disabled={!allAnswered}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 20px',
              borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500,
              cursor: allAnswered ? 'pointer' : 'not-allowed',
              background: allAnswered ? 'var(--primary)' : 'var(--surface-3)',
              color: allAnswered ? '#fff' : 'var(--ink-muted)',
            }}
          >
            Voir mon profil →
          </button>
        </div>
      </LessonShell>
    )
  }

  // ── Résultat de profil ────────────────────────────────────────────────────

  const profileData = profile ? PROFILES[profile] : null
  if (!profileData) return null

  return (
    <LessonShell step={3} totalSteps={3}>
      <div className="col" style={{ gap: 20 }}>
        {/* Profile header */}
        <div className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 8 }}>
          <div style={{ fontSize: 48 }}>{profileData.emoji}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2, background: profileData.color,
            }} />
            <span className="title" style={{ fontSize: 22, color: profileData.color }}>
              {profileData.name}
            </span>
          </div>
          <span className="caption">{profileData.scoreRange}</span>
        </div>

        {/* Description */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <p style={{ margin: 0, lineHeight: 1.75, fontSize: 14, textAlign: 'center' }}>
            {profileData.description}
          </p>
        </div>

        {/* Donut + légende */}
        <div className="panel" style={{ padding: '18px 22px' }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Allocation type</div>
          <div className="row" style={{ gap: 24, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ width: 160, height: 160, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={profileData.allocation}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                  >
                    {profileData.allocation.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {profileData.allocation.map(s => (
                <div key={s.label} className="row" style={{ gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13 }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginLeft: 'auto' }}>
                    {s.value} %
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="col" style={{ alignItems: 'center', gap: 8 }}>
          <button
            onClick={onComplete}
            style={{
              display: 'inline-flex', alignItems: 'center', height: 42, padding: '0 28px',
              borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: 'var(--success)', color: '#fff',
            }}
          >
            Valider et terminer le Module 1
          </button>
          <span className="caption">Le Module 2 sera déverrouillé.</span>
        </div>
      </div>
    </LessonShell>
  )
}

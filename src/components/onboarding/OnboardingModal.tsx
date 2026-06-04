import { useState } from 'react'
import NumberInput from '../ui/NumberInput'
import { formatEur } from '../../utils/format'

// ── Types ────────────────────────────────────────────────────────────────────

export type RiskProfile = 'prudent' | 'equilibre' | 'dynamique'
export type Objective = 'retirement' | 'capital' | 'property' | 'security'

export interface OnboardingResult {
  firstName: string
  ageActuel: number
  monthlySalary: number
  objective: Objective | null
  monthlyInvestment: number
  riskProfile: RiskProfile
  duration: number
  ageRetirement: number
}

interface Props {
  onComplete: (data: OnboardingResult) => void
  onSkip: () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6

const OBJECTIVES: { id: Objective; emoji: string; title: string; desc: string }[] = [
  { id: 'retirement', emoji: '🏖', title: 'Retraite anticipée', desc: 'Se libérer avant 60 ans' },
  { id: 'capital',    emoji: '📈', title: 'Construire un capital', desc: 'Faire fructifier votre épargne' },
  { id: 'property',   emoji: '🏠', title: 'Projet immobilier', desc: 'Préparer un achat ou investissement' },
  { id: 'security',   emoji: '🛡', title: 'Sécurité financière', desc: 'Constituer une réserve solide' },
]

const RISK_PROFILES: {
  id: RiskProfile; emoji: string; title: string; desc: string; alloc: string; ret: string
}[] = [
  {
    id: 'prudent',
    emoji: '🛡',
    title: 'Prudent',
    desc: 'Je préfère la sécurité. Livret A, fonds euros.',
    alloc: '70% Livrets, 30% PEA',
    ret: '3–4 %',
  },
  {
    id: 'equilibre',
    emoji: '⚖',
    title: 'Équilibré',
    desc: 'Un mix sécurité et performance.',
    alloc: '30% Livrets, 50% PEA, 20% CTO',
    ret: '5–6 %',
  },
  {
    id: 'dynamique',
    emoji: '🚀',
    title: 'Dynamique',
    desc: 'Je vise la performance long terme.',
    alloc: '10% Livret A, 70% PEA, 20% CTO',
    ret: '7–8 %',
  },
]

export const RETURN_BY_PROFILE: Record<RiskProfile, number> = {
  prudent: 3.5,
  equilibre: 5.5,
  dynamique: 7.5,
}

function quickProjection(monthly: number, years: number, annualReturn: number): number {
  const r = annualReturn / 100 / 12
  let bal = 0
  for (let m = 0; m < years * 12; m++) bal = (bal + monthly) * (1 + r)
  return bal
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingModal({ onComplete, onSkip }: Props) {
  const [step, setStep] = useState(1)
  const [dir, setDir] = useState<'right' | 'left'>('right')

  // Step 2 data
  const [firstName,     setFirstName]     = useState('')
  const [ageActuel,     setAgeActuel]     = useState(25)
  const [monthlySalary, setMonthlySalary] = useState(2500)

  // Step 3 data
  const [objective, setObjective] = useState<Objective | null>(null)

  // Step 4 data
  const [monthlyInvestment, setMonthlyInvestment] = useState(500)

  // Step 5 data
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('equilibre')

  // Step 6 data
  const [duration,      setDuration]      = useState(20)
  const [ageRetirement, setAgeRetirement] = useState(45)

  const savingsPct = monthlySalary > 0
    ? Math.round((monthlyInvestment / monthlySalary) * 100)
    : 0

  const projectedCapital = quickProjection(
    monthlyInvestment,
    duration,
    RETURN_BY_PROFILE[riskProfile]
  )

  function goNext() {
    if (step < TOTAL_STEPS) {
      setDir('right')
      setStep((s) => s + 1)
    } else {
      onComplete({ firstName, ageActuel, monthlySalary, objective, monthlyInvestment, riskProfile, duration, ageRetirement })
    }
  }

  function goPrev() {
    if (step > 1) { setDir('left'); setStep((s) => s - 1) }
  }

  function handleSetDuration(v: number) {
    setDuration(v)
    setAgeRetirement(ageActuel + v)
  }

  return (
    <div className="fixed inset-0 z-[200] bg-base flex flex-col">

      {/* ── Progress bar ── */}
      <div className="flex items-center px-6 md:px-16 pt-6 pb-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-300 ${
              i + 1 < step
                ? 'bg-orange text-base'
                : i + 1 === step
                  ? 'bg-purple text-foreground ring-2 ring-purple/30'
                  : 'bg-card border border-border text-muted'
            }`}>
              {i + 1 < step ? '✓' : i + 1}
            </div>
            {i < TOTAL_STEPS - 1 && (
              <div className={`h-px flex-1 mx-1 transition-all duration-500 ${i + 1 < step ? 'bg-orange' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step content ── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-4 py-4">
        <div key={step} className={`w-full max-w-lg ${dir === 'right' ? 'slide-from-right' : 'slide-from-left'}`}>
          {step === 1 && <StepWelcome />}
          {step === 2 && (
            <StepProfile
              firstName={firstName} setFirstName={setFirstName}
              ageActuel={ageActuel} setAgeActuel={setAgeActuel}
              monthlySalary={monthlySalary} setMonthlySalary={setMonthlySalary}
            />
          )}
          {step === 3 && (
            <StepObjective selected={objective} onSelect={setObjective} />
          )}
          {step === 4 && (
            <StepSavings
              monthlySalary={monthlySalary}
              monthlyInvestment={monthlyInvestment}
              savingsPct={savingsPct}
              setMonthlyInvestment={setMonthlyInvestment}
            />
          )}
          {step === 5 && (
            <StepRiskProfile selected={riskProfile} onSelect={setRiskProfile} />
          )}
          {step === 6 && (
            <StepHorizon
              firstName={firstName}
              ageActuel={ageActuel}
              duration={duration} setDuration={handleSetDuration}
              ageRetirement={ageRetirement} setAgeRetirement={setAgeRetirement}
              riskProfile={riskProfile}
              monthlyInvestment={monthlyInvestment}
              projectedCapital={projectedCapital}
            />
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-6 md:px-16 pb-8 pt-2 shrink-0">
        <button onClick={onSkip} className="text-sm text-muted hover:text-foreground transition-colors">
          Passer
        </button>
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={goPrev}
              className="px-4 py-2 rounded-xl text-sm text-muted border border-border hover:text-foreground hover:border-foreground/20 transition-all"
            >
              ← Retour
            </button>
          )}
          <button
            onClick={goNext}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-orange text-base hover:brightness-110 transition-all duration-200"
          >
            {step === TOTAL_STEPS ? 'Lancer ma simulation →' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Step 1 — Bienvenue ────────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center gap-8">
      <svg width="100%" height="110" viewBox="0 0 320 110" fill="none" className="max-w-xs">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((y) => (
          <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#262931" strokeDasharray="4 4" />
        ))}
        <path d="M0,100 C50,96 80,82 110,68 C140,54 160,40 190,26 C220,13 250,7 300,4 L300,106 L0,106 Z" fill="url(#wg)" />
        <path d="M0,100 C50,96 80,82 110,68 C140,54 160,40 190,26 C220,13 250,7 300,4" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="300" cy="4" r="5" fill="#64748B" />
        <circle cx="300" cy="4" r="10" fill="#64748B" fillOpacity="0.18" />
        <circle cx="110" cy="68" r="3" fill="#2563EB" fillOpacity="0.7" />
        <circle cx="190" cy="26" r="3" fill="#2563EB" fillOpacity="0.7" />
      </svg>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
          Bienvenue dans votre<br />simulateur patrimoine
        </h1>
        <p className="text-muted text-sm leading-relaxed">
          5 minutes pour configurer votre projection personnalisée
        </p>
      </div>
    </div>
  )
}

// ── Step 2 — Profil de base ───────────────────────────────────────────────────

interface StepProfileProps {
  firstName: string; setFirstName: (v: string) => void
  ageActuel: number; setAgeActuel: (v: number) => void
  monthlySalary: number; setMonthlySalary: (v: number) => void
}

function StepProfile({ firstName, setFirstName, ageActuel, setAgeActuel, monthlySalary, setMonthlySalary }: StepProfileProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Votre situation actuelle</h2>
        <p className="text-muted text-sm">Quelques infos pour personnaliser votre simulation.</p>
      </div>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Prénom (optionnel)</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="ex. Alexandre"
            className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-purple transition-colors placeholder:text-muted/40"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Âge actuel</span>
          <NumberInput value={ageActuel} onChange={setAgeActuel} min={16} max={70} suffix="ans" size="lg" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Salaire net mensuel</span>
          <NumberInput value={monthlySalary} onChange={setMonthlySalary} min={0} suffix="€" size="lg" />
        </label>
      </div>
      <p className="text-xs text-muted/50 italic text-center">
        Ces données restent 100 % locales, rien n'est envoyé.
      </p>
    </div>
  )
}

// ── Step 3 — Objectif ────────────────────────────────────────────────────────

function StepObjective({ selected, onSelect }: { selected: Objective | null; onSelect: (v: Objective) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Quel est votre objectif principal ?</h2>
        <p className="text-muted text-sm">Cela nous aide à orienter votre simulation.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {OBJECTIVES.map((obj) => (
          <button
            key={obj.id}
            onClick={() => onSelect(obj.id)}
            className={`flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-200 ${
              selected === obj.id
                ? 'border-orange bg-orange/10'
                : 'border-border bg-card hover:border-orange/40'
            }`}
          >
            <span className="text-2xl">{obj.emoji}</span>
            <div>
              <div className="text-sm font-semibold text-foreground">{obj.title}</div>
              <div className="text-[11px] text-muted mt-0.5">{obj.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 4 — Capacité d'épargne ───────────────────────────────────────────────

interface StepSavingsProps {
  monthlySalary: number
  monthlyInvestment: number
  savingsPct: number
  setMonthlyInvestment: (v: number) => void
}

function StepSavings({ monthlySalary, monthlyInvestment, savingsPct, setMonthlyInvestment }: StepSavingsProps) {
  const suggestions = [
    { label: 'Conservateur', pct: 10 },
    { label: 'Recommandé', pct: 20 },
    { label: 'Ambitieux', pct: 30 },
  ]
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Combien pouvez-vous investir ?</h2>
        <p className="text-muted text-sm">Par mois, régulièrement.</p>
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Montant mensuel disponible</span>
          <NumberInput value={monthlyInvestment} onChange={setMonthlyInvestment} min={0} suffix="€" size="lg" />
        </label>
        {monthlySalary > 0 && (
          <div className="text-sm text-orange font-medium text-center">
            soit {savingsPct} % de votre salaire
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => {
          const amount = Math.round((monthlySalary * s.pct) / 100)
          return (
            <button
              key={s.pct}
              onClick={() => setMonthlyInvestment(amount)}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition-all duration-200 ${
                monthlyInvestment === amount
                  ? 'border-orange bg-orange/10 text-foreground'
                  : 'border-border bg-card text-muted hover:border-orange/40 hover:text-foreground'
              }`}
            >
              <span className="font-medium">{s.label} : {s.pct} %</span>
              <span className="text-orange font-semibold">{formatEur(amount)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Step 5 — Profil de risque ─────────────────────────────────────────────────

function StepRiskProfile({ selected, onSelect }: { selected: RiskProfile; onSelect: (v: RiskProfile) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Quel investisseur êtes-vous ?</h2>
        <p className="text-muted text-sm">Votre profil détermine la répartition de vos enveloppes.</p>
      </div>
      <div className="flex flex-col gap-3">
        {RISK_PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
              selected === p.id ? 'border-orange bg-orange/10' : 'border-border bg-card hover:border-orange/40'
            }`}
          >
            <span className="text-2xl shrink-0 mt-0.5">{p.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">{p.title}</div>
              <div className="text-xs text-muted mt-0.5">{p.desc}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px]">
                <span className="text-purple/80">{p.alloc}</span>
                <span className="text-success">~{p.ret}/an</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 6 — Horizon & récapitulatif ─────────────────────────────────────────

interface StepHorizonProps {
  firstName: string
  ageActuel: number
  duration: number; setDuration: (v: number) => void
  ageRetirement: number; setAgeRetirement: (v: number) => void
  riskProfile: RiskProfile
  monthlyInvestment: number
  projectedCapital: number
}

function StepHorizon({
  firstName, ageActuel, duration, setDuration, ageRetirement, setAgeRetirement,
  riskProfile, monthlyInvestment, projectedCapital,
}: StepHorizonProps) {
  const profileLabel = { prudent: 'Prudent', equilibre: 'Équilibré', dynamique: 'Dynamique' }[riskProfile]
  const name = firstName.trim() || 'Vous'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Votre horizon d'investissement</h2>
        <p className="text-muted text-sm">Définissez la durée de votre simulation.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Durée souhaitée</span>
          <NumberInput value={duration} onChange={setDuration} min={1} max={50} suffix="ans" size="lg" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-muted">Âge de retraite visé</span>
          <NumberInput value={ageRetirement} onChange={setAgeRetirement} min={ageActuel + 1} max={100} suffix="ans" size="lg" />
        </label>
      </div>
      <div className="p-4 rounded-xl border border-orange/30 bg-orange/5">
        <div className="text-xs text-muted mb-2 uppercase tracking-wide font-medium">Votre résumé</div>
        <div className="text-sm text-foreground leading-relaxed">
          <span className="text-orange font-semibold">{name}</span>, profil{' '}
          <span className="text-purple font-semibold">{profileLabel}</span>,{' '}
          <span className="text-orange font-semibold">{formatEur(monthlyInvestment)}/mois</span> sur{' '}
          <span className="font-semibold">{duration} ans</span>
        </div>
        <div className="mt-3 pt-3 border-t border-orange/20">
          <div className="text-xs text-muted mb-1">Estimation de capital à terme</div>
          <div className="text-2xl font-bold text-orange">{formatEur(projectedCapital)}</div>
          <div className="text-[10px] text-muted mt-0.5">
            Projection simplifiée — rendement {RETURN_BY_PROFILE[riskProfile]} %/an
          </div>
        </div>
      </div>
    </div>
  )
}

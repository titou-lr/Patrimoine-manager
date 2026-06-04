import { useState, useMemo } from 'react'
import { useStore, selectActiveSim } from '../../store/useStore'
import { formatEur } from '../../utils/format'
import type { GlobalParams } from '../../types'

type GoalType = 'capital' | 'retirement' | 'real_estate'

interface Props {
  globalParams: GlobalParams
  onApply: (monthlyAmount: number) => void
  onClose: () => void
}

/** Versement mensuel pour atteindre un capital cible.
 *  v = (C - S0*(1+r/12)^n) * (r/12) / ((1+r/12)^n - 1)
 *  Dégénère vers v=(C-S0)/n si r≈0.
 */
function calcMonthlyPayment(target: number, initialCapital: number, annualReturn: number, months: number): number {
  if (months <= 0) return 0
  const r = annualReturn / 100
  if (Math.abs(r) < 0.0001) {
    return Math.max(0, (target - initialCapital) / months)
  }
  const mr = r / 12
  const factor = Math.pow(1 + mr, months)
  const numerator = (target - initialCapital * factor) * mr
  const denominator = factor - 1
  if (denominator <= 0) return 0
  return Math.max(0, numerator / denominator)
}

/** Capital initial nécessaire si versement = 0. */
function calcInitialCapital(target: number, annualReturn: number, months: number): number {
  if (months <= 0) return target
  const r = annualReturn / 100
  if (Math.abs(r) < 0.0001) return target
  const mr = r / 12
  return target / Math.pow(1 + mr, months)
}

export default function BackwardCalculator({ globalParams, onApply, onClose }: Props) {
  const activeSim = useStore(selectActiveSim)
  const activeEnvs = activeSim.envelopes.filter((e) => e.active)

  // Current total initial capital from active envelopes
  const currentCapital = activeEnvs.reduce(
    (sum, e) => sum + (e.currentRealValue ?? e.initialCapital),
    0
  )

  const [goalType, setGoalType] = useState<GoalType>('capital')
  const [targetAmount, setTargetAmount] = useState(500_000)
  const [horizon, setHorizon] = useState(globalParams.duration)
  const [annualReturn, setAnnualReturn] = useState(6)
  const inflationRate = globalParams.inflationRate

  // For retirement goal: apply 4% rule → required capital = monthlyExpenses * 12 / 0.04
  const effectiveTarget = useMemo(() => {
    if (goalType === 'retirement') return targetAmount * 12 / 0.04
    return targetAmount
  }, [goalType, targetAmount])

  const months = horizon * 12

  const monthlyPaymentFromZero = useMemo(
    () => calcMonthlyPayment(effectiveTarget, 0, annualReturn, months),
    [effectiveTarget, annualReturn, months]
  )

  const monthlyPaymentFromCurrent = useMemo(
    () => calcMonthlyPayment(effectiveTarget, currentCapital, annualReturn, months),
    [effectiveTarget, currentCapital, annualReturn, months]
  )

  // Optimal combo: half from initial capital lump sum, half from monthly
  const comboInitial = useMemo(
    () => calcInitialCapital(effectiveTarget / 2, annualReturn, months),
    [effectiveTarget, annualReturn, months]
  )
  const comboMonthly = useMemo(
    () => calcMonthlyPayment(effectiveTarget / 2, 0, annualReturn, months),
    [effectiveTarget, annualReturn, months]
  )

  const GOAL_LABELS: Record<GoalType, string> = {
    capital: 'Capital cible à date',
    retirement: 'Retraite (règle des 4%)',
    real_estate: 'Projet immobilier (apport)',
  }

  function handleApply() {
    onApply(Math.round(monthlyPaymentFromCurrent))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl animate-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <div className="text-sm font-semibold text-foreground">Calculer l'épargne nécessaire</div>
            <div className="text-xs text-muted mt-0.5">Définissez votre objectif — l'app calcule le versement</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors p-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body — 2 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:divide-x divide-border">

          {/* Gauche — Objectif */}
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="text-xs text-muted uppercase tracking-widest font-medium">Objectif</div>

            {/* Type d'objectif */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">Type d'objectif</label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-orange"
              >
                {(Object.keys(GOAL_LABELS) as GoalType[]).map((k) => (
                  <option key={k} value={k}>{GOAL_LABELS[k]}</option>
                ))}
              </select>
            </div>

            {/* Montant */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">
                {goalType === 'retirement' ? 'Revenu mensuel souhaité à la retraite' : 'Montant objectif'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-elevated border border-border rounded-lg pl-3 pr-8 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-orange"
                  min={0}
                  step={10000}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">€</span>
              </div>
              {goalType === 'retirement' && (
                <div className="text-[10px] text-muted mt-1">
                  → Capital nécessaire (règle des 4%) : {formatEur(effectiveTarget)}
                </div>
              )}
            </div>

            {/* Horizon */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">Horizon</label>
              <div className="relative">
                <input
                  type="number"
                  value={horizon}
                  onChange={(e) => setHorizon(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-elevated border border-border rounded-lg pl-3 pr-10 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-orange"
                  min={1}
                  max={60}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">ans</span>
              </div>
            </div>

            {/* Rendement */}
            <div>
              <label className="text-xs text-muted mb-1.5 block">Rendement annuel attendu</label>
              <div className="relative">
                <input
                  type="number"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(Math.max(0, Math.min(30, Number(e.target.value))))}
                  className="w-full bg-elevated border border-border rounded-lg pl-3 pr-8 py-2 text-sm text-foreground font-mono focus:outline-none focus:border-orange"
                  min={0}
                  max={30}
                  step={0.5}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">%</span>
              </div>
            </div>

            {/* Inflation */}
            <div className="flex items-center justify-between text-xs text-muted bg-elevated rounded-lg px-3 py-2">
              <span>Inflation utilisée</span>
              <span className="font-mono text-foreground">{inflationRate.toFixed(1)}%/an</span>
            </div>
          </div>

          {/* Droite — Résultats */}
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="text-xs text-muted uppercase tracking-widest font-medium">Résultat</div>

            {/* Résultat principal */}
            <div className="bg-elevated rounded-xl px-5 py-4 flex flex-col items-center text-center">
              <div className="text-xs text-muted mb-1">Il vous faut épargner</div>
              <div className="text-3xl font-mono font-bold text-orange tabular-nums">
                {formatEur(Math.round(monthlyPaymentFromCurrent))}
              </div>
              <div className="text-xs text-muted mt-1">par mois</div>
              {currentCapital > 0 && (
                <div className="text-[10px] text-muted mt-2 border-t border-border pt-2 w-full">
                  Avec votre capital actuel de {formatEur(currentCapital)}
                </div>
              )}
            </div>

            {/* Variantes */}
            <div className="flex flex-col gap-2">
              <div className="text-xs text-muted font-medium">Variantes</div>

              {/* Sans capital initial */}
              <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-foreground font-medium">Capital initial nul</div>
                  <div className="text-[10px] text-muted">Versement seul pour atteindre l'objectif</div>
                </div>
                <div className="text-sm font-mono font-semibold text-foreground tabular-nums">
                  {formatEur(Math.round(monthlyPaymentFromZero))}/mois
                </div>
              </div>

              {/* Capital initial seulement */}
              <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-foreground font-medium">Versement nul</div>
                  <div className="text-[10px] text-muted">Capital initial seul pour atteindre l'objectif</div>
                </div>
                <div className="text-sm font-mono font-semibold text-foreground tabular-nums">
                  {formatEur(Math.round(calcInitialCapital(effectiveTarget, annualReturn, months)))}
                </div>
              </div>

              {/* Combo 50/50 */}
              <div className="bg-surface border border-border rounded-xl px-4 py-3">
                <div className="text-xs text-foreground font-medium mb-1">Combinaison optimale (50/50)</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Capital initial</span>
                  <span className="font-mono text-foreground">{formatEur(Math.round(comboInitial))}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-0.5">
                  <span className="text-muted">Versement mensuel</span>
                  <span className="font-mono text-foreground">{formatEur(Math.round(comboMonthly))}/mois</span>
                </div>
              </div>
            </div>

            {/* Bouton Appliquer */}
            <button
              onClick={handleApply}
              disabled={activeEnvs.length === 0}
              className="w-full py-2.5 rounded-xl bg-orange text-white text-sm font-medium hover:bg-orange/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-auto"
            >
              Appliquer à ma simulation →
            </button>
            <div className="text-[10px] text-muted text-center -mt-2">
              Répartit {formatEur(Math.round(monthlyPaymentFromCurrent))}/mois entre les {activeEnvs.length} enveloppe{activeEnvs.length > 1 ? 's' : ''} actives
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

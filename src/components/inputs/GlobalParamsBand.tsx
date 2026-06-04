import { useState } from 'react'
import { useStore, selectActiveSim, getEffortTotal } from '../../store/useStore'
import { formatEur } from '../../utils/format'
import NumberInput from '../ui/NumberInput'
import TaxOptimizer from '../tools/TaxOptimizer'

interface Props {
  isDirty: boolean
  isRunning: boolean
  coherent: boolean
  onRunSimulation: () => void
  onNotify?: (msg: string) => void
}

export default function GlobalParamsBand({ isDirty, isRunning, coherent, onRunSimulation, onNotify }: Props) {
  const activeSim = useStore(selectActiveSim)
  const { globalParams } = activeSim
  const { updateGlobalParams } = useStore()
  const { duration, inflationRate, monthlyIncome, investmentRate, ageActuel, tmi, isCouple } = globalParams
  const tmiValue = tmi ?? 30
  const isCoupleValue = isCouple ?? false
  const effort = getEffortTotal(activeSim)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [taxOptimizerOpen, setTaxOptimizerOpen] = useState(false)
  const { updateEnvelope } = useStore()

  function notifyEffortChange(oldEffort: number, newEffort: number) {
    if (Math.abs(newEffort - oldEffort) < 1) return
    const msg = `Versements mis à jour (effort : ${formatEur(oldEffort)} → ${formatEur(newEffort)}/mois)`
    setSyncMsg(msg)
    onNotify?.(msg)
    setTimeout(() => setSyncMsg(null), 4000)
  }

  function handleIncomeChange(v: number) {
    const oldEffort = getEffortTotal(activeSim)
    updateGlobalParams({ monthlyIncome: v })
    notifyEffortChange(oldEffort, v * investmentRate / 100)
  }

  function handleRateChange(v: number) {
    const oldEffort = getEffortTotal(activeSim)
    updateGlobalParams({ investmentRate: v })
    notifyEffortChange(oldEffort, monthlyIncome * v / 100)
  }

  return (
    <>
    <div className="bg-surface border-b border-border px-4 md:px-6 py-3 no-print shrink-0">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">

        <label className="flex flex-col gap-1 min-w-[80px]">
          <span className="text-[10px] text-muted uppercase tracking-wider">Durée</span>
          <NumberInput
            value={duration}
            onChange={(v) => updateGlobalParams({ duration: v })}
            min={1} max={50} suffix="ans" size="md"
          />
        </label>

        <label className="flex flex-col gap-1 min-w-[80px]">
          <span className="text-[10px] text-muted uppercase tracking-wider">Inflation</span>
          <NumberInput
            value={inflationRate}
            onChange={(v) => updateGlobalParams({ inflationRate: v })}
            min={0} max={15} step={0.1} suffix="%" size="md"
          />
        </label>

        <label className="flex flex-col gap-1 min-w-[100px]">
          <span className="text-[10px] text-muted uppercase tracking-wider">Salaire net</span>
          <NumberInput
            value={monthlyIncome}
            onChange={handleIncomeChange}
            min={0} suffix="€" size="md"
          />
        </label>

        <label className="flex flex-col gap-1 min-w-[80px]">
          <span className="text-[10px] text-muted uppercase tracking-wider">Taux épargne</span>
          <NumberInput
            value={investmentRate}
            onChange={handleRateChange}
            min={0} max={100} suffix="%" size="md"
          />
        </label>

        <label className="flex flex-col gap-1 min-w-[70px]">
          <span className="text-[10px] text-muted uppercase tracking-wider">TMI</span>
          <NumberInput
            value={tmiValue}
            onChange={(v) => updateGlobalParams({ tmi: v })}
            min={0} max={45} suffix="%" size="md"
          />
        </label>

        <label className="flex flex-col gap-1 min-w-[70px]">
          <span className="text-[10px] text-muted uppercase tracking-wider">Âge</span>
          <NumberInput
            value={ageActuel}
            onChange={(v) => updateGlobalParams({ ageActuel: v })}
            min={16} max={70} suffix="ans" size="md"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted uppercase tracking-wider">Couple</span>
          <button
            onClick={() => updateGlobalParams({ isCouple: !isCoupleValue })}
            className={`h-9 px-3 rounded-lg border text-xs font-medium transition-colors ${
              isCoupleValue
                ? 'bg-orange/15 border-orange/50 text-orange'
                : 'bg-surface border-border text-muted hover:border-border-mid'
            }`}
            title={isCoupleValue ? 'Abattement AV 9 200 €' : 'Abattement AV 4 600 €'}
          >
            {isCoupleValue ? 'Couple' : 'Solo'}
          </button>
        </div>

        {/* Toggle Standard / Monte-Carlo */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-muted uppercase tracking-wider">Simulation</span>
          <div className="flex h-9 rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => updateGlobalParams({ simulationMode: 'standard' })}
              className={`px-3 text-xs font-medium transition-colors ${
                (globalParams.simulationMode ?? 'standard') === 'standard'
                  ? 'bg-orange text-black'
                  : 'text-muted hover:text-foreground bg-surface'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => updateGlobalParams({ simulationMode: 'advanced' })}
              className={`px-3 text-xs font-medium transition-colors border-l border-border ${
                globalParams.simulationMode === 'advanced'
                  ? 'bg-orange text-black'
                  : 'text-muted hover:text-foreground bg-surface'
              }`}
            >
              Monte-Carlo
            </button>
          </div>
          {globalParams.simulationMode === 'advanced' && (
            <p className="text-[10px] text-muted">1 000 scénarios simulés. Résultats en P10/P50/P90.</p>
          )}
        </div>

        {effort > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted uppercase tracking-wider">→ Investi</span>
            <div className="h-9 flex items-center text-sm font-mono text-orange font-semibold tabular-nums">
              {formatEur(effort)}/mois
            </div>
          </div>
        )}

        {syncMsg && (
          <div className="text-[10px] text-muted animate-in self-end pb-2">{syncMsg}</div>
        )}

        {/* Optimiser button */}
        <div className="self-end">
          <button
            onClick={() => setTaxOptimizerOpen(true)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-xs text-muted hover:text-foreground hover:border-border-mid transition-colors"
            title="Optimisation fiscale automatique"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1l1.5 3h3l-2.5 1.8.9 3L6 7.2 3.1 8.8l.9-3L1.5 4h3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            Optimiser
          </button>
        </div>

        {/* Run button — right side */}
        <div className="ml-auto self-end">
          {coherent ? (
            <button
              onClick={onRunSimulation}
              disabled={isRunning}
              className={`
                flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-black
                transition-all duration-200 select-none
                ${isRunning
                  ? 'bg-orange/80 cursor-wait'
                  : isDirty
                    ? 'bg-orange cursor-pointer animate-refresh-dirty'
                    : 'bg-orange/60 cursor-default'
                }
              `}
            >
              {isRunning ? (
                <>
                  <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Calcul…
                </>
              ) : isDirty ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5c1.8 0 3.4.87 4.4 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M10.5 2L13 4.5 10.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Lancer
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                    <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  À jour
                </>
              )}
            </button>
          ) : (
            <button
              disabled
              title="Corrigez l'écart de versements pour continuer"
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold bg-elevated text-muted cursor-not-allowed"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
                <path d="M8 3v5M8 10.5v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              Corriger l'écart
            </button>
          )}
        </div>
      </div>
    </div>

    {taxOptimizerOpen && (
      <TaxOptimizer
        onClose={() => setTaxOptimizerOpen(false)}
        onApply={(envelopeId, monthlyContribution) => {
          updateEnvelope(envelopeId, { monthlyContribution })
        }}
      />
    )}
  </>
  )
}

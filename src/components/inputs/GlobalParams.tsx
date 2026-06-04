import { useState } from 'react'
import { useStore, selectActiveSim, getEffortTotal } from '../../store/useStore'
import { formatEur } from '../../utils/format'
import NumberInput from '../ui/NumberInput'

interface Props {
  onNotify?: (msg: string) => void
}

export default function GlobalParamsPanel({ onNotify }: Props) {
  const activeSim = useStore(selectActiveSim)
  const { globalParams } = activeSim
  const { updateGlobalParams, resetState } = useStore()
  const { duration, inflationRate, monthlyIncome, investmentRate, ageActuel, tmi, isCouple } = globalParams
  const tmiValue = tmi ?? 30
  const isCoupleValue = isCouple ?? false
  const monthlyInvested = Math.round((monthlyIncome * investmentRate) / 100)

  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  function notifyEffortChange(oldEffort: number, newEffort: number) {
    if (Math.abs(newEffort - oldEffort) < 1) return
    const msg = `Versements mis à jour proportionnellement (effort : ${formatEur(oldEffort)} → ${formatEur(newEffort)}/mois)`
    setSyncMsg(msg)
    onNotify?.(msg)
    setTimeout(() => setSyncMsg(null), 4000)
  }

  function handleIncomeChange(v: number) {
    const oldEffort = getEffortTotal(activeSim)
    updateGlobalParams({ monthlyIncome: v })
    const newEffort = v * investmentRate / 100
    notifyEffortChange(oldEffort, newEffort)
  }

  function handleRateChange(v: number) {
    const oldEffort = getEffortTotal(activeSim)
    updateGlobalParams({ investmentRate: v })
    const newEffort = monthlyIncome * v / 100
    notifyEffortChange(oldEffort, newEffort)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs tracking-widest uppercase text-muted">
          Paramètres
        </h2>
        <button
          onClick={resetState}
          className="text-[10px] text-muted/60 hover:text-danger"
          title="Réinitialiser tous les paramètres"
        >
          Réinitialiser
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Durée de simulation</span>
        <NumberInput
          value={duration}
          onChange={(v) => updateGlobalParams({ duration: v })}
          min={1}
          max={50}
          suffix="ans"
          size="lg"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Inflation annuelle</span>
        <NumberInput
          value={inflationRate}
          onChange={(v) => updateGlobalParams({ inflationRate: v })}
          min={0}
          max={15}
          step={0.1}
          suffix="%"
          size="lg"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Salaire net mensuel</span>
        <NumberInput
          value={monthlyIncome}
          onChange={handleIncomeChange}
          min={0}
          suffix="€"
          size="lg"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Taux d'épargne investi</span>
        <NumberInput
          value={investmentRate}
          onChange={handleRateChange}
          min={0}
          max={100}
          suffix="%"
          size="lg"
        />
        {monthlyIncome > 0 && (
          <span className="text-xs font-mono text-orange">
            → {formatEur(monthlyInvested)}/mois
          </span>
        )}
        {syncMsg && (
          <span className="text-[10px] text-muted animate-in">{syncMsg}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Tranche marginale d'imposition</span>
        <NumberInput
          value={tmiValue}
          onChange={(v) => updateGlobalParams({ tmi: v })}
          min={0}
          max={45}
          suffix="%"
          size="lg"
        />
      </label>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">Déclaration en couple</span>
        <button
          onClick={() => updateGlobalParams({ isCouple: !isCoupleValue })}
          className={`relative w-9 h-5 rounded-full flex items-center transition-colors duration-200 ${
            isCoupleValue ? 'bg-orange' : 'bg-border'
          }`}
          title={isCoupleValue ? 'Abattement AV 9 200 €' : 'Abattement AV 4 600 €'}
        >
          <span
            className={`absolute w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isCoupleValue ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">Âge actuel</span>
        <NumberInput
          value={ageActuel}
          onChange={(v) => updateGlobalParams({ ageActuel: v })}
          min={16}
          max={70}
          suffix="ans"
          size="lg"
        />
      </label>
    </section>
  )
}

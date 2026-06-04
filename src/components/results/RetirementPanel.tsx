import { useMemo } from 'react'
import { useStore, selectActiveSim, DEFAULT_RETIREMENT_PARAMS } from '../../store/useStore'
import { computeRetirementAnalysis } from '../../engine/retirement'
import { formatEur } from '../../utils/format'
import type { Envelope, GlobalParams, SimulationResult } from '../../types'
import NumberInput from '../ui/NumberInput'
import GlossaryTooltip from '../ui/GlossaryTooltip'
import RetirementDualChart from './RetirementDualChart'

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
  globalParams: GlobalParams
}

export default function RetirementPanel({ results, envelopes, globalParams }: Props) {
  const retirementParams = useStore((s) => selectActiveSim(s).retirementParams ?? DEFAULT_RETIREMENT_PARAMS)
  const { updateRetirementParams } = useStore()

  const analysis = useMemo(
    () => computeRetirementAnalysis(results, retirementParams, globalParams, envelopes),
    [results, retirementParams, globalParams, envelopes]
  )

  const {
    capitalNeeded,
    capitalAtRetirement,
    passiveIncomeMonthly,
    runwayYears,
    shortfall,
    yearsUntilRetirement,
    accumulationData,
    withdrawalData,
  } = analysis

  const { ageRetirement, monthlyExpenses, pensionMonthly, withdrawalRate, lifeExpectancy } =
    retirementParams

  const goalMet = shortfall <= 0
  const totalMonthlyIncome = passiveIncomeMonthly + pensionMonthly
  const runwayStr = runwayYears === 'unlimited' ? 'indéfiniment' : `${runwayYears} ans`
  const runwayColor =
    runwayYears === 'unlimited'
      ? 'text-success'
      : typeof runwayYears === 'number' && runwayYears < 20
        ? 'text-danger'
        : 'text-foreground'

  const analysisText =
    `Avec votre trajectoire actuelle, vous atteindrez ${formatEur(capitalAtRetirement)} à ${ageRetirement} ans` +
    ` (dans ${yearsUntilRetirement} ans). Cela vous permettra de retirer ${formatEur(passiveIncomeMonthly)}/mois` +
    ` pendant ${runwayStr}, ${goalMet ? 'couvrant' : 'ne couvrant pas'} vos dépenses souhaitées` +
    ` de ${formatEur(monthlyExpenses)}/mois (retraite de base de ${formatEur(pensionMonthly)}/mois incluse).`

  return (
    <div className="flex flex-col gap-6">

      {/* Paramètres — 2 lignes de 2-3 champs */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <h3 className="text-xs tracking-widest uppercase text-muted mb-4">Paramètres retraite</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Âge de retraite</span>
            <NumberInput value={ageRetirement} onChange={(v) => updateRetirementParams({ ageRetirement: v })} min={50} max={75} suffix="ans" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Dépenses mensuelles</span>
            <NumberInput value={monthlyExpenses} onChange={(v) => updateRetirementParams({ monthlyExpenses: v })} min={0} suffix="€" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Retraite de base</span>
            <NumberInput value={pensionMonthly} onChange={(v) => updateRetirementParams({ pensionMonthly: v })} min={0} suffix="€/mois" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">
              <GlossaryTooltip termId="taux_retrait">Taux de retrait</GlossaryTooltip>
            </span>
            <NumberInput value={withdrawalRate} onChange={(v) => updateRetirementParams({ withdrawalRate: v })} min={1} max={15} suffix="%" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Espérance de vie</span>
            <NumberInput value={lifeExpectancy} onChange={(v) => updateRetirementParams({ lifeExpectancy: v })} min={70} max={120} suffix="ans" size="lg" />
          </label>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Capital nécessaire</div>
          <div className="text-2xl font-mono text-orange tabular-nums">{formatEur(capitalNeeded)}</div>
          <div className="text-xs text-muted mt-1">
            pour {formatEur(Math.max(0, monthlyExpenses - pensionMonthly))}/mois
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Capital projeté</div>
          <div className="text-2xl font-mono text-foreground tabular-nums">{formatEur(capitalAtRetirement)}</div>
          <div className="mt-1.5">
            {goalMet ? (
              <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">✓ Objectif atteint</span>
            ) : (
              <span className="text-[10px] font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">✗ Manque {formatEur(shortfall)}</span>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Revenus passifs/mois</div>
          <div className="text-2xl font-mono text-purple tabular-nums">{formatEur(passiveIncomeMonthly)}</div>
          <div className="text-xs text-muted mt-1">
            soit {formatEur(totalMonthlyIncome)}/mois avec pension
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Durée de tenue</div>
          <div className={`text-2xl font-mono tabular-nums ${runwayColor}`}>
            {runwayYears === 'unlimited' ? '♾' : `${runwayYears} ans`}
          </div>
          <div className="text-xs text-muted mt-1">
            {runwayYears === 'unlimited' ? 'Capital perpétuel' : `Tient ${runwayStr}`}
          </div>
        </div>
      </div>

      {/* Graphique double phase */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="text-xs tracking-widest uppercase text-muted mb-4">
          Trajectoire — Accumulation &amp; Retrait
        </div>
        <RetirementDualChart
          accumulationData={accumulationData}
          withdrawalData={withdrawalData}
          capitalNeeded={capitalNeeded}
          ageRetirement={ageRetirement}
        />
        <div className="flex items-center gap-6 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-4 h-0.5 bg-purple inline-block rounded" />
            Accumulation
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-4 h-0.5 bg-orange inline-block rounded" />
            Retrait
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-4 inline-block" style={{ borderTop: '1.5px dashed #2563EB' }} />
            Objectif
          </div>
        </div>
      </div>

      {/* Bloc texte analytique */}
      <div className="bg-elevated border-l-2 border-l-orange rounded-r-lg px-4 py-3 text-sm text-secondary italic leading-relaxed">
        {analysisText}
      </div>
    </div>
  )
}

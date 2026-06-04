import { useState, useMemo, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useStore } from '../../store/useStore'
import { runSimulation } from '../../engine/simulation'
import { formatEur, formatPct } from '../../utils/format'
import type { SimulationResult } from '../../types'

interface Props {
  onClose: () => void
}

interface TooltipPayload {
  dataKey: string
  value: number
  color: string
  name: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: number
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-muted mb-1.5">Année {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 justify-between min-w-[160px]">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-medium text-foreground">{formatEur(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function computeAnnualReturn(results: SimulationResult[], totalContributed: number): number {
  if (results.length === 0 || totalContributed === 0) return 0
  const last = results[results.length - 1]
  const n = results.length
  return Math.pow(last.totalNominal / totalContributed, 1 / n) - 1
}

function detectMainDifference(
  simA: ReturnType<typeof useStore.getState>['simulations'][0],
  simB: ReturnType<typeof useStore.getState>['simulations'][0],
  resultsA: SimulationResult[],
  resultsB: SimulationResult[]
): string {
  const lastA = resultsA[resultsA.length - 1]
  const lastB = resultsB[resultsB.length - 1]

  const returnA = computeAnnualReturn(resultsA, lastA?.totalContributed ?? 1)
  const returnB = computeAnnualReturn(resultsB, lastB?.totalContributed ?? 1)
  if (Math.abs(returnA - returnB) > 0.01) return 'rendement'

  const effortA = simA.globalParams.monthlyIncome * simA.globalParams.investmentRate / 100
  const effortB = simB.globalParams.monthlyIncome * simB.globalParams.investmentRate / 100
  if (Math.abs(effortA - effortB) > 200) return 'effort mensuel'

  const taxA = lastA ? Object.values(lastA.taxByEnvelope).reduce((s, v) => s + v, 0) : 0
  const taxB = lastB ? Object.values(lastB.taxByEnvelope).reduce((s, v) => s + v, 0) : 0
  const capital = Math.max(lastA?.totalNominal ?? 1, lastB?.totalNominal ?? 1)
  if (Math.abs(taxA - taxB) / capital > 0.05) return 'fiscalité'

  if (Math.abs(simA.globalParams.duration - simB.globalParams.duration) > 2) return 'horizon'

  return 'composition des enveloppes'
}

interface KpiRow {
  label: string
  a: string
  b: string
  rawA: number
  rawB: number
  higherIsBetter: boolean
  delta?: string
}

export default function StrategyComparator({ onClose }: Props) {
  const { simulations } = useStore()

  const [simIdA, setSimIdA] = useState(simulations[0]?.id ?? '')
  const [simIdB, setSimIdB] = useState(simulations[1]?.id ?? simulations[0]?.id ?? '')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const simA = simulations.find((s) => s.id === simIdA)
  const simB = simulations.find((s) => s.id === simIdB)

  const resultsA = useMemo(() => {
    if (!simA) return []
    return runSimulation(simA.envelopes, simA.globalParams, simA.events ?? [])
  }, [simA])

  const resultsB = useMemo(() => {
    if (!simB) return []
    return runSimulation(simB.envelopes, simB.globalParams, simB.events ?? [])
  }, [simB])

  const lastA = resultsA[resultsA.length - 1]
  const lastB = resultsB[resultsB.length - 1]

  const effortA = simA ? simA.globalParams.monthlyIncome * simA.globalParams.investmentRate / 100 : 0
  const effortB = simB ? simB.globalParams.monthlyIncome * simB.globalParams.investmentRate / 100 : 0

  const taxA = lastA ? Object.values(lastA.taxByEnvelope).reduce((s, v) => s + v, 0) : 0
  const taxB = lastB ? Object.values(lastB.taxByEnvelope).reduce((s, v) => s + v, 0) : 0

  const retireA = simA ? simA.retirementParams.ageRetirement : 0
  const retireB = simB ? simB.retirementParams.ageRetirement : 0

  const returnA = computeAnnualReturn(resultsA, lastA?.totalContributed ?? 1)
  const returnB = computeAnnualReturn(resultsB, lastB?.totalContributed ?? 1)

  const kpiRows: KpiRow[] = [
    { label: 'Capital final', a: formatEur(lastA?.totalNominal ?? 0), b: formatEur(lastB?.totalNominal ?? 0), rawA: lastA?.totalNominal ?? 0, rawB: lastB?.totalNominal ?? 0, higherIsBetter: true },
    { label: 'Valeur réelle', a: formatEur(lastA?.totalReal ?? 0), b: formatEur(lastB?.totalReal ?? 0), rawA: lastA?.totalReal ?? 0, rawB: lastB?.totalReal ?? 0, higherIsBetter: true },
    { label: 'Gains nets', a: formatEur(lastA?.totalGains ?? 0), b: formatEur(lastB?.totalGains ?? 0), rawA: lastA?.totalGains ?? 0, rawB: lastB?.totalGains ?? 0, higherIsBetter: true },
    { label: 'Total versé', a: formatEur(lastA?.totalContributed ?? 0), b: formatEur(lastB?.totalContributed ?? 0), rawA: lastA?.totalContributed ?? 0, rawB: lastB?.totalContributed ?? 0, higherIsBetter: false },
    { label: 'Rendement réel /an', a: formatPct(returnA * 100), b: formatPct(returnB * 100), rawA: returnA, rawB: returnB, higherIsBetter: true },
    { label: 'Frais cumulés', a: formatEur(lastA?.totalFeesPaid ?? 0), b: formatEur(lastB?.totalFeesPaid ?? 0), rawA: lastA?.totalFeesPaid ?? 0, rawB: lastB?.totalFeesPaid ?? 0, higherIsBetter: false },
    { label: 'Impôts estimés', a: formatEur(taxA), b: formatEur(taxB), rawA: taxA, rawB: taxB, higherIsBetter: false },
    { label: 'Effort mensuel', a: `${formatEur(effortA)}/mois`, b: `${formatEur(effortB)}/mois`, rawA: effortA, rawB: effortB, higherIsBetter: false },
    { label: 'Retraite à', a: `${retireA} ans`, b: `${retireB} ans`, rawA: retireA, rawB: retireB, higherIsBetter: false },
  ]

  // Chart data — aligned to max duration
  const maxLen = Math.max(resultsA.length, resultsB.length)
  const chartData = Array.from({ length: maxLen }, (_, i) => ({
    year: (resultsA[i] ?? resultsB[i]).year,
    aNominal: resultsA[i]?.totalNominal ?? null,
    aReal:    resultsA[i]?.totalReal ?? null,
    bNominal: resultsB[i]?.totalNominal ?? null,
    bReal:    resultsB[i]?.totalReal ?? null,
  }))

  // Auto analysis
  const analysis = useMemo(() => {
    if (!simA || !simB || !lastA || !lastB) return null
    const winner = lastA.totalNominal >= lastB.totalNominal ? simA : simB
    const loser  = winner.id === simA.id ? simB : simA
    const winnerResult = winner.id === simA.id ? lastA : lastB
    const loserResult  = winner.id === simA.id ? lastB : lastA
    const ecart = Math.abs(winnerResult.totalNominal - loserResult.totalNominal)
    const ecartPct = loserResult.totalNominal > 0 ? (ecart / loserResult.totalNominal) * 100 : 0
    const duration = winner.globalParams.duration
    const reason = detectMainDifference(simA, simB, resultsA, resultsB)

    const effortWinner = winner.globalParams.monthlyIncome * winner.globalParams.investmentRate / 100
    const effortLoser  = loser.globalParams.monthlyIncome * loser.globalParams.investmentRate / 100
    const effortDiff   = Math.abs(effortWinner - effortLoser)

    return {
      winnerName: winner.name,
      loserName: loser.name,
      ecart,
      ecartPct,
      duration,
      reason,
      effortDiff,
      effortLoser,
    }
  }, [simA, simB, lastA, lastB, resultsA, resultsB])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-base border border-border rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-border flex items-center gap-4">
          <span className="font-semibold text-sm text-foreground">Comparateur de stratégies</span>

          {/* Dropdowns */}
          <div className="flex items-center gap-3 ml-4">
            <select
              value={simIdA}
              onChange={(e) => setSimIdA(e.target.value)}
              className="bg-elevated border border-border rounded-lg text-xs px-2 py-1.5 text-foreground"
            >
              {simulations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <span className="text-muted text-xs">vs</span>
            <select
              value={simIdB}
              onChange={(e) => setSimIdB(e.target.value)}
              className="bg-elevated border border-border rounded-lg text-xs px-2 py-1.5 text-foreground"
            >
              {simulations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-elevated text-sm"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-6">

          {/* Section 1 — Tableau KPIs */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted font-normal pb-2 pr-4">KPI</th>
                  <th className="text-right text-orange font-medium pb-2 px-4">{simA?.name ?? 'A'}</th>
                  <th className="text-right text-purple font-medium pb-2 px-4">{simB?.name ?? 'B'}</th>
                  <th className="text-right text-muted font-normal pb-2 pl-4">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kpiRows.map((row) => {
                  const aWins = row.higherIsBetter
                    ? row.rawA >= row.rawB
                    : row.rawA <= row.rawB
                  const bWins = !aWins
                  const delta = row.rawA - row.rawB
                  const sign  = delta > 0 ? '+' : ''
                  const deltaLabel =
                    Math.abs(row.rawA) > 100 || Math.abs(row.rawB) > 100
                      ? `${sign}${formatEur(delta)}`
                      : `${sign}${delta.toFixed(1)}`

                  return (
                    <tr key={row.label}>
                      <td className="text-muted py-2 pr-4">{row.label}</td>
                      <td className={`text-right py-2 px-4 font-mono ${aWins ? 'bg-success/5 text-success font-medium rounded-l' : 'text-foreground'}`}>
                        {row.a}
                      </td>
                      <td className={`text-right py-2 px-4 font-mono ${bWins ? 'bg-success/5 text-success font-medium rounded-r' : 'text-foreground'}`}>
                        {row.b}
                      </td>
                      <td className={`text-right py-2 pl-4 font-mono ${delta >= 0 ? 'text-success' : 'text-danger'}`}>
                        {deltaLabel}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Section 2 — Graphique superposé */}
          <div className="bg-surface border border-border rounded-2xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Évolution comparée</h3>
            <div className="text-[10px] text-muted mb-3 flex flex-wrap gap-3">
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-orange inline-block" /> {simA?.name} nominal</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-orange/50 border-b border-dashed border-orange inline-block" /> {simA?.name} réel</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-purple inline-block" /> {simB?.name} nominal</span>
              <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 bg-purple/50 border-b border-dashed border-purple inline-block" /> {simB?.name} réel</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
                <XAxis dataKey="year" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}a`} />
                <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} width={40} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="aNominal" name={`${simA?.name} nom.`} stroke="var(--color-orange)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="aReal"    name={`${simA?.name} réel`} stroke="var(--color-orange)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                <Line type="monotone" dataKey="bNominal" name={`${simB?.name} nom.`} stroke="var(--color-purple)" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="bReal"    name={`${simB?.name} réel`} stroke="var(--color-purple)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Section 3 — Analyse textuelle */}
          {analysis && (
            <div className="bg-elevated rounded-2xl p-5 border border-border">
              <h3 className="text-sm font-medium text-foreground mb-2">Analyse automatique</h3>
              <p className="text-sm text-secondary leading-relaxed">
                La stratégie{' '}
                <span className="text-foreground font-medium">« {analysis.winnerName} »</span>
                {' '}génère{' '}
                <span className="text-success font-mono font-medium">{formatEur(analysis.ecart)}</span>
                {' '}de plus sur {analysis.duration} ans, soit un écart de{' '}
                <span className="text-success font-medium">{analysis.ecartPct.toFixed(1)}%</span>.
                {' '}L'avantage principal vient d'un meilleur{' '}
                <span className="text-foreground font-medium">{analysis.reason}</span>.
                {analysis.effortDiff > 50 && (
                  <> En revanche,{' '}
                  <span className="text-foreground font-medium">« {analysis.loserName} »</span>
                  {' '}nécessite{' '}
                  <span className="font-mono font-medium">{formatEur(analysis.effortLoser)}/mois</span>
                  {' '}d'effort mensuel{analysis.effortDiff > 200 ? ' (significativement moins)' : ''}.</>
                )}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

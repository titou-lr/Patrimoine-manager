import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useStore } from '../../store/useStore'
import { runSimulation } from '../../engine/simulation'
import { formatEur } from '../../utils/format'

const SIM_COLORS = ['#2563EB', '#8B5CF6', '#4ADE80', '#06B6D4', '#F472B6', '#34D399', '#0EA5E9']

interface TooltipEntry {
  dataKey: string
  name: string
  value: number
  stroke: string
}

function CompareTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: number }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-lg">
      <div className="text-muted mb-2 font-medium">Année {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-6 py-0.5">
          <span style={{ color: p.stroke }}>{p.name}</span>
          <span className="text-foreground font-medium">{formatEur(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

interface TableRowProps {
  label: string
  values: string[]
  colors?: string[]
}

function TableRow({ label, values, colors }: TableRowProps) {
  return (
    <tr>
      <td className="py-2 pr-4 text-muted">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`py-2 px-3 text-right font-medium tabular-nums ${colors?.[i] ?? 'text-foreground'}`}>
          {v}
        </td>
      ))}
    </tr>
  )
}

interface Props {
  onClose: () => void
}

export default function SimulationComparePanel({ onClose }: Props) {
  const { simulations } = useStore()

  const { chartData, summary } = useMemo(() => {
    const allResults = simulations.map((sim) => ({
      sim,
      results: runSimulation(sim.envelopes, sim.globalParams),
    }))

    const maxLen = Math.max(...allResults.map((r) => r.results.length), 0)

    const chartData = Array.from({ length: maxLen }, (_, i) => {
      const entry: Record<string, number | string> = {
        year: allResults[0]?.results[i]?.year ?? i + 1,
      }
      allResults.forEach(({ sim, results }) => {
        entry[sim.id] = Math.round(results[i]?.totalNominal ?? 0)
      })
      return entry
    })

    const summary = allResults.map(({ sim, results }) => {
      const last = results[results.length - 1]
      return {
        sim,
        capitalFinal: last?.totalNominal ?? 0,
        gainsNets: last?.totalGains ?? 0,
        valeurReelle: last?.totalReal ?? 0,
      }
    })

    return { chartData, summary }
  }, [simulations])

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-base/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-2xl bg-card border-l border-border overflow-y-auto flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">Comparaison des simulations</h2>
            <p className="text-[11px] text-muted mt-0.5">{simulations.length} simulations · scénario actif de chacune</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-border/40 text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {/* Legend */}
          <div className="flex gap-4 flex-wrap">
            {simulations.map((sim, i) => (
              <span key={sim.id} className="flex items-center gap-1.5 text-[11px] text-muted">
                <span
                  className="w-4 h-0.5 inline-block rounded"
                  style={{ backgroundColor: SIM_COLORS[i % SIM_COLORS.length] }}
                />
                {sim.name}
              </span>
            ))}
          </div>

          {/* LineChart */}
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262931" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickFormatter={(v) => String(v)}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 10 }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<CompareTooltip />} />
              {simulations.map((sim, i) => (
                <Line
                  key={sim.id}
                  type="monotone"
                  dataKey={sim.id}
                  name={sim.name}
                  stroke={SIM_COLORS[i % SIM_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Summary table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left text-muted font-medium py-2 pr-4">Indicateur</th>
                  {simulations.map((sim, i) => (
                    <th
                      key={sim.id}
                      className="text-right py-2 px-3 font-semibold"
                      style={{ color: SIM_COLORS[i % SIM_COLORS.length] }}
                    >
                      {sim.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <TableRow
                  label="Capital final (nominal)"
                  values={summary.map((s) => formatEur(s.capitalFinal))}
                />
                <TableRow
                  label="Gains nets"
                  values={summary.map((s) => formatEur(s.gainsNets))}
                  colors={summary.map(() => 'text-success')}
                />
                <TableRow
                  label="Valeur réelle (inflation)"
                  values={summary.map((s) => formatEur(s.valeurReelle))}
                  colors={summary.map(() => 'text-muted')}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

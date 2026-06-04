import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { runSimulation } from '../../engine/simulation'
import { formatEur } from '../../utils/format'
import type { Envelope, GlobalParams } from '../../types'

interface Props {
  envelopes: Envelope[]
  globalParams: GlobalParams
}

export default function ScenarioCompareChart({ envelopes, globalParams }: Props) {
  const data = useMemo(() => {
    const pess = runSimulation(envelopes, { ...globalParams, inflationScenario: 'high' as const })
    const real = runSimulation(envelopes, globalParams)
    const opti = runSimulation(envelopes, { ...globalParams, inflationScenario: 'low' as const })
    return real.map((r, i) => ({
      year: r.year,
      pessimiste: Math.round(pess[i].totalNominal),
      realiste:   Math.round(r.totalNominal),
      optimiste:  Math.round(opti[i].totalNominal),
    }))
  }, [envelopes, globalParams])

  const last = data[data.length - 1]

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Comparaison des scénarios</h3>
        {last && (
          <div className="flex gap-3 text-[10px]">
            <span className="text-danger">🐻 {formatEur(last.pessimiste)}</span>
            <span className="text-orange">📊 {formatEur(last.realiste)}</span>
            <span className="text-success">🚀 {formatEur(last.optimiste)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-3 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-danger inline-block" /> Pessimiste
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-orange inline-block" /> Réaliste
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-success inline-block" /> Optimiste
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262931" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: '#6B7280', fontSize: 10 }}
            tickFormatter={(v) => `An ${v}`}
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
          <Line type="monotone" dataKey="pessimiste" stroke="#F87171" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="realiste"   stroke="#2563EB" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="optimiste"  stroke="#4ADE80" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

interface TooltipPayload { dataKey: string; value: number }

function CompareTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: number }) {
  if (!active || !payload?.length) return null
  const colors: Record<string, string> = {
    pessimiste: '#F87171',
    realiste:   '#2563EB',
    optimiste:  '#4ADE80',
  }
  const labels: Record<string, string> = {
    pessimiste: '🐻 Pessimiste',
    realiste:   '📊 Réaliste',
    optimiste:  '🚀 Optimiste',
  }
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-lg">
      <div className="text-muted mb-2 font-medium">Année {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-6 py-0.5">
          <span style={{ color: colors[p.dataKey] }}>{labels[p.dataKey]}</span>
          <span className="text-foreground font-medium">{formatEur(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

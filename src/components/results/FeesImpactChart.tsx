import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { runSimulation, ZERO_FEES } from '../../engine/simulation'
import { formatEur } from '../../utils/format'
import type { Envelope, GlobalParams, SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
  globalParams: GlobalParams
}

export default function FeesImpactChart({ results, envelopes, globalParams }: Props) {
  const lastResult = results[results.length - 1]
  if (!lastResult || lastResult.totalFeesPaid === 0) return null

  const noFeesEnvelopes = useMemo(
    () => envelopes.map((env) => ({ ...env, fees: ZERO_FEES })),
    [envelopes]
  )

  const noFeesResults = useMemo(
    () => runSimulation(noFeesEnvelopes, globalParams),
    [noFeesEnvelopes, globalParams]
  )

  const chartData = results.map((r, i) => ({
    year: r.year,
    withFees: Math.round(r.totalNominal),
    gap: Math.round((noFeesResults[i]?.totalNominal ?? r.totalNominal) - r.totalNominal),
  }))

  const noFeesLast = noFeesResults[results.length - 1]
  const saving = noFeesLast ? Math.round(noFeesLast.totalNominal - lastResult.totalNominal) : 0

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Impact des frais</h3>
          <p className="text-[11px] text-muted mt-0.5">Simulation avec vs sans frais</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-muted">Économie potentielle</div>
          <div className="text-lg font-bold text-success">{formatEur(saving)}</div>
        </div>
      </div>

      <div className="flex gap-4 mb-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-purple/60 inline-block" />
          <span className="text-muted">Avec frais actuels</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-danger/40 inline-block" />
          <span className="text-muted">Coût des frais</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradWithFees" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="gradGap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.30} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `An ${v}`}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            width={36}
          />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
            labelFormatter={(v) => `Année ${v}`}
            formatter={(value, name) => {
              const v = value as number
              if (name === 'withFees') return [formatEur(v), 'Avec frais']
              if (name === 'gap') return [formatEur(v), 'Coût des frais']
              return [formatEur(v), String(name)]
            }}
          />
          <Area
            type="monotone"
            dataKey="withFees"
            stackId="1"
            stroke="#818cf8"
            strokeWidth={1.5}
            fill="url(#gradWithFees)"
          />
          <Area
            type="monotone"
            dataKey="gap"
            stackId="1"
            stroke="#f87171"
            strokeWidth={1}
            strokeDasharray="3 3"
            fill="url(#gradGap)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-muted/60 mt-2 text-center">
        Le sommet de la zone rouge = capital sans frais. La zone rouge = manque à gagner cumulé.
      </p>
    </div>
  )
}

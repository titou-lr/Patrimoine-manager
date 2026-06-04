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
import type { Envelope, GlobalParams, LifeEvent, SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
  globalParams: GlobalParams
  events: LifeEvent[]
}

export default function FeesImpactChart({ results, envelopes, globalParams, events }: Props) {
  const lastResult = results[results.length - 1]
  if (!lastResult || lastResult.totalFeesPaid === 0) return null

  const noFeesEnvelopes = useMemo(
    () => envelopes.map((env) => ({ ...env, fees: ZERO_FEES })),
    [envelopes]
  )

  const noFeesResults = useMemo(
    () => runSimulation(noFeesEnvelopes, globalParams, events),
    [noFeesEnvelopes, globalParams, events]
  )

  const chartData = results.map((r, i) => ({
    year: r.year,
    withFees: Math.round(r.totalNominal),
    gap: Math.round((noFeesResults[i]?.totalNominal ?? r.totalNominal) - r.totalNominal),
  }))

  const noFeesLast = noFeesResults[results.length - 1]
  const saving = noFeesLast ? Math.round(noFeesLast.totalNominal - lastResult.totalNominal) : 0

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <div>
          <div className="small" style={{ color: 'var(--ink-secondary)' }}>Simulation avec vs sans frais</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="caption" style={{ color: 'var(--ink-tertiary)' }}>Économie potentielle</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)' }}>{formatEur(saving)}</div>
        </div>
      </div>

      <div className="row gap16" style={{ marginBottom: 12 }}>
        <div className="row gap8" style={{ alignItems: 'center' }}>
          <span style={{ width: 12, height: 8, borderRadius: 2, background: '#818cf8', opacity: 0.7, display: 'inline-block' }} />
          <span className="caption" style={{ color: 'var(--ink-tertiary)' }}>Avec frais actuels</span>
        </div>
        <div className="row gap8" style={{ alignItems: 'center' }}>
          <span style={{ width: 12, height: 8, borderRadius: 2, background: '#f87171', opacity: 0.5, display: 'inline-block' }} />
          <span className="caption" style={{ color: 'var(--ink-tertiary)' }}>Coût des frais</span>
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

      <p className="caption" style={{ color: 'var(--ink-tertiary)', marginTop: 8, textAlign: 'center', opacity: 0.7 }}>
        Le sommet de la zone rouge = capital sans frais. La zone rouge = manque à gagner cumulé.
      </p>
    </div>
  )
}

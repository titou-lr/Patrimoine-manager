import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatEur } from '../../utils/format'
import type { SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
}

export default function InflationChart({ results }: Props) {
  if (!results.length) return null

  const data = useMemo(
    () =>
      results.map((r) => ({
        year: r.year,
        real: Math.round(r.totalReal),
        loss: Math.round(r.totalNominal - r.totalReal),
      })),
    [results]
  )

  const last = results[results.length - 1]
  const lastLoss = last ? Math.round(last.totalNominal - last.totalReal) : 0
  const lastNominal = last ? Math.round(last.totalNominal) : 0
  const lastReal = last ? Math.round(last.totalReal) : 0

  return (
    <div>
      <div className="row gap16 caption" style={{ marginBottom: 10 }}>
        <span className="row gap6">
          <span style={{ width: 12, height: 12, borderRadius: 99, background: '#5e6ad2', display: 'inline-block' }} />
          Valeur réelle
        </span>
        <span className="row gap6">
          <span style={{ width: 12, height: 12, borderRadius: 99, background: '#e0795a', opacity: 0.6, display: 'inline-block' }} />
          Érosion inflation
        </span>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} style={{ overflow: 'hidden' }}>
          <CartesianGrid strokeDasharray="1 0" stroke="var(--hairline-soft)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--ink-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' } as any}
            tickFormatter={(v) => String(v)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--ink-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' } as any}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<InflationTooltip />} />

          <Area
            type="monotone"
            dataKey="real"
            stackId="1"
            name="Valeur réelle"
            fill="#5e6ad2"
            fillOpacity={0.45}
            stroke="#5e6ad2"
            strokeWidth={2}
          />

          <Area
            type="monotone"
            dataKey="loss"
            stackId="1"
            name="Perte inflation"
            fill="#e0795a"
            fillOpacity={0.30}
            stroke="transparent"
          />

        </ComposedChart>
      </ResponsiveContainer>

      {/* Stats finales */}
      {last && (
        <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center text-[10px]">
          <div>
            <div className="text-muted">Nominal</div>
            <div className="text-orange font-semibold text-xs mt-0.5">{formatEur(lastNominal)}</div>
          </div>
          <div>
            <div className="text-muted">Réel</div>
            <div className="text-purple font-semibold text-xs mt-0.5">{formatEur(lastReal)}</div>
          </div>
          <div>
            <div className="text-muted">Perte pouvoir d'achat</div>
            <div className="text-danger font-semibold text-xs mt-0.5">
              {lastNominal > 0 ? ((lastLoss / lastNominal) * 100).toFixed(0) : 0} %
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TooltipPayload { dataKey: string; value: number }

function InflationTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: number }) {
  if (!active || !payload?.length) return null
  const real = payload.find((p) => p.dataKey === 'real')?.value ?? 0
  const loss = payload.find((p) => p.dataKey === 'loss')?.value ?? 0
  const nominal = real + loss
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-xs shadow-lg">
      <div className="text-muted mb-2 font-medium">Année {label}</div>
      <div className="flex justify-between gap-6 py-0.5">
        <span className="text-purple">Valeur réelle</span>
        <span className="text-foreground font-medium">{formatEur(real)}</span>
      </div>
      <div className="flex justify-between gap-6 py-0.5">
        <span className="text-orange">Valeur nominale</span>
        <span className="text-foreground font-medium">{formatEur(nominal)}</span>
      </div>
      <div className="flex justify-between gap-6 pt-2 border-t border-border mt-1">
        <span className="text-danger">Perte inflation</span>
        <span className="text-danger font-semibold">−{formatEur(loss)}</span>
      </div>
    </div>
  )
}

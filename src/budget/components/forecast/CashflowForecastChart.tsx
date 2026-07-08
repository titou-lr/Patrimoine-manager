import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useBudgetStore } from '../../store/useBudgetStore'
import { forecastCashflow } from '../../engine/forecastEngine'
import { formatEur } from '../../../utils/format'

const CHART_AXIS = { fill: 'var(--ink-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' } as const

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'short' })
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'Haute confiance (≥ 3 mois d\'historique)',
  medium: 'Confiance moyenne (1-2 mois)',
  low: 'Faible confiance (pas d\'historique suffisant)',
}

const CONFIDENCE_COLOR: Record<string, string> = {
  high: 'var(--success)',
  medium: '#eb9234',
  low: 'var(--danger)',
}

interface TooltipProps {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-1)', border: '1px solid var(--hairline)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: 'var(--ink-secondary)' }}>{p.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)', marginLeft: 'auto' }}>
            {formatEur(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CashflowForecastChart() {
  const { transactions, recurringRules } = useBudgetStore()

  const forecast = useMemo(
    () => forecastCashflow(transactions, recurringRules, 6),
    [transactions, recurringRules]
  )

  const confidence = forecast[0]?.confidence ?? 'low'

  if (forecast.length === 0) {
    return (
      <div className="panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-tertiary)', fontSize: 13 }}>
        Pas encore de données pour générer une prévision.
      </div>
    )
  }

  const chartData = forecast.map((pt) => ({
    month: monthLabel(pt.month),
    'Revenus estimés': pt.projectedIncome,
    'Dépenses estimées': pt.projectedExpenses,
    'Solde net': pt.projectedBalance,
  }))

  return (
    <div className="panel" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', flex: 1 }}>
          Prévision de trésorerie — 6 mois
        </span>
        <span style={{
          fontSize: 11,
          color: CONFIDENCE_COLOR[confidence],
          background: 'var(--surface-2)',
          borderRadius: 4,
          padding: '2px 8px',
        }}>
          {CONFIDENCE_LABEL[confidence]}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--hairline-soft)"
            vertical={false}
          />
          <XAxis dataKey="month" tick={CHART_AXIS} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
            tick={CHART_AXIS}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--ink-tertiary)' }}
            iconType="circle"
            iconSize={8}
          />
          <Bar
            dataKey="Revenus estimés"
            fill="var(--success)"
            opacity={0.35}
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="Dépenses estimées"
            fill="var(--danger)"
            opacity={0.35}
            radius={[3, 3, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="Solde net"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ fill: 'var(--primary)', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 10, marginBottom: 0 }}>
        Projection basée sur la moyenne des mois passés complets + règles récurrentes actives.
        Les valeurs futures sont des estimations, non des garanties.
      </p>
    </div>
  )
}

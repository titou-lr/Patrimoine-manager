import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatEur } from '../../utils/format'
import type { Envelope, EnvelopeType, SimulationResult } from '../../types'

const ENVELOPE_COLORS: Record<EnvelopeType, string> = {
  pea:          '#2563EB',  // cobalt
  cto:          '#3B82F6',  // blue-500
  per:          '#0EA5E9',  // sky-500
  assurance_vie:'#06B6D4',  // cyan-500
  livret_a:     '#6366F1',  // indigo-500
  ldds:         '#8B5CF6',  // violet-500
  livret_jeune: '#64748B',  // slate-500
}

interface Props {
  envelope: Envelope
  miniResults: SimulationResult[]
}

interface KpiProps { label: string; value: string; accent?: 'warning' | 'success' }

function KpiLine({ label, value, accent }: KpiProps) {
  const color = accent === 'warning' ? 'text-warning' : accent === 'success' ? 'text-success' : 'text-foreground'
  return (
    <div className="flex items-baseline justify-between gap-1">
      <span className="text-[10px] text-muted truncate">{label}</span>
      <span className={`text-xs font-mono font-medium tabular-nums shrink-0 ${color}`}>{value}</span>
    </div>
  )
}

interface TooltipEntry { name: string; value: number; color: string }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: number }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 10px', fontSize: 11 }}>
      <p style={{ color: 'var(--color-muted)', marginBottom: 4 }}>Année {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name} : {formatEur(p.value)}</p>
      ))}
    </div>
  )
}

export default function EnvelopeProjectionSection({ envelope, miniResults }: Props) {
  if (miniResults.length === 0) {
    return (
      <p className="text-[11px] text-muted py-2">
        Activez l'enveloppe et ajoutez des actifs pour voir la projection.
      </p>
    )
  }

  const lastR = miniResults[miniResults.length - 1].byEnvelope[envelope.id]
  if (!lastR) return null

  const chartData = miniResults.map((r) => {
    const er = r.byEnvelope[envelope.id]
    return { year: r.year, Nominal: Math.round(er?.capital ?? 0), Réel: Math.round(er?.realValue ?? 0) }
  })

  const initialBalance = Math.max(1, envelope.currentRealValue ?? envelope.initialCapital)
  const annualRealReturn = lastR.realValue > 0
    ? (Math.pow(lastR.realValue / initialBalance, 1 / miniResults.length) - 1) * 100
    : 0

  const envColor = ENVELOPE_COLORS[envelope.type]

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={90}>
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <XAxis dataKey="year" hide />
          <YAxis hide />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="Nominal" stroke={envColor} strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="Réel" stroke="#71717A" strokeWidth={1} dot={false} strokeDasharray="3 3" />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 inline-block" style={{ background: envColor }} /> Nominal</span>
        <span className="flex items-center gap-1"><span className="w-4 h-0.5 inline-block border-t border-dashed border-muted" /> Réel (inflation)</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <KpiLine label="Capital final" value={formatEur(lastR.capital)} />
        <KpiLine label="Gains bruts" value={formatEur(lastR.grossGains)} />
        <KpiLine label="Impôts estimés" value={formatEur(lastR.tax)} accent="warning" />
        <KpiLine label="Gains nets" value={formatEur(lastR.totalGains)} accent="success" />
        <KpiLine label="Rendement réel ann." value={`${annualRealReturn.toFixed(1)} %`} />
        <KpiLine label="Frais cumulés" value={formatEur(lastR.totalFeesPaid)} />
      </div>

      {lastR.taxDetails && (
        <p className="text-[10px] text-muted italic">{lastR.taxDetails}</p>
      )}
    </div>
  )
}

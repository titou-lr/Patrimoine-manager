import { useMemo, useState } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatEur } from '../../utils/format'
import type { Envelope, EnvelopeType, LifeEvent, MonteCarloResult, SimulationResult } from '../../types'

const ENVELOPE_COLORS: Record<EnvelopeType, string> = {
  pea:          '#5e6ad2',
  cto:          '#6c8cd5',
  per:          '#8b6bd2',
  assurance_vie:'#828fff',
  livret_a:     '#4cb782',
  ldds:         '#34a06e',
  livret_jeune: '#62666d',
}

const CHART_GRID  = 'var(--hairline-soft)'
const CHART_AXIS  = { fill: 'var(--ink-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' } as const

const EVENT_EMOJI: Record<string, string> = {
  pause:            '⏸',
  windfall:         '💰',
  withdrawal:       '🏠',
  expense_increase: '📈',
  child:            '👶',
  custom:           '✏️',
}

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
  events?: LifeEvent[]
  monteCarloResults?: MonteCarloResult[]
}

export default function PatrimoineChart({ results, envelopes, events = [], monteCarloResults }: Props) {
  const active = envelopes.filter((e) => e.active)
  const isAdvanced = (monteCarloResults?.length ?? 0) > 0
  const [chartRange, setChartRange] = useState<'10a' | 'max'>('max')

  const data = useMemo(
    () =>
      results.map((r) => {
        const row: Record<string, number> = { year: r.year, real: r.totalReal }
        for (const env of active) {
          row[env.id] = r.byEnvelope[env.id]?.capital ?? 0
        }
        return row
      }),
    [results, envelopes]
  )

  const mcData = useMemo(
    () =>
      (monteCarloResults ?? []).map(mc => ({
        year: mc.year,
        p10: Math.round(mc.p10),
        p50: Math.round(mc.p50),
        p90: Math.round(mc.p90),
      })),
    [monteCarloResults]
  )

  const chartData = chartRange === '10a' ? data.filter(d => d.year <= 10) : data
  const chartMcData = chartRange === '10a' ? mcData.filter(d => d.year <= 10) : mcData

  // Deduplicate events at the same year (show combined label)
  const eventsByYear = useMemo(() => {
    const map: Record<number, LifeEvent[]> = {}
    for (const ev of events) {
      const y = Math.round(ev.yearOffset)
      if (y >= 1 && y <= results.length) {
        if (!map[y]) map[y] = []
        map[y].push(ev)
      }
    }
    return map
  }, [events, results.length])

  return (
    <div>
      <div className="mb-4">
        {isAdvanced ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] text-muted bg-elevated rounded-full px-2.5 py-1">
              <span className="w-4 inline-block shrink-0" style={{ borderTop: '1.5px dashed #22c55e' }} />
              Favorable (P90)
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted bg-elevated rounded-full px-2.5 py-1">
              <span className="w-4 inline-block shrink-0" style={{ borderTop: '2px solid #f97316' }} />
              Médian (P50)
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-muted bg-elevated rounded-full px-2.5 py-1">
              <span className="w-4 inline-block shrink-0" style={{ borderTop: '1.5px dashed #ef4444' }} />
              Défavorable (P10)
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {active.map((env) => (
              <span
                key={env.id}
                className="flex items-center gap-1.5 text-[10px] text-muted bg-elevated rounded-full px-2.5 py-1"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: ENVELOPE_COLORS[env.type] }}
                />
                {env.label}
              </span>
            ))}
            <span className="flex items-center gap-2 text-[10px] text-muted bg-elevated rounded-full px-2.5 py-1">
              <span
                className="w-4 inline-block shrink-0"
                style={{ borderTop: '1.5px dashed #6B7280' }}
              />
              Valeur réelle
            </span>
            {events.length > 0 && (
              <span className="text-[10px] text-muted bg-elevated rounded-full px-2.5 py-1">
                ┆ événements de vie
              </span>
            )}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={300} style={{ overflow: 'hidden' }}>
        <ComposedChart
          data={isAdvanced ? chartMcData : chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="1 0" vertical={false} />
          <XAxis
            dataKey="year"
            tick={CHART_AXIS}
            tickFormatter={(v) => String(v)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={CHART_AXIS}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={isAdvanced
            ? <MCBandTooltip />
            : <ChartTooltip eventsByYear={eventsByYear} />
          } />

          {isAdvanced ? (
            <>
              {/* Bande P10→P90 */}
              <Area
                type="monotone"
                dataKey="p90"
                fill="#5e6ad2"
                fillOpacity={0.13}
                stroke="none"
                legendType="none"
              />
              <Area
                type="monotone"
                dataKey="p10"
                fill="#fff"
                fillOpacity={0}
                stroke="none"
                legendType="none"
              />
              <Line
                type="monotone"
                dataKey="p50"
                stroke="#828fff"
                strokeWidth={2.4}
                dot={false}
                name="Médian (P50)"
              />
              <Line
                type="monotone"
                dataKey="p90"
                stroke="#4cb782"
                strokeWidth={1.3}
                strokeDasharray="4 3"
                dot={false}
                name="Favorable (P90)"
              />
              <Line
                type="monotone"
                dataKey="p10"
                stroke="#e0795a"
                strokeWidth={1.3}
                strokeDasharray="4 3"
                dot={false}
                name="Défavorable (P10)"
              />
            </>
          ) : (
            <>
              {active.map((env, idx) => {
                const opacity = active.length > 1
                  ? 0.3 + (0.3 * idx / (active.length - 1))
                  : 0.5
                return (
                  <Area
                    key={env.id}
                    type="monotone"
                    dataKey={env.id}
                    stackId="1"
                    name={env.label}
                    fill={ENVELOPE_COLORS[env.type]}
                    fillOpacity={opacity}
                    stroke={ENVELOPE_COLORS[env.type]}
                    strokeWidth={1}
                  />
                )
              })}

              <Line
                type="monotone"
                dataKey="real"
                name="Valeur réelle"
                stroke="#62666d"
                strokeDasharray="4 3"
                dot={false}
                strokeWidth={1.5}
              />
            </>
          )}

          {/* Annotations événements de vie */}
          {!isAdvanced && Object.entries(eventsByYear).map(([year, evs]) => {
            const emojis = evs.map((e) => EVENT_EMOJI[e.type] ?? '📅').join(' ')
            return (
              <ReferenceLine
                key={`event_${year}`}
                x={Number(year)}
                stroke="#3A3E48"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: emojis,
                  position: 'top',
                  fill: '#9CA3AF',
                  fontSize: 12,
                  offset: 6,
                }}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <div className="seg">
          {([['10a', '10 ans'], ['max', 'Tout l\'horizon']] as const).map(([k, l]) => (
            <button
              key={k}
              style={{ fontSize: 12, height: 26 }}
              className={chartRange === k ? 'on' : ''}
              onClick={() => setChartRange(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

interface MCBandPayload { dataKey: string; name: string; value: number; stroke: string }

function MCBandTooltip({ active, payload, label }: {
  active?: boolean; payload?: MCBandPayload[]; label?: number
}) {
  if (!active || !payload?.length) return null
  const visible = payload.filter(p => ['p10', 'p50', 'p90'].includes(p.dataKey))
  return (
    <div className="bg-overlay border border-border-mid rounded-xl p-3 text-xs min-w-40 shadow-xl">
      <div className="text-muted mb-2">Année {label}</div>
      {visible.map(p => (
        <div key={p.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: p.stroke }}>{p.name}</span>
          <span className="text-foreground font-mono tabular-nums">{formatEur(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

interface TooltipPayload { dataKey: string; name: string; value: number; fill: string }

function ChartTooltip({
  active,
  payload,
  label,
  eventsByYear,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: number
  eventsByYear: Record<number, LifeEvent[]>
}) {
  if (!active || !payload?.length) return null
  const envelopeEntries = payload.filter((p) => p.dataKey !== 'real')
  const realEntry = payload.find((p) => p.dataKey === 'real')
  const total = envelopeEntries.reduce((s, p) => s + (p.value ?? 0), 0)
  const yearEvents = label != null ? (eventsByYear[label] ?? []) : []

  return (
    <div className="bg-overlay border border-border-mid rounded-xl p-3 text-xs min-w-44 shadow-xl">
      <div className="text-muted mb-2">Année {label}</div>
      {envelopeEntries.map((p) => (
        <div key={p.dataKey} className="flex justify-between gap-4 py-0.5">
          <span style={{ color: p.fill }}>{p.name}</span>
          <span className="text-foreground font-mono tabular-nums">{formatEur(p.value ?? 0)}</span>
        </div>
      ))}
      <div className="border-t border-border mt-2 pt-2 space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-muted">Nominal</span>
          <span className="text-orange font-mono font-semibold tabular-nums">{formatEur(total)}</span>
        </div>
        {realEntry && (
          <div className="flex justify-between gap-4">
            <span className="text-muted">Réel</span>
            <span className="text-muted font-mono tabular-nums">{formatEur(realEntry.value ?? 0)}</span>
          </div>
        )}
      </div>
      {yearEvents.length > 0 && (
        <div className="border-t border-border mt-2 pt-2">
          {yearEvents.map((ev) => (
            <div key={ev.id} className="text-muted py-0.5">
              {EVENT_EMOJI[ev.type] ?? '📅'} {ev.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

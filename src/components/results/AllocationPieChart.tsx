import { PieChart, Pie, Cell } from 'recharts'
import { formatEur } from '../../utils/format'
import type { Envelope, EnvelopeType, SimulationResult } from '../../types'

const ENVELOPE_COLORS: Record<EnvelopeType, string> = {
  pea:          '#5e6ad2',
  cto:          '#6c8cd5',
  per:          '#8b6bd2',
  assurance_vie:'#828fff',
  livret_a:     '#4cb782',
  ldds:         '#34a06e',
  livret_jeune: '#62666d',
}

interface PieEntry {
  name: string
  value: number
  color: string
}

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
}

export default function AllocationPieChart({ results, envelopes }: Props) {
  const last = results[results.length - 1]
  if (!last) return null

  const data: PieEntry[] = envelopes
    .filter((e) => e.active && last.byEnvelope[e.id])
    .map((e) => ({
      name: e.label,
      value: Math.round(last.byEnvelope[e.id].capital),
      color: ENVELOPE_COLORS[e.type],
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null

  return (
    <div className="row gap24" style={{ alignItems: 'center' }}>
      {/* Donut 160×160 */}
      <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0, overflow: 'hidden' }}>
        <PieChart width={160} height={160}>
          <Pie
            data={data}
            cx={80}
            cy={80}
            innerRadius={54}
            outerRadius={72}
            dataKey="value"
            paddingAngle={1}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div className="eyebrow" style={{ fontSize: 9 }}>TOTAL</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)' }}>
            {formatEur(total)}
          </div>
        </div>
      </div>

      {/* Légende droite */}
      <div className="col gap8" style={{ minWidth: 160, flex: 1 }}>
        {data.map(d => {
          const pct = Math.round((d.value / total) * 100)
          return (
            <div key={d.name} className="row gap8" style={{ alignItems: 'center' }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: d.color, flexShrink: 0 }} />
              <span className="small grow">{d.name}</span>
              <div style={{ width: 60, height: 3, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 99 }} />
              </div>
              <span className="mono small muted" style={{ textAlign: 'right', width: 72, flexShrink: 0 }}>
                {formatEur(d.value)}
              </span>
              <span className="mono caption" style={{ textAlign: 'right', width: 36, color: 'var(--ink-tertiary)', flexShrink: 0 }}>
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

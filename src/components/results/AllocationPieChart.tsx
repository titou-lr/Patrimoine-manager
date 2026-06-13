import { useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { formatEur } from '../../utils/format'
import type { Envelope, EnvelopeType, SimulationResult } from '../../types'

const ENVELOPE_COLORS: Record<EnvelopeType, string> = {
  pea:           '#5e6ad2',
  cto:           '#6c8cd5',
  per:           '#8b6bd2',
  assurance_vie: '#828fff',
  livret_a:      '#4cb782',
  ldds:          '#34a06e',
  livret_jeune:  '#62666d',
}

// Regroupement large par type d'enveloppe
const CLASS_MAP: Record<EnvelopeType, string> = {
  pea:           'Actions',
  cto:           'Actions',
  per:           'Long terme',
  assurance_vie: 'Long terme',
  livret_a:      'Livrets',
  ldds:          'Livrets',
  livret_jeune:  'Livrets',
}

const CLASS_COLORS: Record<string, string> = {
  Actions:      '#5e6ad2',
  'Long terme': '#8b6bd2',
  Livrets:      '#4cb782',
}

interface PieEntry {
  name: string
  value: number
  color: string
  type?: EnvelopeType
}

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
}

export default function AllocationPieChart({ results, envelopes }: Props) {
  const [yearIdx, setYearIdx] = useState<number>(-1) // -1 = dernière année

  if (!results.length) return null
  const effectiveIdx = yearIdx < 0 ? results.length - 1 : Math.min(yearIdx, results.length - 1)
  const snap = results[effectiveIdx]
  if (!snap) return null

  const data: PieEntry[] = envelopes
    .filter((e) => e.active && snap.byEnvelope[e.id])
    .map((e) => ({
      name: e.label,
      value: Math.round(snap.byEnvelope[e.id].capital),
      color: ENVELOPE_COLORS[e.type],
      type: e.type,
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const total = data.reduce((s, d) => s + d.value, 0)
  if (!total) return null

  // Donut 2 — par classe
  const classTotals: Record<string, number> = {}
  for (const d of data) {
    const cls = CLASS_MAP[d.type!] ?? 'Autres'
    classTotals[cls] = (classTotals[cls] ?? 0) + d.value
  }
  const classData: PieEntry[] = Object.entries(classTotals)
    .map(([name, value]) => ({ name, value, color: CLASS_COLORS[name] ?? '#5e6ad2' }))
    .sort((a, b) => b.value - a.value)
  const dominant = classData[0]
  const dominantPct = dominant ? Math.round((dominant.value / total) * 100) : 0

  return (
    <div className="col gap24">

      {/* Sélecteur d'année */}
      <div className="row gap8" style={{ alignItems: 'center' }}>
        <span className="eyebrow">Année</span>
        <input
          type="range"
          min={0}
          max={results.length - 1}
          value={effectiveIdx}
          onChange={e => setYearIdx(Number(e.target.value))}
          style={{ width: 120, accentColor: 'var(--primary)' }}
        />
        <span className="mono small" style={{ width: 48 }}>An {snap.year}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setYearIdx(-1)}
          style={{ fontSize: 11, padding: '2px 8px', opacity: effectiveIdx === results.length - 1 ? 0.4 : 1 }}
        >
          Fin
        </button>
      </div>

      {/* Donuts */}
      <div className="row gap32" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Donut 1 — par enveloppe */}
        <div className="row gap24" style={{ alignItems: 'center', flex: 1, minWidth: 260 }}>
          <div style={{ width: 160, height: 160, flexShrink: 0 }}>
            <PieChart width={160} height={160}>
              <Pie
                data={data}
                cx={80} cy={80}
                innerRadius={54} outerRadius={72}
                dataKey="value"
                paddingAngle={1}
                startAngle={90} endAngle={-270}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </div>

          {/* Colonne droite : info + légende enveloppes */}
          <div className="col" style={{ gap: 5, flex: 1 }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-tertiary)' }}>Total</div>
              <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{formatEur(total)}</div>
            </div>
            {data.map(d => {
              const pct = Math.round((d.value / total) * 100)
              return (
                <div key={d.name} className="row gap6" style={{ alignItems: 'center' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span className="small grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.name}
                  </span>
                  <div style={{ width: 48, height: 3, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 99 }} />
                  </div>
                  <span className="mono caption" style={{ textAlign: 'right', width: 68, flexShrink: 0, color: 'var(--ink-secondary)' }}>
                    {formatEur(d.value)}
                  </span>
                  <span className="mono caption" style={{ textAlign: 'right', width: 30, color: 'var(--ink-tertiary)', flexShrink: 0 }}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel classe — liste pure, pas de donut */}
        <div className="col" style={{ gap: 5, flex: 1, minWidth: 200 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--ink)', lineHeight: 1 }}>{dominantPct}%</div>
            <div style={{ fontSize: 10, opacity: 0.65, color: 'var(--ink-tertiary)', marginTop: 3 }}>{dominant?.name}</div>
          </div>
          {classData.map(d => {
            const pct = Math.round((d.value / total) * 100)
            return (
              <div key={d.name} className="row gap6" style={{ alignItems: 'center' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                <span className="small grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </span>
                <div style={{ width: 48, height: 3, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 99 }} />
                </div>
                <span className="mono caption" style={{ textAlign: 'right', width: 68, flexShrink: 0, color: 'var(--ink-secondary)' }}>
                  {formatEur(d.value)}
                </span>
                <span className="mono caption" style={{ textAlign: 'right', width: 30, color: 'var(--ink-tertiary)', flexShrink: 0 }}>
                  {pct}%
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}

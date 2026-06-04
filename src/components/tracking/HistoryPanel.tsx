import { useState, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { useStore, selectActiveSim } from '../../store/useStore'
import { formatEur } from '../../utils/format'
import type { Envelope, EnvelopeType, SimulationResult, HistoryEntry } from '../../types'

// Couleurs synchronisées avec PatrimoineChart
const ENVELOPE_COLORS: Record<EnvelopeType, string> = {
  pea:          '#2563EB',
  cto:          '#3B82F6',
  per:          '#0EA5E9',
  assurance_vie:'#06B6D4',
  livret_a:     '#6366F1',
  ldds:         '#8B5CF6',
  livret_jeune: '#64748B',
}

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
  onClose: () => void
}

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000

export default function HistoryPanel({ results, envelopes, onClose }: Props) {
  const { addHistoryEntry, removeHistoryEntry } = useStore()
  const { history } = useStore(selectActiveSim)
  const safeHistory = history ?? []

  const active = envelopes.filter((e) => e.active)
  const today = new Date().toISOString().slice(0, 10)

  // Form state
  const [formEnvId, setFormEnvId] = useState(active[0]?.id ?? '')
  const [formDate, setFormDate] = useState(today)
  const [formValue, setFormValue] = useState('')
  const [formNote, setFormNote] = useState('')

  function handleAdd() {
    const val = parseFloat(formValue)
    if (!formEnvId || !formDate || isNaN(val) || val < 0) return
    addHistoryEntry({
      id: `he_${Date.now()}`,
      envelopeId: formEnvId,
      date: formDate,
      realValue: val,
      note: formNote.trim() || undefined,
    })
    setFormValue('')
    setFormNote('')
  }

  // Group history by envelope
  const byEnv = useMemo(() => {
    const map: Record<string, HistoryEntry[]> = {}
    for (const e of safeHistory) {
      if (!map[e.envelopeId]) map[e.envelopeId] = []
      map[e.envelopeId].push(e)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.date.localeCompare(b.date))
    }
    return map
  }, [safeHistory])

  // Envelopes with at least one history entry
  const activeWithHistory = active.filter((e) => (byEnv[e.id]?.length ?? 0) > 0)

  // Build chart data: simulated line + real points
  const chartData = useMemo(() => {
    if (!results.length || !activeWithHistory.length) return []
    const todayMs = Date.now()

    // Base: one row per year of simulation (x = year from today)
    const rows: Record<string, number | null>[] = results.map((r) => {
      const row: Record<string, number | null> = { yearX: r.year }
      for (const env of activeWithHistory) {
        row[`${env.id}_sim`] = r.byEnvelope[env.id]?.capital ?? null
        row[`${env.id}_real`] = null
      }
      return row
    })

    // Inject real entries as extra rows or fill existing ones
    for (const entry of safeHistory) {
      const envObj = activeWithHistory.find((e) => e.id === entry.envelopeId)
      if (!envObj) continue
      const yearOffset = (new Date(entry.date).getTime() - todayMs) / MS_PER_YEAR
      const yearX = Math.max(0, yearOffset)

      // Find the closest existing row or insert
      const closest = rows.reduce((best, row) => {
        const d = Math.abs((row.yearX as number) - yearX)
        const bd = Math.abs((best.yearX as number) - yearX)
        return d < bd ? row : best
      }, rows[0])

      if (Math.abs((closest.yearX as number) - yearX) < 0.5) {
        closest[`${entry.envelopeId}_real`] = entry.realValue
      }
    }

    return rows
  }, [results, activeWithHistory, safeHistory])

  // Detect divergences (last real entry vs simulated at same year)
  const divergences: { envLabel: string; pct: number }[] = useMemo(() => {
    const divs: { envLabel: string; pct: number }[] = []
    for (const env of activeWithHistory) {
      const entries = byEnv[env.id] ?? []
      if (!entries.length) continue
      const last = entries[entries.length - 1]
      const todayMs = Date.now()
      const yearOffset = (new Date(last.date).getTime() - todayMs) / MS_PER_YEAR
      const simYear = Math.min(results.length, Math.max(1, Math.round(yearOffset)))
      const simResult = results[simYear - 1]
      const simVal = simResult?.byEnvelope[env.id]?.capital ?? 0
      if (simVal > 0) {
        const pct = ((last.realValue - simVal) / simVal) * 100
        if (Math.abs(pct) > 5) divs.push({ envLabel: env.label, pct })
      }
    }
    return divs
  }, [activeWithHistory, byEnv, results])

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      {/* Backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-md bg-surface border-l border-border flex flex-col overflow-hidden shadow-2xl animate-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <div className="text-sm font-semibold text-foreground">Suivi réel</div>
            <div className="text-xs text-muted mt-0.5">
              Comparez vos valeurs réelles à la simulation
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Section 1 — Saisie ──────────────────────────────────── */}
          <div className="px-5 py-4 border-b border-border">
            <div className="text-xs text-muted uppercase tracking-widest font-medium mb-3">
              Enregistrer une valeur
            </div>
            <div className="flex flex-col gap-2.5">
              <select
                value={formEnvId}
                onChange={(e) => setFormEnvId(e.target.value)}
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-orange"
              >
                {active.map((env) => (
                  <option key={env.id} value={env.id}>{env.label}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-orange"
                />
                <div className="relative">
                  <input
                    type="number"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    placeholder="Valeur (€)"
                    min={0}
                    className="w-full bg-elevated border border-border rounded-lg pl-3 pr-7 py-2 text-sm text-foreground focus:outline-none focus:border-orange font-mono"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted text-xs">€</span>
                </div>
              </div>

              <input
                type="text"
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                placeholder="Note optionnelle…"
                className="bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-orange"
              />

              <button
                onClick={handleAdd}
                disabled={!formEnvId || !formDate || !formValue}
                className="w-full py-2 rounded-lg bg-orange text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange/90 transition-colors"
              >
                Enregistrer
              </button>
            </div>
          </div>

          {/* ── Section 2 — Historique ───────────────────────────────── */}
          {safeHistory.length > 0 && (
            <div className="px-5 py-4 border-b border-border">
              <div className="text-xs text-muted uppercase tracking-widest font-medium mb-3">
                Historique ({safeHistory.length} entrée{safeHistory.length > 1 ? 's' : ''})
              </div>
              <div className="flex flex-col gap-3">
                {active.map((env) => {
                  const entries = byEnv[env.id] ?? []
                  if (!entries.length) return null
                  return (
                    <div key={env.id}>
                      <div
                        className="text-xs font-medium mb-1.5 flex items-center gap-2"
                        style={{ color: ENVELOPE_COLORS[env.type] }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: ENVELOPE_COLORS[env.type] }}
                        />
                        {env.label}
                      </div>
                      <div className="flex flex-col gap-1">
                        {entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between gap-2 bg-elevated rounded-lg px-3 py-2 group"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-mono text-foreground">
                                {formatEur(entry.realValue)}
                              </span>
                              <span className="text-[10px] text-muted">{entry.date}</span>
                              {entry.note && (
                                <span className="text-[10px] text-muted italic">{entry.note}</span>
                              )}
                            </div>
                            <button
                              onClick={() => removeHistoryEntry(entry.id)}
                              className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Section 3 — Graphique Prévu vs Réel ─────────────────── */}
          {activeWithHistory.length > 0 && chartData.length > 0 && (
            <div className="px-5 py-4">
              <div className="text-xs text-muted uppercase tracking-widest font-medium mb-3">
                Prévu vs Réel
              </div>

              {/* Alertes divergences */}
              {divergences.map((d) => (
                <div
                  key={d.envLabel}
                  className="mb-3 border-l-2 border-l-warning bg-surface border border-border border-l-0 rounded-r-lg px-3 py-2 text-xs text-muted"
                >
                  <span className="text-warning font-medium">{d.envLabel} :</span>{' '}
                  écart de{' '}
                  <span className={d.pct > 0 ? 'text-success' : 'text-danger'}>
                    {d.pct > 0 ? '+' : ''}{d.pct.toFixed(1)}%
                  </span>{' '}
                  entre réel et simulé — vérifiez vos paramètres.
                </div>
              ))}

              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#262931" strokeDasharray="1 0" vertical={false} />
                  <XAxis
                    dataKey="yearX"
                    tick={{ fill: '#6B7280', fontSize: 9 }}
                    tickFormatter={(v) => String(Math.round(v))}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6B7280', fontSize: 9 }}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <Tooltip content={<HistoryTooltip envelopes={activeWithHistory} />} />

                  {activeWithHistory.map((env) => (
                    <>
                      {/* Ligne simulée — pointillée */}
                      <Line
                        key={`${env.id}_sim`}
                        type="monotone"
                        dataKey={`${env.id}_sim`}
                        name={`${env.label} — Simulé`}
                        stroke={ENVELOPE_COLORS[env.type]}
                        strokeDasharray="5 4"
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                      />
                      {/* Points réels — pleine */}
                      <Line
                        key={`${env.id}_real`}
                        type="monotone"
                        dataKey={`${env.id}_real`}
                        name={`${env.label} — Réel`}
                        stroke={ENVELOPE_COLORS[env.type]}
                        strokeWidth={2}
                        dot={{ r: 4, fill: ENVELOPE_COLORS[env.type] }}
                        connectNulls={false}
                        legendType="circle"
                      />
                    </>
                  ))}

                  {/* Ligne verticale "aujourd'hui" */}
                  <ReferenceLine x={0} stroke="#3A3E48" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>

              {/* Légende */}
              <div className="flex flex-wrap gap-3 mt-3">
                {activeWithHistory.map((env) => (
                  <div key={env.id} className="flex items-center gap-2 text-[10px] text-muted">
                    <span
                      className="w-4 shrink-0"
                      style={{ borderTop: `1.5px dashed ${ENVELOPE_COLORS[env.type]}`, display: 'inline-block' }}
                    />
                    {env.label} simulé
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: ENVELOPE_COLORS[env.type] }}
                    />
                    réel
                  </div>
                ))}
              </div>
            </div>
          )}

          {safeHistory.length === 0 && (
            <div className="px-5 py-10 text-center text-xs text-muted">
              Aucune valeur enregistrée.<br />
              Saisissez la valeur actuelle d'une enveloppe ci-dessus pour commencer le suivi.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tooltip custom ───────────────────────────────────────────────────────────

interface HistoryTooltipPayload {
  dataKey: string
  name: string
  value: number | null
  stroke: string
}

function HistoryTooltip({
  active,
  payload,
  label,
  envelopes,
}: {
  active?: boolean
  payload?: HistoryTooltipPayload[]
  label?: number
  envelopes: Envelope[]
}) {
  if (!active || !payload?.length) return null
  const relevant = payload.filter((p) => p.value != null)
  if (!relevant.length) return null

  return (
    <div className="bg-overlay border border-border-mid rounded-xl p-3 text-xs min-w-36 shadow-xl">
      <div className="text-muted mb-1.5">Année {Math.round(label ?? 0)}</div>
      {relevant.map((p) => {
        const isReal = p.dataKey.endsWith('_real')
        const envId = p.dataKey.replace(/_sim$|_real$/, '')
        const env = envelopes.find((e) => e.id === envId)
        return (
          <div key={p.dataKey} className="flex justify-between gap-3 py-0.5">
            <span style={{ color: p.stroke }}>
              {env?.label ?? envId} {isReal ? '●' : '- -'}
            </span>
            <span className="font-mono tabular-nums text-foreground">
              {formatEur(p.value ?? 0)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

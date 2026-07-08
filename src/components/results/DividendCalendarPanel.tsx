import { useMemo, useState } from 'react'
import { computeDividendCalendar } from '../../engine/dividendCalendarEngine'
import { formatEur } from '../../utils/format'
import type { Envelope, SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
}

const QUARTER_LABELS = ['T1 (jan–mar)', 'T2 (avr–juin)', 'T3 (juil–sep)', 'T4 (oct–déc)']

export default function DividendCalendarPanel({ results, envelopes }: Props) {
  const [yearIdx, setYearIdx] = useState(0)

  const capitalByEnvelope = useMemo(() => {
    const map: Record<string, number> = {}
    const snap = results[Math.min(yearIdx, results.length - 1)]
    for (const env of envelopes.filter((e) => e.active)) {
      map[env.id] = snap?.byEnvelope[env.id]?.capital ?? 0
    }
    return map
  }, [results, envelopes, yearIdx])

  const calendar = useMemo(
    () => computeDividendCalendar(envelopes, capitalByEnvelope),
    [envelopes, capitalByEnvelope]
  )

  const maxQuarter = Math.max(...calendar.quarters.map((q) => q.total), 1)

  return (
    <div>
      <div className="spread" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="title" style={{ marginBottom: 2 }}>Calendrier de dividendes</div>
          <div className="caption">
            Revenus passifs estimés par trimestre — SCPI, obligations, ETF distribuants et dividendes CTO, selon les rendements saisis
          </div>
        </div>
        <label className="row gap8" style={{ alignItems: 'center', fontSize: 12, color: 'var(--ink-subtle)' }}>
          Année
          <input
            type="range" min={0} max={Math.max(0, results.length - 1)} step={1}
            value={yearIdx}
            onChange={(e) => setYearIdx(Number(e.target.value))}
            style={{ width: 140 }}
          />
          <span className="mono" style={{ minWidth: 34, fontWeight: 600, color: 'var(--ink)' }}>
            {results[Math.min(yearIdx, results.length - 1)]?.year ?? 1}
          </span>
        </label>
      </div>

      {calendar.sources.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 13.5, color: 'var(--ink-subtle)', marginBottom: 4 }}>
            Aucun actif générateur de revenus détecté
          </div>
          <div className="caption" style={{ maxWidth: 480, margin: '0 auto' }}>
            Ajoutez des actifs SCPI, obligations ou ETF distribuants dans vos enveloppes, ou
            configurez les dividendes de votre CTO (taux de dividende ou estimation mensuelle)
            pour voir apparaître le calendrier.
          </div>
        </div>
      ) : (
        <>
          <div className="row gap16" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
            <div className="kpi">
              <div className="kpi-label">Revenus passifs annuels</div>
              <div className="kpi-value" style={{ color: 'var(--success)' }}>{formatEur(calendar.annualTotal)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Moyenne mensuelle</div>
              <div className="kpi-value">{formatEur(calendar.monthlyAverage)}/mois</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Sources</div>
              <div className="kpi-value">{calendar.sources.length}</div>
            </div>
          </div>

          {/* Trimestres */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {calendar.quarters.map((q) => (
              <div key={q.quarter} className="panel" style={{ padding: '12px 14px' }}>
                <div className="caption" style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  {QUARTER_LABELS[q.quarter - 1]}
                </div>
                <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--success)', marginBottom: 8 }}>
                  {formatEur(q.total)}
                </div>
                <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ width: `${(q.total / maxQuarter) * 100}%`, height: '100%', background: 'var(--success)', borderRadius: 99 }} />
                </div>
                {q.bySource.slice(0, 3).map((s, i) => (
                  <div key={i} className="spread" style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginBottom: 2 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{s.label}</span>
                    <span className="mono">{formatEur(s.amount)}</span>
                  </div>
                ))}
                {q.bySource.length > 3 && (
                  <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)' }}>+{q.bySource.length - 3} autres</div>
                )}
              </div>
            ))}
          </div>

          <div className="caption" style={{ fontSize: 11 }}>
            Estimations brutes de fiscalité, basées sur les rendements attendus saisis : les SCPI et ETF distribuants
            versent trimestriellement, les obligations semestriellement (T2/T4), les dividendes CTO selon votre configuration.
          </div>
        </>
      )}
    </div>
  )
}

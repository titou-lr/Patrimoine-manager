import { useMemo, useState } from 'react'
import { STRESS_SCENARIOS, computeStressTest } from '../../engine/stressTestEngine'
import { formatEur, formatPct } from '../../utils/format'
import type { Envelope, SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
}

function recoveryLabel(months: number | null): string {
  if (months === null) return 'Indéterminé'
  if (months === 0) return 'Aucun impact'
  if (months < 12) return `${months} mois`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y} an${y > 1 ? 's' : ''} ${m} mois` : `${y} an${y > 1 ? 's' : ''}`
}

export default function StressTestPanel({ results, envelopes }: Props) {
  const [scenarioId, setScenarioId] = useState(STRESS_SCENARIOS[0].id)
  const [customShock, setCustomShock] = useState(-40)
  const isCustom = scenarioId === 'custom'
  const shockPct = isCustom ? customShock : (STRESS_SCENARIOS.find((s) => s.id === scenarioId)?.shockPct ?? -50)

  const monthlyEffort = envelopes
    .filter((e) => e.active)
    .reduce((s, e) => s + (e.monthlyContribution ?? 0), 0)

  // Choc appliqué au patrimoine simulé de la 1ère année (proche du patrimoine actuel)
  const capitalByEnvelope = useMemo(() => {
    const map: Record<string, number> = {}
    const first = results[0]
    for (const env of envelopes.filter((e) => e.active)) {
      map[env.id] = first?.byEnvelope[env.id]?.capital ?? (env.currentRealValue ?? env.initialCapital ?? 0)
    }
    return map
  }, [results, envelopes])

  const stress = useMemo(
    () => computeStressTest(capitalByEnvelope, envelopes, monthlyEffort, shockPct),
    [capitalByEnvelope, envelopes, monthlyEffort, shockPct]
  )

  return (
    <div>
      <div className="spread" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="title" style={{ marginBottom: 2 }}>Stress test</div>
          <div className="caption">
            Impact d'un krach sur votre patrimoine — livrets protégés, obligations et immobilier partiellement exposés, crypto amplifiée
          </div>
        </div>
        <div className="seg">
          {STRESS_SCENARIOS.map((s) => (
            <button key={s.id} className={scenarioId === s.id ? 'on' : ''} onClick={() => setScenarioId(s.id)} title={s.description}>
              {s.label}
            </button>
          ))}
          <button className={isCustom ? 'on' : ''} onClick={() => setScenarioId('custom')}>
            Personnalisé
          </button>
        </div>
      </div>

      {isCustom && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--ink-subtle)', marginBottom: 14 }}>
          Choc actions
          <input
            type="range" min={-90} max={-5} step={5}
            value={customShock}
            onChange={(e) => setCustomShock(Number(e.target.value))}
            style={{ width: 180 }}
          />
          <span className="mono" style={{ fontWeight: 600, color: 'var(--danger)', minWidth: 48 }}>{customShock} %</span>
        </label>
      )}

      <div className="row gap16" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="kpi">
          <div className="kpi-label">Patrimoine avant choc</div>
          <div className="kpi-value">{formatEur(stress.totalBefore)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Perte estimée</div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>
            -{formatEur(stress.loss)}
          </div>
          <div className="caption" style={{ fontSize: 11 }}>{formatPct(stress.lossPct * 100, 0)} du patrimoine</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Après choc</div>
          <div className="kpi-value">{formatEur(stress.totalAfter)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Temps de récupération</div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{recoveryLabel(stress.recoveryMonths)}</div>
          <div className="caption" style={{ fontSize: 11 }}>
            avec {formatEur(monthlyEffort)}/mois d'épargne + {formatPct(stress.avgAnnualReturnPct, 1)}/an
          </div>
        </div>
      </div>

      {/* Barre exposition */}
      <div style={{ marginBottom: 8 }}>
        <div className="caption" style={{ fontSize: 11, marginBottom: 6 }}>
          Exposition au choc : {formatEur(stress.exposedAmount)} exposés / {formatEur(Math.max(0, stress.totalBefore - stress.exposedAmount))} protégés (livrets, monétaire)
        </div>
        <div style={{ height: 8, borderRadius: 99, overflow: 'hidden', display: 'flex', background: 'var(--hairline)' }}>
          {stress.totalBefore > 0 && (
            <>
              <div style={{ width: `${(stress.exposedAmount / stress.totalBefore) * 100}%`, background: 'var(--danger)', opacity: 0.7 }} />
              <div style={{ flex: 1, background: 'var(--success)', opacity: 0.5 }} />
            </>
          )}
        </div>
      </div>

      <div className="caption" style={{ fontSize: 11 }}>
        Sensibilités appliquées au choc actions : actions ×1, crypto ×1,5, immobilier/SCPI ×0,5, obligations ×0,3,
        livrets réglementés et monétaire ×0. Le choc est appliqué au patrimoine de l'année 1 de la simulation.
      </div>
    </div>
  )
}

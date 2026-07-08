import type { SimulationGapResult } from '../types/budget'

interface Props {
  gap: SimulationGapResult
  onGoToEnvelopes: () => void
}

export default function BudgetVsSimulationBanner({ gap, onGoToEnvelopes }: Props) {
  if (gap.severity === 'ok') return null

  const isCritical = gap.severity === 'critical'
  const color = isCritical ? 'var(--danger)' : '#eb9234'
  const bg = isCritical ? 'rgba(235,87,87,0.08)' : 'rgba(235,146,52,0.08)'
  const border = isCritical ? 'rgba(235,87,87,0.25)' : 'rgba(235,146,52,0.25)'

  const realPct = Math.round(gap.realSavingsRate * 100)
  const assumedPct = Math.round(gap.assumedSavingsRate * 100)
  const delta = Math.round(gap.deltaPct)
  const sign = delta >= 0 ? '+' : ''

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--r-lg)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 15, flexShrink: 0 }}>
        {isCritical ? '⚠️' : '💡'}
      </span>
      <div style={{ flex: 1, fontSize: 13, color: 'var(--ink-secondary)', lineHeight: 1.45 }}>
        Votre taux d'épargne réel ce mois ({realPct}%) diffère de l'hypothèse de simulation ({assumedPct}%) — écart de{' '}
        <strong style={{ color, fontFamily: 'var(--font-mono)' }}>{sign}{delta} pt</strong>.{' '}
        {isCritical
          ? 'Vos projections pourraient être significativement inexactes.'
          : 'Vérifiez la cohérence de vos projections.'}
      </div>
      <button
        className="btn btn-ghost btn-sm"
        onClick={onGoToEnvelopes}
        style={{ flexShrink: 0, fontSize: 12 }}
      >
        Ajuster les paramètres
      </button>
    </div>
  )
}

import { useMemo } from 'react'
import { useStore, selectActiveSim } from '../../store/useStore'
import { useBudgetStore } from '../../budget/store/useBudgetStore'
import { computeMonthlySnapshot } from '../../budget/engine/budgetEngine'
import { averageGoalsProgress } from '../../budget/engine/savingsGoalsEngine'
import { computeHealthScore, type HealthGrade } from '../../engine/healthScoreEngine'
import { computeNetWorth } from '../../engine/netWorthEngine'
import type { SimulationResult } from '../../types'

const GRADE_META: Record<HealthGrade, { label: string; color: string }> = {
  excellent: { label: 'Excellent', color: 'var(--success)' },
  bon:       { label: 'Bon',       color: 'var(--primary-hover)' },
  fragile:   { label: 'Fragile',   color: 'var(--warning)' },
  critique:  { label: 'Critique',  color: 'var(--danger)' },
}

interface Props {
  results: SimulationResult[]
}

export default function HealthScoreCard({ results }: Props) {
  const { liabilities } = useStore(selectActiveSim)
  const {
    transactions: budgetTxs,
    envelopes: budgetEnvs,
    selectedMonth,
    savingsGoals,
  } = useBudgetStore()

  const health = useMemo(() => {
    const hasBudgetData = budgetEnvs.length > 0 || budgetTxs.length > 0
    const snapshot = hasBudgetData ? computeMonthlySnapshot(budgetTxs, budgetEnvs, selectedMonth) : null

    const overruns = snapshot
      ? Object.values(snapshot.byEnvelope).filter((s) => s.remaining < 0).length
      : null

    const debtRatio = results.length > 0
      ? computeNetWorth(results, liabilities ?? [], 0).debtRatio
      : null

    return computeHealthScore({
      realSavingsRate: snapshot && snapshot.totalIncome > 0 ? snapshot.realSavingsRate : null,
      overrunCount: budgetEnvs.filter((e) => e.active).length > 0 ? overruns : null,
      envelopeCount: budgetEnvs.filter((e) => e.active).length || null,
      debtRatio,
      goalsAvgProgress: averageGoalsProgress(savingsGoals, budgetTxs),
    })
  }, [budgetTxs, budgetEnvs, selectedMonth, savingsGoals, results, liabilities])

  if (health.score === null || health.grade === null) return null

  const meta = GRADE_META[health.grade]
  const circumference = 2 * Math.PI * 26

  return (
    <div className="panel" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>

      {/* Jauge circulaire */}
      <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="var(--hairline)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r="26" fill="none"
            stroke={meta.color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${(health.score / 100) * circumference} ${circumference}`}
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 17, fontWeight: 600, color: 'var(--ink)',
        }}>
          {health.score}
        </div>
      </div>

      <div style={{ minWidth: 160 }}>
        <div className="title" style={{ marginBottom: 2 }}>Santé financière</div>
        <span style={{
          fontSize: 11.5, fontWeight: 600, color: meta.color,
          padding: '1px 8px', borderRadius: 99,
          background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
        }}>
          {meta.label}
        </span>
      </div>

      {/* Détail des composantes */}
      <div style={{ display: 'flex', gap: 20, flex: 1, flexWrap: 'wrap' }}>
        {health.components.map((c) => (
          <div key={c.id} style={{ minWidth: 130, opacity: c.available ? 1 : 0.4 }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-tertiary)', marginBottom: 4 }}>
              {c.label}{!c.available && ' — n/d'}
            </div>
            <div style={{ height: 4, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: c.available ? `${Math.round(c.score * 100)}%` : 0,
                height: '100%', borderRadius: 99,
                background: c.score >= 0.66 ? 'var(--success)' : c.score >= 0.33 ? 'var(--warning)' : 'var(--danger)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

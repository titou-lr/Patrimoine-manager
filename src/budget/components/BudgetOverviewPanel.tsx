import { PieChart, Pie, Cell } from 'recharts'
import { useBudgetStore } from '../store/useBudgetStore'
import { formatEur } from '../../utils/format'
import type { MonthlyBudgetSnapshot } from '../types/budget'

// formatPct local : prend une fraction (0.35 → "35%"), contrairement à utils/format.formatPct qui prend un pourcentage
function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-tertiary)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: color ?? 'var(--ink)', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  )
}

interface Props {
  snapshot: MonthlyBudgetSnapshot
}

export default function BudgetOverviewPanel({ snapshot }: Props) {
  const categories = useBudgetStore((s) => s.categories)
  const envelopes = useBudgetStore((s) => s.envelopes)
  const transactions = useBudgetStore((s) => s.transactions)

  const { totalIncome, totalExpenses, totalSaved, realSavingsRate, month } = snapshot

  // Build category-level spending data for the donut
  const monthTxs = transactions.filter(
    (t) => t.date.slice(0, 7) === month && t.type === 'expense'
  )

  const spendByCategory: Record<string, number> = {}
  for (const tx of monthTxs) {
    spendByCategory[tx.categoryId] = (spendByCategory[tx.categoryId] ?? 0) + tx.amount
  }

  const pieData = Object.entries(spendByCategory)
    .map(([catId, value]) => {
      const cat = categories.find((c) => c.id === catId)
      return { name: cat?.label ?? catId, value, color: cat?.color ?? '#888' }
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const totalPie = pieData.reduce((s, d) => s + d.value, 0)

  // Allocation totale des enveloppes actives
  const totalAllocated = envelopes
    .filter((e) => e.active)
    .reduce((s, e) => s + e.monthlyAllocation, 0)

  const budgetUsedPct = totalAllocated > 0 ? Math.min(totalExpenses / totalAllocated, 1) : 0

  return (
    <div className="panel" style={{ padding: '18px 20px', display: 'flex', gap: 32, alignItems: 'flex-start' }}>

      {/* ── Left: KPIs + budget bar ─────────────────────────────────────── */}
      <div className="col gap16" style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Vue d'ensemble</span>

        {/* 4 KPIs on one row */}
        <div className="row gap12" style={{ flexWrap: 'nowrap' }}>
          <Kpi label="Revenus"       value={formatEur(totalIncome)}     color="var(--success)" />
          <Kpi label="Dépenses"      value={formatEur(totalExpenses)}    color="var(--danger)" />
          <Kpi label="Épargné"       value={formatEur(totalSaved)} />
          <Kpi label="Taux d'épargne" value={formatPct(realSavingsRate)} />
        </div>

        {/* Budget bar */}
        <div>
          <div className="row gap8" style={{ marginBottom: 6, alignItems: 'center' }}>
            <span className="eyebrow">Budget utilisé</span>
            <span className="mono caption" style={{ color: 'var(--ink-secondary)' }}>
              {formatEur(totalExpenses)} / {formatEur(totalAllocated)}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              width: `${budgetUsedPct * 100}%`,
              height: '100%',
              background: budgetUsedPct >= 1 ? 'var(--danger)' : 'var(--primary)',
              borderRadius: 99,
              transition: 'width .3s',
            }} />
          </div>
          <div className="row gap4" style={{ marginTop: 4, justifyContent: 'space-between' }}>
            <span className="caption" style={{ color: 'var(--ink-tertiary)' }}>0 €</span>
            <span className="caption" style={{ color: 'var(--ink-tertiary)' }}>{formatEur(totalAllocated)}</span>
          </div>
        </div>
      </div>

      {/* ── Divider ─────────────────────────────────────────────────────── */}
      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--hairline)', flexShrink: 0 }} />

      {/* ── Right: donut + legend ───────────────────────────────────────── */}
      <div style={{ width: 320, flexShrink: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}>Dépenses par catégorie</div>
        {pieData.length > 0 ? (
          <div className="row gap16" style={{ alignItems: 'center' }}>
            <div style={{ width: 120, height: 120, flexShrink: 0 }}>
              <PieChart width={120} height={120}>
                <Pie
                  data={pieData}
                  cx={60} cy={60}
                  innerRadius={36} outerRadius={54}
                  dataKey="value"
                  paddingAngle={1}
                  startAngle={90} endAngle={-270}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </div>
            <div className="col" style={{ gap: 4, flex: 1, minWidth: 0 }}>
              {pieData.slice(0, 6).map((d) => {
                const pct = totalPie > 0 ? Math.round((d.value / totalPie) * 100) : 0
                return (
                  <div key={d.name} className="row gap6" style={{ alignItems: 'center' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span className="small grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-secondary)' }}>
                      {d.name}
                    </span>
                    <span className="mono caption" style={{ color: 'var(--ink-tertiary)', flexShrink: 0 }}>
                      {pct}%
                    </span>
                  </div>
                )
              })}
              {pieData.length > 6 && (
                <div className="caption" style={{ color: 'var(--ink-tertiary)', marginTop: 2 }}>
                  +{pieData.length - 6} autres
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--ink-tertiary)', fontSize: 13, paddingTop: 8 }}>
            Aucune dépense ce mois.
          </div>
        )}
      </div>

    </div>
  )
}

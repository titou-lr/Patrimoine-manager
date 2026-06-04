import { useState } from 'react'
import {
  AreaChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { useStore, selectActiveSim } from '../../store/useStore'
import { computeNetWorthSeries, liabilityInterestCost } from '../../engine/netWorthEngine'
import { formatEur } from '../../utils/format'
import type { Liability, SimulationResult } from '../../types'
import LiabilityCard from './LiabilityCard'

interface Props {
  results: SimulationResult[]
  globalParams: { monthlyIncome: number }
}

interface TooltipPayload {
  dataKey: string
  value: number
  color: string
  name: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: number
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="text-muted mb-1.5">Année {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 justify-between">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono font-medium text-foreground">{formatEur(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({
  label, value, sub, colorClass,
}: {
  label: string
  value: string
  sub?: string
  colorClass: string
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className="text-[10px] text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono tabular-nums ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

const LIABILITY_TEMPLATES: Omit<Liability, 'id' | 'label'>[] = [
  { type: 'mortgage',        totalAmount: 200000, remainingAmount: 180000, monthlyPayment: 900,  interestRate: 3.5, remainingMonths: 240, active: true },
  { type: 'car_loan',        totalAmount: 15000,  remainingAmount: 10000,  monthlyPayment: 250,  interestRate: 4.0, remainingMonths: 48,  active: true },
  { type: 'consumer_credit', totalAmount: 5000,   remainingAmount: 3000,   monthlyPayment: 150,  interestRate: 6.0, remainingMonths: 24,  active: true },
  { type: 'student_loan',    totalAmount: 20000,  remainingAmount: 15000,  monthlyPayment: 300,  interestRate: 1.0, remainingMonths: 60,  active: true },
  { type: 'other',           totalAmount: 10000,  remainingAmount: 8000,   monthlyPayment: 200,  interestRate: 5.0, remainingMonths: 48,  active: true },
]

const LIABILITY_LABELS: Record<Liability['type'], string> = {
  mortgage:        'Crédit immobilier',
  car_loan:        'Crédit auto',
  consumer_credit: 'Crédit conso',
  student_loan:    'Prêt étudiant',
  other:           'Autre dette',
}

export default function NetWorthPanel({ results, globalParams }: Props) {
  const { liabilities } = useStore(selectActiveSim)
  const { addLiability: storAddLiability } = useStore()
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const activeLiabilities = (liabilities ?? []).filter((l) => l.active !== false)

  if (results.length === 0) return null

  const series = computeNetWorthSeries(results, liabilities ?? [])
  const lastSnap = series[series.length - 1]

  // Chart data
  const chartData = series.map((snap, i) => ({
    year: results[i].year,
    actifs: snap.totalAssets,
    passifs: snap.totalLiabilities,
    net: snap.netWorth,
  }))

  // Intersection point: first year where netWorth > 0 after being negative
  const equilibreYear = chartData.find((d) => d.net >= 0)?.year

  // KPIs
  const debtRatioPct = lastSnap.debtRatio * 100
  const debtRatioColor =
    debtRatioPct < 30 ? 'text-success' : debtRatioPct < 50 ? 'text-warning' : 'text-danger'
  const netWorthColor = lastSnap.netWorth >= 0 ? 'text-success' : 'text-danger'
  const monthlyBurdenPct = globalParams.monthlyIncome > 0
    ? (lastSnap.monthlyDebtBurden / globalParams.monthlyIncome) * 100
    : 0

  const totalInterestCost = activeLiabilities.reduce(
    (s, l) => s + liabilityInterestCost(l, 0),
    0
  )

  function handleAdd(type: Liability['type']) {
    const tpl = LIABILITY_TEMPLATES.find((t) => t.type === type) ?? LIABILITY_TEMPLATES[4]
    storAddLiability({
      ...tpl,
      id: `liability_${Date.now()}`,
      label: LIABILITY_LABELS[type],
    })
    setAddMenuOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Section 1 — KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Actifs totaux (fin)"
          value={formatEur(lastSnap.totalAssets)}
          colorClass="text-orange"
        />
        <KpiCard
          label="Passifs totaux"
          value={formatEur(lastSnap.totalLiabilities)}
          sub={activeLiabilities.length > 0 ? `${activeLiabilities.length} dette${activeLiabilities.length > 1 ? 's' : ''}` : undefined}
          colorClass="text-danger"
        />
        <KpiCard
          label="Patrimoine net"
          value={formatEur(lastSnap.netWorth)}
          sub={equilibreYear ? `Équilibre à t+${equilibreYear} ans` : undefined}
          colorClass={netWorthColor}
        />
        <KpiCard
          label="Ratio d'endettement"
          value={`${Math.round(debtRatioPct)}%`}
          sub={debtRatioPct < 30 ? 'Sain' : debtRatioPct < 50 ? 'Modéré' : 'Élevé'}
          colorClass={debtRatioColor}
        />
      </div>

      {/* Section 2 — Graphique */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">Évolution patrimoine net</h3>
          {equilibreYear && (
            <span className="text-xs text-muted bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
              Point d'équilibre : t+{equilibreYear} ans
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradActifs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-orange)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-orange)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradPassifs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" strokeOpacity={0.5} />
            <XAxis dataKey="year" tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}a`} />
            <YAxis tick={{ fill: 'var(--color-muted)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} width={40} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey="actifs" name="Actifs" stroke="var(--color-orange)" fill="url(#gradActifs)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="passifs" name="Passifs" stroke="var(--color-danger)" fill="url(#gradPassifs)" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="net" name="Patrimoine net" stroke="var(--color-purple)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Section 3 — Liste des passifs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Mes dettes & crédits</h3>

          <div className="relative">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-muted hover:text-foreground hover:border-border-mid transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Ajouter
            </button>
            {addMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-surface border border-border rounded-xl shadow-xl py-1 min-w-[170px]">
                {(Object.keys(LIABILITY_LABELS) as Liability['type'][]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAdd(type)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-elevated text-muted hover:text-foreground transition-colors"
                  >
                    {LIABILITY_LABELS[type]}
                  </button>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => setAddMenuOpen(false)}
                    className="w-full text-left px-3 py-2 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {(liabilities ?? []).length === 0 ? (
          <div className="bg-surface border border-dashed border-border rounded-2xl p-8 text-center">
            <div className="text-sm text-muted">Aucune dette renseignée</div>
            <div className="text-xs text-muted/60 mt-1">Ajoutez vos crédits pour voir leur impact sur votre patrimoine</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {(liabilities ?? []).map((l) => (
              <LiabilityCard key={l.id} liability={l} />
            ))}
          </div>
        )}

        {/* Total mensualités */}
        {activeLiabilities.length > 0 && (
          <div className="mt-4 bg-elevated rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-sm font-medium text-foreground">Charge mensuelle totale : </span>
              <span className="text-sm font-mono font-bold text-danger">
                {formatEur(lastSnap.monthlyDebtBurden)}/mois
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              {globalParams.monthlyIncome > 0 && (
                <span className={monthlyBurdenPct > 35 ? 'text-danger' : 'text-muted'}>
                  soit {Math.round(monthlyBurdenPct)}% de votre salaire
                </span>
              )}
              {totalInterestCost > 0 && (
                <span>Intérêts restants : {formatEur(totalInterestCost)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

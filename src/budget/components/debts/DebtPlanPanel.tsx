import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useStore, selectActiveSim } from '../../../store/useStore'
import { comparePayoffStrategies, payoffEndDate } from '../../../engine/debtPayoffEngine'
import type { PayoffStrategy } from '../../../engine/debtPayoffEngine'
import { formatEur } from '../../../utils/format'

function endDateLabel(months: number): string {
  const ym = payoffEndDate(months)
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function StratCard({
  title, active, months, totalInterest, interestSaved, onClick,
}: {
  title: string; active: boolean; months: number; totalInterest: number; interestSaved: number; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="panel"
      style={{
        flex: 1, padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
        border: active ? '1px solid var(--primary)' : '1px solid var(--hairline)',
        background: active ? 'var(--primary-tint)' : undefined,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--primary-hover)' : 'var(--ink)', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', lineHeight: 1.6 }}>
        Désendetté en <strong style={{ color: 'var(--ink-subtle)' }}>{Math.floor(months / 12)} ans {months % 12} mois</strong> ({endDateLabel(months)})<br />
        Intérêts payés : <span style={{ fontFamily: 'var(--font-mono)' }}>{formatEur(totalInterest)}</span><br />
        Économie vs minimum : <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{formatEur(interestSaved)}</span>
      </div>
    </button>
  )
}

export default function DebtPlanPanel() {
  // Lecture seule sur le store principal — le module Budget n'écrit jamais dedans
  const { liabilities } = useStore(selectActiveSim)
  const [extraMonthly, setExtraMonthly] = useState(100)
  const [strategy, setStrategy] = useState<PayoffStrategy>('avalanche')

  const activeLiabilities = (liabilities ?? []).filter((l) => l.active !== false && l.remainingAmount > 0)

  const comparison = useMemo(
    () => activeLiabilities.length > 0 ? comparePayoffStrategies(activeLiabilities, extraMonthly) : null,
    [activeLiabilities, extraMonthly]
  )

  if (activeLiabilities.length === 0) {
    return (
      <div className="panel" style={{ padding: '28px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-subtle)', marginBottom: 4 }}>Aucune dette active</div>
        <div style={{ fontSize: 12, color: 'var(--ink-tertiary)' }}>
          Ajoutez vos crédits dans l'onglet « Bilan net » du Dashboard pour visualiser
          votre plan de remboursement avalanche vs snowball.
        </div>
      </div>
    )
  }

  const selected = strategy === 'avalanche' ? comparison!.avalanche : comparison!.snowball
  const other = strategy === 'avalanche' ? comparison!.snowball : comparison!.avalanche

  // Série pour le graphique : les deux stratégies superposées (échantillonnée si longue)
  const maxLen = Math.max(comparison!.avalanche.schedule.length, comparison!.snowball.schedule.length)
  const step = maxLen > 240 ? Math.ceil(maxLen / 240) : 1
  const chartData: { month: number; avalanche: number | null; snowball: number | null }[] = []
  for (let i = 0; i < maxLen; i += step) {
    chartData.push({
      month: i + 1,
      avalanche: comparison!.avalanche.schedule[i]?.totalRemaining ?? 0,
      snowball: comparison!.snowball.schedule[i]?.totalRemaining ?? 0,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Effort supplémentaire */}
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Plan de remboursement</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', marginTop: 2 }}>
            {activeLiabilities.length} dette{activeLiabilities.length > 1 ? 's' : ''} ·{' '}
            {formatEur(activeLiabilities.reduce((s, l) => s + l.remainingAmount, 0))} restant dû
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--ink-subtle)' }}>
          Effort supplémentaire
          <input
            type="range" min={0} max={1000} step={25}
            value={extraMonthly}
            onChange={(e) => setExtraMonthly(Number(e.target.value))}
            style={{ width: 160 }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', minWidth: 90, textAlign: 'right' }}>
            {formatEur(extraMonthly)}/mois
          </span>
        </label>
      </div>

      {/* Comparaison stratégies */}
      <div style={{ display: 'flex', gap: 12 }}>
        <StratCard
          title="Avalanche — taux le plus élevé d'abord"
          active={strategy === 'avalanche'}
          months={comparison!.avalanche.months}
          totalInterest={comparison!.avalanche.totalInterest}
          interestSaved={comparison!.interestSavedAvalanche}
          onClick={() => setStrategy('avalanche')}
        />
        <StratCard
          title="Snowball — plus petit solde d'abord"
          active={strategy === 'snowball'}
          months={comparison!.snowball.months}
          totalInterest={comparison!.snowball.totalInterest}
          interestSaved={comparison!.interestSavedSnowball}
          onClick={() => setStrategy('snowball')}
        />
      </div>

      {/* Graphique */}
      <div className="panel" style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>
          Capital restant dû — avalanche vs snowball
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--ink-tertiary)', fontSize: 10 }}
              tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `${Math.round(v / 12)}a`}
            />
            <YAxis
              tick={{ fill: 'var(--ink-tertiary)', fontSize: 10 }}
              tickLine={false} axisLine={false} width={44}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
            />
            <Tooltip
              formatter={(v) => formatEur(Number(v ?? 0))}
              labelFormatter={(m) => `Mois ${m}`}
              contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)', borderRadius: 8, fontSize: 12 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line type="monotone" dataKey="avalanche" name="Avalanche" stroke="var(--primary)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="snowball" name="Snowball" stroke="var(--warning)" strokeWidth={2} dot={false} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Ordre de remboursement */}
      <div className="panel" style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
          Ordre de remboursement — stratégie {strategy === 'avalanche' ? 'avalanche' : 'snowball'}
        </div>
        {selected.payoffOrder.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--hairline)', fontSize: 12.5 }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              background: 'var(--primary-tint)', color: 'var(--primary-hover)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
            }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, color: 'var(--ink)' }}>{p.label}</span>
            <span style={{ color: 'var(--ink-tertiary)' }}>
              soldée au mois {p.month} ({endDateLabel(p.month)})
            </span>
          </div>
        ))}
        <div style={{ fontSize: 11.5, color: 'var(--ink-tertiary)', marginTop: 10 }}>
          Écart entre stratégies : {formatEur(Math.abs(other.totalInterest - selected.totalInterest))} d'intérêts —{' '}
          l'avalanche minimise toujours le coût total, le snowball maximise la motivation (victoires rapides).
        </div>
      </div>
    </div>
  )
}

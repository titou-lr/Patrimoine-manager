import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import type { Trade } from '../../types/finance'
import { computePerformanceStats, realizedEquityCurve, formatDuration } from '../../engine/performanceEngine'
import { formatEur, formatPct } from '../../../utils/format'

interface Props {
  trades: Trade[]
  initialCapital: number
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div>
      <div className="caption">{label}</div>
      <div className="kpi" style={{ fontSize: 15, color: color ?? 'var(--ink)' }}>{value}</div>
      {sub && <div className="caption" style={{ fontSize: 10 }}>{sub}</div>}
    </div>
  )
}

export default function PerformanceDashboard({ trades, initialCapital }: Props) {
  const stats = useMemo(() => computePerformanceStats(trades, initialCapital), [trades, initialCapital])
  const equityData = useMemo(() => {
    const curve = realizedEquityCurve(trades, initialCapital)
    return curve.map(pt => ({
      date: new Date(pt.time).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      equity: Math.round(pt.value * 100) / 100,
    }))
  }, [trades, initialCapital])

  if (stats.totalTrades === 0) {
    return (
      <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
        <p className="caption">Aucun trade fermé — les métriques de performance apparaîtront ici.</p>
      </div>
    )
  }

  const pf = stats.profitFactor
  const pnlColor = (v: number) => v >= 0 ? 'var(--success)' : 'var(--danger)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPIs */}
      <div className="panel" style={{ padding: 16 }}>
        <h3 className="title" style={{ fontSize: 13, marginBottom: 12 }}>Performance ({stats.totalTrades} trades fermés)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 14 }}>
          <Kpi
            label="Win rate"
            value={formatPct(stats.winRate * 100)}
            color={stats.winRate >= 0.5 ? 'var(--success)' : 'var(--danger)'}
          />
          <Kpi
            label="Profit factor"
            value={isFinite(pf) ? pf.toFixed(2) : '∞'}
            sub="gains bruts / pertes brutes"
            color={pf >= 1 ? 'var(--success)' : 'var(--danger)'}
          />
          <Kpi
            label="Expectancy"
            value={formatEur(stats.expectancy)}
            sub="P&L net moyen / trade"
            color={pnlColor(stats.expectancy)}
          />
          <Kpi
            label="Max drawdown"
            value={`−${formatPct(stats.maxDrawdownPct * 100)}`}
            sub={`−${formatEur(stats.maxDrawdownAbs)}`}
            color="var(--danger)"
          />
          <Kpi
            label="Sharpe (hebdo ann.)"
            value={stats.sharpeRatio.toFixed(2)}
            color={stats.sharpeRatio >= 1 ? 'var(--success)' : 'var(--ink-subtle)'}
          />
          <Kpi
            label="RRR moyen réalisé"
            value={stats.avgRRR != null ? stats.avgRRR.toFixed(2) : '—'}
            sub={stats.avgRRR == null ? 'définissez un stop à l\'entrée' : undefined}
            color={stats.avgRRR != null ? pnlColor(stats.avgRRR) : undefined}
          />
          <Kpi
            label="Gains consécutifs max"
            value={String(stats.maxConsecutiveWins)}
            color="var(--success)"
          />
          <Kpi
            label="Pertes consécutives max"
            value={String(stats.maxConsecutiveLosses)}
            color="var(--danger)"
          />
          <Kpi label="Gain moyen" value={formatEur(stats.avgWin)} color="var(--success)" />
          <Kpi label="Perte moyenne" value={`−${formatEur(stats.avgLoss)}`} color="var(--danger)" />
          <Kpi label="P&L net total" value={formatEur(stats.totalNetPnL)} color={pnlColor(stats.totalNetPnL)} />
          <Kpi label="Commissions payées" value={formatEur(stats.totalFees)} />
          <Kpi label="Durée moyenne" value={formatDuration(stats.avgDurationMs)} />
        </div>
      </div>

      {/* Courbe d'equity réalisée */}
      {equityData.length > 1 && (
        <div className="panel" style={{ padding: 16 }}>
          <h3 className="title" style={{ fontSize: 13, marginBottom: 12 }}>Courbe d'equity réalisée</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={equityData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }} />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ink-subtle)' }}
                domain={['auto', 'auto']}
                tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
              />
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', fontSize: 12 }}
                formatter={(v: unknown) => typeof v === 'number' ? formatEur(v) : ''}
              />
              <ReferenceLine y={initialCapital} stroke="var(--ink-subtle)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="equity" stroke="var(--primary)" strokeWidth={2} dot={false} name="Equity" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

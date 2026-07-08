import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { BENCHMARKS } from '../../data/benchmarkData'
import { computeBenchmarkSeries } from '../../engine/benchmarkEngine'
import { formatEur } from '../../utils/format'
import type { SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
}

export default function BenchmarkPanel({ results }: Props) {
  const [benchmarkId, setBenchmarkId] = useState(BENCHMARKS[0].id)
  const benchmark = BENCHMARKS.find((b) => b.id === benchmarkId) ?? BENCHMARKS[0]

  const series = useMemo(
    () => computeBenchmarkSeries(results, benchmark.annualReturn),
    [results, benchmark.annualReturn]
  )

  if (results.length === 0) return null

  const last = series[series.length - 1]
  const delta = last.portfolio - last.benchmark
  const outperforms = delta >= 0

  return (
    <div>
      <div className="spread" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="title" style={{ marginBottom: 2 }}>Benchmark de portefeuille</div>
          <div className="caption">
            Vos versements simulés investis dans l'indice ({benchmark.annualReturn} %/an historique) — {benchmark.description}
          </div>
        </div>
        <div className="seg">
          {BENCHMARKS.map((b) => (
            <button key={b.id} className={benchmarkId === b.id ? 'on' : ''} onClick={() => setBenchmarkId(b.id)}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="row gap16" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="kpi">
          <div className="kpi-label">Votre portefeuille à terme</div>
          <div className="kpi-value">{formatEur(last.portfolio)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{benchmark.label} à flux identiques</div>
          <div className="kpi-value">{formatEur(last.benchmark)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Écart</div>
          <div className="kpi-value" style={{ color: outperforms ? 'var(--success)' : 'var(--danger)' }}>
            {outperforms ? '+' : ''}{formatEur(delta)}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" />
          <XAxis dataKey="year" tick={{ fill: 'var(--ink-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}a`} />
          <YAxis tick={{ fill: 'var(--ink-tertiary)', fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
          <Tooltip
            formatter={(v) => formatEur(Number(v ?? 0))}
            labelFormatter={(y) => `Année ${y}`}
            contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)', borderRadius: 8, fontSize: 12 }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Area type="monotone" dataKey="portfolio" name="Votre portefeuille" stroke="var(--primary)" fill="url(#gradPortfolio)" strokeWidth={2} dot={false} />
          <Area type="monotone" dataKey="benchmark" name={benchmark.label} stroke="var(--warning)" fill="none" strokeWidth={2} strokeDasharray="5 3" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      <div className="caption" style={{ marginTop: 8, fontSize: 11 }}>
        Comparaison à flux de versements identiques, rendement de l'indice supposé constant
        (moyenne historique long terme, dividendes réinvestis). Les frais et la fiscalité de votre
        simulation sont inclus côté portefeuille, pas côté indice.
      </div>
    </div>
  )
}

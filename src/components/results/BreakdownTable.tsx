import { useState } from 'react'
import { formatEur, formatPct } from '../../utils/format'
import NumberInput from '../ui/NumberInput'
import GlossaryTooltip from '../ui/GlossaryTooltip'
import type { Envelope, SimulationResult } from '../../types'

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
}

export default function BreakdownTable({ results, envelopes }: Props) {
  const [selectedYear, setSelectedYear] = useState(results.length)
  const clampedYear = Math.min(selectedYear, results.length)
  const yearData = results[clampedYear - 1]

  if (!yearData) return null

  const active = envelopes.filter((e) => e.active && yearData.byEnvelope[e.id])
  const sorted = [...active].sort(
    (a, b) => yearData.byEnvelope[b.id].capital - yearData.byEnvelope[a.id].capital
  )

  const total = active.reduce(
    (acc, e) => {
      const r = yearData.byEnvelope[e.id]
      return {
        capital:          acc.capital + r.capital,
        totalContributed: acc.totalContributed + r.totalContributed,
        grossGains:       acc.grossGains + r.grossGains,
        tax:              acc.tax + r.tax,
        realValue:        acc.realValue + r.realValue,
        totalFeesPaid:    acc.totalFeesPaid + r.totalFeesPaid,
      }
    },
    { capital: 0, totalContributed: 0, grossGains: 0, tax: 0, realValue: 0, totalFeesPaid: 0 }
  )

  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4 gap-4">
        <h3 className="text-sm font-medium text-foreground shrink-0">
          Détail par enveloppe — Année {clampedYear}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted">
          <span className="shrink-0">Année</span>
          <NumberInput
            value={clampedYear}
            onChange={setSelectedYear}
            min={1}
            max={results.length}
            size="sm"
            className="w-16"
          />
          <span className="shrink-0">/ {results.length}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] text-muted border-b border-border">
              <th className="pb-2 pr-3 font-normal">Enveloppe</th>
              <th className="pb-2 text-right pr-3 font-normal">Capital versé</th>
              <th className="pb-2 text-right pr-3 font-normal">
                <GlossaryTooltip termId="plus_value">Gains bruts</GlossaryTooltip>
              </th>
              <th className="pb-2 text-right pr-3 font-normal">Frais</th>
              <th className="pb-2 text-right pr-3 font-normal">
                <GlossaryTooltip termId="fiscalite_sortie">Fiscalité</GlossaryTooltip>
              </th>
              <th className="pb-2 text-right pr-3 font-normal">Valeur nette</th>
              <th className="pb-2 text-right pr-3 font-normal">
                <GlossaryTooltip termId="valeur_actuelle">Valeur réelle</GlossaryTooltip>
              </th>
              <th className="pb-2 text-right font-normal">Part</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((env) => {
              const r = yearData.byEnvelope[env.id]
              const share = total.capital > 0 ? (r.capital / total.capital) * 100 : 0
              return (
                <tr key={env.id} className="border-b border-border hover:bg-elevated transition-colors">
                  <td className="py-3 pr-3 text-foreground font-medium">{env.label}</td>
                  <td className="py-3 pr-3 text-right text-muted font-mono tabular-nums">{formatEur(r.totalContributed)}</td>
                  <td className="py-3 pr-3 text-right text-success font-mono tabular-nums">{formatEur(r.grossGains)}</td>
                  <td className="py-3 pr-3 text-right text-danger font-mono tabular-nums">
                    {r.totalFeesPaid > 0 ? `−${formatEur(r.totalFeesPaid)}` : '—'}
                  </td>
                  <td
                    className="py-3 pr-3 text-right text-warning font-mono tabular-nums cursor-help"
                    title={r.taxDetails}
                  >
                    −{formatEur(r.tax)}
                  </td>
                  <td className="py-3 pr-3 text-right text-foreground font-mono font-semibold tabular-nums">
                    {formatEur(r.capital)}
                  </td>
                  <td className="py-3 pr-3 text-right text-muted font-mono tabular-nums">{formatEur(r.realValue)}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-10 h-1 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange rounded-full"
                          style={{ width: `${Math.min(share, 100)}%` }}
                        />
                      </div>
                      <span className="text-muted font-mono tabular-nums w-8 text-right">
                        {formatPct(share, 0)}
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="pt-3 pr-3 text-foreground font-semibold">Total</td>
              <td className="pt-3 pr-3 text-right text-muted font-mono tabular-nums">{formatEur(total.totalContributed)}</td>
              <td className="pt-3 pr-3 text-right text-success font-mono tabular-nums">{formatEur(total.grossGains)}</td>
              <td className="pt-3 pr-3 text-right text-danger font-mono tabular-nums">
                {total.totalFeesPaid > 0 ? `−${formatEur(total.totalFeesPaid)}` : '—'}
              </td>
              <td className="pt-3 pr-3 text-right text-warning font-mono tabular-nums">−{formatEur(total.tax)}</td>
              <td className="pt-3 pr-3 text-right text-orange font-mono font-bold tabular-nums">{formatEur(total.capital)}</td>
              <td className="pt-3 pr-3 text-right text-muted font-mono tabular-nums">{formatEur(total.realValue)}</td>
              <td className="pt-3 text-right text-muted">100 %</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

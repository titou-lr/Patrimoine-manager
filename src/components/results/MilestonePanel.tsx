import type { SimulationResult } from '../../types'
import { formatEur } from '../../utils/format'

const MILESTONES = [
  { label: '100 k€', amount: 100_000 },
  { label: '500 k€', amount: 500_000 },
  { label: '1 M€',   amount: 1_000_000 },
]

interface Props {
  results: SimulationResult[]
  ageActuel: number
}

export default function MilestonePanel({ results, ageActuel }: Props) {
  const lastNominal = results[results.length - 1]?.totalNominal ?? 0

  const milestones = MILESTONES.map((m) => {
    const found = results.find((r) => r.totalNominal >= m.amount)
    return { ...m, year: found?.year ?? null }
  })

  // Premier jalon non encore atteint dans la simulation
  const nextIdx = milestones.findIndex((m) => m.year === null)

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Jalons patrimoniaux</h3>

      <div className="flex flex-col gap-3">
        {milestones.map((m, i) => {
          const reached = m.year !== null
          const isNext = i === nextIdx

          return (
            <div
              key={m.label}
              className={`flex items-center gap-3 rounded-xl p-3 border transition-all duration-300 ${
                isNext
                  ? 'border-orange/50 bg-orange/5 milestone-next'
                  : reached
                  ? 'border-success/30 bg-success/5'
                  : 'border-border/30 bg-base/20 opacity-40'
              }`}
            >
              {/* Icône statut */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 font-bold ${
                  reached
                    ? 'bg-success/20 text-success'
                    : isNext
                    ? 'bg-orange/20 text-orange'
                    : 'bg-border/30 text-muted'
                }`}
              >
                {reached ? '✓' : isNext ? '→' : '○'}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className={`font-semibold text-sm ${
                    reached ? 'text-success' : isNext ? 'text-orange' : 'text-muted'
                  }`}
                >
                  {m.label}
                </div>
                <div className="text-[10px] text-muted mt-0.5">
                  {reached && m.year !== null ? (
                    <>
                      À {ageActuel + m.year} ans — dans {m.year} an{m.year > 1 ? 's' : ''}
                    </>
                  ) : isNext ? (
                    'Prochain objectif'
                  ) : (
                    'Non atteint dans la simulation'
                  )}
                </div>
              </div>

              {reached && m.year !== null && (
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted">An {m.year}</div>
                  <div className="text-[10px] text-muted/60">{ageActuel + m.year} ans</div>
                </div>
              )}

              {!reached && isNext && (
                <div className="text-right shrink-0">
                  <div className="text-xs text-orange font-medium">{formatEur(m.amount)}</div>
                  <div className="text-[10px] text-muted">objectif</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progression vers le prochain jalon */}
      {nextIdx >= 0 && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <div className="flex justify-between text-[10px] text-muted mb-1.5">
            <span>Progression vers {milestones[nextIdx].label}</span>
            <span className="text-orange font-medium">
              {((lastNominal / milestones[nextIdx].amount) * 100).toFixed(0)} %
            </span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-orange rounded-full transition-all duration-700"
              style={{
                width: `${Math.min((lastNominal / milestones[nextIdx].amount) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

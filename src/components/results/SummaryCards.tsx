import { formatEur } from '../../utils/format'
import type { Envelope, GlobalParams, SimulationResult } from '../../types'

interface Props {
  result: SimulationResult
  globalParams: GlobalParams
  results: SimulationResult[]
  envelopes: Envelope[]
}

export default function SummaryCards({ result, globalParams: _globalParams, results, envelopes }: Props) {
  const monthlyInvested = envelopes.filter(e => e.active).reduce((s, e) => s + e.monthlyContribution, 0)
  const gainPct =
    result.totalContributed > 0
      ? ((result.totalGains / result.totalContributed) * 100).toFixed(0)
      : '0'
  const feesPct =
    result.totalNominal > 0
      ? ((result.totalFeesPaid / result.totalNominal) * 100).toFixed(1)
      : '0'

  // Économie fiscale PER cumulée sur toute la durée
  const cumulativePERSavings = results.reduce((sum, r) => sum + r.perTaxSavings, 0)

  // Noms des enveloppes plafonnées
  const cappedNames = result.cappedEnvelopes
    .map((id) => envelopes.find((e) => e.id === id)?.label ?? id)

  return (
    <div className="flex flex-col gap-3">
      {/* Ligne 1 — Hero cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HeroCard
          label="Capital total"
          value={formatEur(result.totalNominal)}
          sub={`Année ${result.year}`}
          color="text-orange"
          className="animate-in"
        />
        <HeroCard
          label="Valeur réelle"
          value={formatEur(result.totalReal)}
          sub="Corrigé inflation"
          color="text-purple"
          className="animate-in-delay-1"
        />
        <HeroCard
          label="Gains nets"
          value={formatEur(result.totalGains)}
          sub={`+${gainPct} % sur versements`}
          color="text-success"
          className="animate-in-delay-2"
        />
      </div>

      {/* Ligne 2 — Secondary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SecondaryCard
          label="Versements cumulés"
          value={formatEur(result.totalContributed)}
          sub="Capital investi"
          color="text-foreground"
        />
        <SecondaryCard
          label="Frais cumulés"
          value={formatEur(result.totalFeesPaid)}
          sub={`${feesPct} % du capital`}
          color="text-danger"
        />

        {/* Économie fiscale PER — visible uniquement si > 0 */}
        {cumulativePERSavings > 0 ? (
          <SecondaryCard
            label="Économie fiscale PER"
            value={formatEur(cumulativePERSavings)}
            sub="Déductions cumulées sur versements"
            color="text-success"
          />
        ) : (
          <div className="bg-surface rounded-2xl border border-border p-4">
            <div className="text-xs text-muted mb-1.5">Versements mensuels</div>
            <div className="text-xl font-mono text-orange tabular-nums">{formatEur(monthlyInvested)}</div>
            <div className="text-xs text-muted mt-1">
              {envelopes.filter(e => e.active).length} enveloppe{envelopes.filter(e => e.active).length > 1 ? 's' : ''} actives
            </div>
          </div>
        )}
      </div>

      {/* Ligne 3 — Effort mensuel (affiché si PER card est présente) */}
      {cumulativePERSavings > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-surface rounded-2xl border border-border p-4">
            <div className="text-xs text-muted mb-1.5">Versements mensuels</div>
            <div className="text-xl font-mono text-orange tabular-nums">{formatEur(monthlyInvested)}</div>
            <div className="text-xs text-muted mt-1">
              {envelopes.filter(e => e.active).length} enveloppe{envelopes.filter(e => e.active).length > 1 ? 's' : ''} actives
            </div>
          </div>
        </div>
      )}

      {/* Banner plafonds atteints */}
      {cappedNames.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
          <span className="text-warning text-sm shrink-0">⚠</span>
          <div className="text-xs text-foreground">
            <span className="font-medium">Plafond atteint : {cappedNames.join(', ')}</span>
            <span className="text-muted ml-1">— Les versements ont été stoppés automatiquement.</span>
          </div>
        </div>
      )}
    </div>
  )
}

interface HeroCardProps {
  label: string
  value: string
  sub: string
  color: string
  className?: string
}

function HeroCard({ label, value, sub, color, className }: HeroCardProps) {
  return (
    <div className={`bg-surface rounded-2xl border border-border p-5 ${className ?? ''}`}>
      <div className="text-xs text-muted mb-2">{label}</div>
      <div className={`text-3xl font-mono tabular-nums leading-none ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-2">{sub}</div>
    </div>
  )
}

interface SecondaryCardProps {
  label: string
  value: string
  sub: string
  color: string
}

function SecondaryCard({ label, value, sub, color }: SecondaryCardProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-4">
      <div className="text-xs text-muted mb-1.5">{label}</div>
      <div className={`text-xl font-mono tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-1">{sub}</div>
    </div>
  )
}

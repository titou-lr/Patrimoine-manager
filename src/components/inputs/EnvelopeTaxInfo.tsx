import type { Envelope, EnvelopeResult } from '../../types'
import { formatEur } from '../../utils/format'

interface Props {
  envelope: Envelope
  tmi: number
  isCouple: boolean
  lastResult?: EnvelopeResult
}

const LIVRET_CAPS: Partial<Record<string, number>> = {
  livret_a: 22_950,
  ldds: 12_000,
  livret_jeune: 1_600,
}

function ProgressBar({ pct, color = 'bg-success' }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-elevated overflow-hidden border border-border/40">
      <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  )
}

export default function EnvelopeTaxInfo({ envelope, tmi, isCouple, lastResult }: Props) {
  const { type, openedAt } = envelope
  const yearsHeld = openedAt
    ? Math.max(0, (Date.now() - new Date(openedAt).getTime()) / (365.25 * 24 * 3600 * 1000))
    : 0
  const contributed = lastResult?.totalContributed ?? envelope.initialCapital

  if (['livret_a', 'ldds', 'livret_jeune'].includes(type)) {
    const cap = LIVRET_CAPS[type] ?? 0
    const pct = cap > 0 ? (contributed / cap) * 100 : 0
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-success">Exonéré d'impôts — livret réglementé</p>
        <Row label="Versements / Plafond" value={`${formatEur(Math.min(contributed, cap))} / ${formatEur(cap)}`} />
        <ProgressBar pct={pct} />
        {pct >= 90 && <p className="text-[10px] text-warning">Plafond bientôt atteint — les versements s'arrêteront automatiquement.</p>}
      </div>
    )
  }

  if (type === 'pea') {
    const cap = 150_000
    const pct = (contributed / cap) * 100
    const eligible = yearsHeld >= 5
    const yearsToGo = Math.max(0, 5 - yearsHeld)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px]">
          {eligible
            ? <span className="text-success">PEA ≥ 5 ans — PS 17.2% uniquement</span>
            : <span className="text-muted">PEA &lt; 5 ans — Flat tax 30% · éligibilité dans {yearsToGo.toFixed(1)} ans</span>
          }
        </p>
        <Row label="Versements / Plafond 150 000 €" value={`${formatEur(Math.min(contributed, cap))} / ${formatEur(cap)}`} />
        <ProgressBar pct={pct} color="bg-purple" />
        {lastResult && <Row label="Impôts estimés (simulation)" value={formatEur(lastResult.tax)} />}
      </div>
    )
  }

  if (type === 'cto') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted">
          {tmi <= 11
            ? `Barème progressif — TMI ${tmi}% + PS 17.2%`
            : 'Flat tax (PFU) 30% — 12.8% IR + 17.2% PS'
          }
        </p>
        <p className="text-[10px] text-muted">Dividendes : abattement 40%, puis TMI + PS annuellement</p>
        {lastResult && <Row label="Impôts estimés (simulation)" value={formatEur(lastResult.tax)} />}
      </div>
    )
  }

  if (type === 'assurance_vie') {
    const abattement = isCouple ? 9_200 : 4_600
    const eligible = yearsHeld >= 8
    const yearsToGo = Math.max(0, 8 - yearsHeld)
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px]">
          {eligible
            ? <span className="text-success">AV ≥ 8 ans — taux réduit 24.7% après abattement</span>
            : <span className="text-muted">AV &lt; 8 ans — Flat tax 30% · éligibilité dans {yearsToGo.toFixed(1)} ans</span>
          }
        </p>
        <Row label={`Abattement annuel (${isCouple ? 'couple' : 'solo'})`} value={formatEur(abattement)} />
        {lastResult && <Row label="Impôts estimés (simulation)" value={formatEur(lastResult.tax)} />}
      </div>
    )
  }

  if (type === 'per') {
    const annualContrib = envelope.monthlyContribution * 12 + envelope.yearlyContribution
    const annualSavings = annualContrib * tmi / 100
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-muted">Versements déductibles — économie fiscale au TMI {tmi}%</p>
        <Row label="Économie fiscale annuelle" value={formatEur(annualSavings)} />
        <p className="text-[10px] text-muted">Sortie capital : TMI sur versements + flat tax 30% sur plus-values</p>
        {lastResult && <Row label="Impôts estimés (simulation)" value={formatEur(lastResult.tax)} />}
      </div>
    )
  }

  return null
}

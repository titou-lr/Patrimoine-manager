import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Label,
} from 'recharts'
import { formatEur } from '../../utils/format'
import type { Envelope, GlobalParams, SimulationResult } from '../../types'
import NumberInput from '../ui/NumberInput'

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
  globalParams: GlobalParams
}

type Usage = 'revenus_passifs' | 'transmission' | 'securite' | 'liberte'

const USAGE_LABELS: Record<Usage, string> = {
  revenus_passifs: 'Revenus passifs',
  transmission: 'Transmission',
  securite: 'Sécurité',
  liberte: 'Liberté financière',
}

function computeAdditionalMonthly(
  results: SimulationResult[],
  envelopes: Envelope[],
  objectif: number,
  horizonAns: number
): number {
  if (results.length === 0) return 0

  const initialCapital = envelopes.reduce((s, e) => s + (e.active ? e.initialCapital : 0), 0)
  const last = results[results.length - 1]
  const n = horizonAns

  if (n <= 0) return 0

  // Average implied annual return
  const contributed = last.totalContributed || 1
  const nominal = last.totalNominal
  const duration = last.year || 1
  // r ≈ (nominal/contributed)^(1/duration) - 1, capped
  const implied = Math.pow(Math.max(1, nominal / Math.max(1, contributed)), 1 / duration) - 1
  const r = Math.min(Math.max(implied, 0.01), 0.15)

  const pv = initialCapital
  const existingMonthly = envelopes.reduce(
    (s, e) => s + (e.active ? e.monthlyContribution + e.yearlyContribution / 12 : 0),
    0
  )

  const factor = Math.pow(1 + r, n)
  const projected = pv * factor + existingMonthly * 12 * ((factor - 1) / r)

  const gap = objectif - projected
  if (gap <= 0) return 0

  const annuityFactor = (factor - 1) / r
  if (annuityFactor <= 0) return 0

  return Math.max(0, Math.round((gap / annuityFactor) / 12))
}

export default function CapitalPanel({ results, envelopes }: Props) {
  const [objectifCapital, setObjectifCapital] = useState(500_000)
  const [horizonCible, setHorizonCible] = useState(25)
  const [usage, setUsage] = useState<Usage>('revenus_passifs')

  const lastResult = results[results.length - 1]
  const capitalFinal = lastResult?.totalNominal ?? 0

  const progressionPct = useMemo(
    () => Math.min(100, Math.round((capitalFinal / objectifCapital) * 100)),
    [capitalFinal, objectifCapital]
  )

  const anneeAtteint = useMemo(() => {
    for (const r of results) {
      if (r.totalNominal >= objectifCapital) return r.year
    }
    return null
  }, [results, objectifCapital])

  const retardOuAvance = anneeAtteint != null ? anneeAtteint - horizonCible : null
  const currentYear = new Date().getFullYear()
  const anneeCalendaire = anneeAtteint != null ? currentYear + anneeAtteint : null

  const versementSupp = useMemo(
    () => computeAdditionalMonthly(results, envelopes, objectifCapital, horizonCible),
    [results, envelopes, objectifCapital, horizonCible]
  )

  const chartData = useMemo(
    () => results.map((r) => ({ year: r.year, capital: Math.round(r.totalNominal) })),
    [results]
  )

  const retardLabel =
    retardOuAvance === null
      ? 'Objectif non atteint'
      : retardOuAvance === 0
        ? 'Exactement à temps'
        : retardOuAvance < 0
          ? `${Math.abs(retardOuAvance)} an${Math.abs(retardOuAvance) > 1 ? 's' : ''} avant l'objectif`
          : `${retardOuAvance} an${retardOuAvance > 1 ? 's' : ''} après l'objectif`

  const retardColor =
    retardOuAvance === null ? 'text-danger' : retardOuAvance <= 0 ? 'text-success' : 'text-danger'
  const retardBg =
    retardOuAvance === null ? 'bg-danger/10' : retardOuAvance <= 0 ? 'bg-success/10' : 'bg-danger/10'

  const analysisText =
    anneeAtteint != null
      ? `Votre objectif de ${formatEur(objectifCapital)} sera atteint dans ${anneeAtteint} an${anneeAtteint > 1 ? 's' : ''} (${anneeCalendaire}), soit ${Math.abs(retardOuAvance!)} an${Math.abs(retardOuAvance!) > 1 ? 's' : ''} ${retardOuAvance! <= 0 ? 'avant' : 'après'} votre horizon.${versementSupp > 0 && retardOuAvance! > 0 ? ` En ajoutant ${formatEur(versementSupp)}/mois, vous atteindriez l'objectif à temps.` : ''}`
      : `À votre rythme actuel, vous n'atteignez pas ${formatEur(objectifCapital)} avant la fin de la simulation.${versementSupp > 0 ? ` En ajoutant ${formatEur(versementSupp)}/mois, vous pourriez atteindre l'objectif en ${horizonCible} ans.` : ''}`

  return (
    <div className="flex flex-col gap-6">

      {/* Paramètres */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <h3 className="text-xs tracking-widest uppercase text-muted mb-4">Paramètres capital</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Objectif de capital</span>
            <NumberInput value={objectifCapital} onChange={setObjectifCapital} min={1000} step={10000} suffix="€" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Horizon cible</span>
            <NumberInput value={horizonCible} onChange={setHorizonCible} min={1} max={50} step={1} suffix="ans" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Usage prévu</span>
            <select
              value={usage}
              onChange={(e) => setUsage(e.target.value as Usage)}
              className="bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-orange"
            >
              {(Object.keys(USAGE_LABELS) as Usage[]).map((u) => (
                <option key={u} value={u}>{USAGE_LABELS[u]}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Objectif</div>
          <div className="text-2xl font-mono text-orange tabular-nums">{formatEur(objectifCapital)}</div>
          <div className="text-xs text-muted mt-1">{USAGE_LABELS[usage]}</div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Atteint dans</div>
          <div className="text-2xl font-mono text-foreground tabular-nums">
            {anneeAtteint != null ? `${anneeAtteint} an${anneeAtteint > 1 ? 's' : ''}` : '—'}
          </div>
          <div className="mt-1.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${retardColor} ${retardBg}`}>
              {retardLabel}
            </span>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Progression actuelle</div>
          <div className="text-2xl font-mono text-foreground tabular-nums">{progressionPct} %</div>
          <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-orange rounded-full transition-all duration-500"
              style={{ width: `${progressionPct}%` }}
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Versement supplémentaire</div>
          {versementSupp > 0 ? (
            <>
              <div className="text-2xl font-mono text-orange tabular-nums">+{formatEur(versementSupp)}</div>
              <div className="text-xs text-muted mt-1">par mois pour atteindre l'objectif à temps</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-mono text-success tabular-nums">0 €</div>
              <div className="text-xs text-muted mt-1">objectif déjà atteint à l'horizon</div>
            </>
          )}
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="text-xs tracking-widest uppercase text-muted mb-4">Trajectoire vers l'objectif</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cap-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#262931" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickFormatter={(v) => `Yr ${v}`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6B7280' }}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{ background: '#121317', border: '1px solid #262931', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [formatEur(v as number), 'Capital']}
              labelFormatter={(l) => `Année ${l}`}
            />
            <ReferenceLine
              y={objectifCapital}
              stroke="#2563EB"
              strokeDasharray="6 3"
              strokeWidth={1.5}
            >
              <Label value="Objectif" position="insideTopRight" fill="#2563EB" fontSize={10} />
            </ReferenceLine>
            {anneeAtteint != null && (
              <ReferenceLine
                x={anneeAtteint}
                stroke="#22C55E"
                strokeDasharray="4 2"
                strokeWidth={1}
              >
                <Label value="Objectif ✓" position="insideTopLeft" fill="#22C55E" fontSize={9} />
              </ReferenceLine>
            )}
            <Area
              type="monotone"
              dataKey="capital"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#cap-area)"
              dot={false}
              activeDot={{ r: 4, fill: '#2563EB' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bloc texte analytique */}
      <div className="bg-elevated border-l-2 border-l-orange rounded-r-lg px-4 py-3 text-sm text-secondary italic leading-relaxed">
        {analysisText}
      </div>
    </div>
  )
}

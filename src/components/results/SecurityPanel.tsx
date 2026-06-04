import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
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

const LIVRET_TYPES = new Set(['livret_a', 'ldds', 'livret_jeune'])

export default function SecurityPanel({ results, envelopes, globalParams }: Props) {
  const [depensesMensuelles, setDepensesMensuelles] = useState(2500)
  const [moisSecurite, setMoisSecurite] = useState(6)
  const [revenusPassifsVises, setRevenusPassifsVises] = useState(1000)

  const lastResult = results[results.length - 1]

  const fondUrgenceNecessaire = depensesMensuelles * moisSecurite

  const fondUrgenceActuel = useMemo(() => {
    if (!lastResult) return 0
    return envelopes
      .filter((e) => e.active && LIVRET_TYPES.has(e.type))
      .reduce((sum, e) => {
        const res = lastResult.byEnvelope[e.id]
        return sum + (res?.capital ?? 0)
      }, 0)
  }, [envelopes, lastResult])

  const fondUrgenceAtteint = fondUrgenceActuel >= fondUrgenceNecessaire

  const capitalFinal = lastResult?.totalNominal ?? 0
  const passiveIncomeMonthly = (capitalFinal * 0.04) / 12
  const couverturePct = depensesMensuelles > 0
    ? Math.round((passiveIncomeMonthly / depensesMensuelles) * 100)
    : 0

  const partSecuriseeActuelle = capitalFinal > 0
    ? Math.round((fondUrgenceActuel / capitalFinal) * 100)
    : 0

  const scoreSecurite = useMemo(() => {
    let score = 0
    if (fondUrgenceAtteint) score += 4
    if (couverturePct >= 50) score += 3
    if (partSecuriseeActuelle >= 20 && partSecuriseeActuelle <= 60) score += 2
    if (globalParams.duration > 15) score += 1
    return score
  }, [fondUrgenceAtteint, couverturePct, partSecuriseeActuelle, globalParams.duration])

  // Year when passive income >= revenusPassifsVises
  const anneeIndependance = useMemo(() => {
    for (const r of results) {
      const monthly = (r.totalNominal * 0.04) / 12
      if (monthly >= revenusPassifsVises) return r.year
    }
    return null
  }, [results, revenusPassifsVises])

  const chartData = useMemo(
    () =>
      results.map((r) => {
        const livretCapital = envelopes
          .filter((e) => e.active && LIVRET_TYPES.has(e.type))
          .reduce((sum, e) => sum + (r.byEnvelope[e.id]?.capital ?? 0), 0)
        return {
          year: r.year,
          fondsUrgence: Math.round(livretCapital),
          revenusPassifs: Math.round((r.totalNominal * 0.04) / 12),
        }
      }),
    [results, envelopes]
  )

  const couvertureColor =
    couverturePct >= 50 ? 'text-success' : couverturePct >= 25 ? 'text-warning' : 'text-danger'
  const couvertureBadge =
    couverturePct >= 50 ? 'text-success bg-success/10' : couverturePct >= 25 ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10'

  const partColor =
    partSecuriseeActuelle < 20
      ? 'text-warning'
      : partSecuriseeActuelle > 60
        ? 'text-warning'
        : 'text-foreground'
  const partNote =
    partSecuriseeActuelle < 20
      ? 'Sous-pondéré en sécurisé'
      : partSecuriseeActuelle > 60
        ? 'Sur-pondéré — rendement faible'
        : 'Proportion équilibrée'

  const scoreColor = scoreSecurite >= 8 ? 'text-success' : scoreSecurite >= 5 ? 'text-warning' : 'text-danger'

  const analysisText =
    fondUrgenceAtteint
      ? `Votre fonds d'urgence est constitué (${formatEur(fondUrgenceActuel)} ≥ ${formatEur(fondUrgenceNecessaire)}). À terme, vos revenus passifs estimés couvriront ${couverturePct} % de vos dépenses mensuelles, soit une indépendance ${couverturePct >= 75 ? 'quasi-totale' : 'partielle'}.`
      : `Votre fonds d'urgence sera constitué lorsque vos livrets atteignent ${formatEur(fondUrgenceNecessaire)} (actuellement ${formatEur(fondUrgenceActuel)}). À terme, vos revenus passifs estimés couvriront ${couverturePct} % de vos dépenses mensuelles.`

  return (
    <div className="flex flex-col gap-6">

      {/* Paramètres */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <h3 className="text-xs tracking-widest uppercase text-muted mb-4">Paramètres sécurité</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Dépenses mensuelles</span>
            <NumberInput value={depensesMensuelles} onChange={setDepensesMensuelles} min={0} step={100} suffix="€" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Mois de sécurité visés</span>
            <NumberInput value={moisSecurite} onChange={setMoisSecurite} min={1} max={36} step={1} suffix="mois" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Revenus passifs visés</span>
            <NumberInput value={revenusPassifsVises} onChange={setRevenusPassifsVises} min={0} step={100} suffix="€/mois" size="lg" />
          </label>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Fonds d'urgence */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Fonds d'urgence</div>
          <div className="text-2xl font-mono text-foreground tabular-nums">{formatEur(fondUrgenceActuel)}</div>
          <div className="text-xs text-muted mt-1">/{formatEur(fondUrgenceNecessaire)} nécessaires</div>
          <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${fondUrgenceAtteint ? 'bg-success' : 'bg-orange'}`}
              style={{ width: `${Math.min(100, fondUrgenceNecessaire > 0 ? (fondUrgenceActuel / fondUrgenceNecessaire) * 100 : 0)}%` }}
            />
          </div>
          <div className="mt-1.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${fondUrgenceAtteint ? 'text-success bg-success/10' : 'text-orange bg-orange/10'}`}>
              {fondUrgenceAtteint ? '✓ Atteint' : 'En cours'}
            </span>
          </div>
        </div>

        {/* Couverture passive */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Couverture passive</div>
          <div className={`text-2xl font-mono tabular-nums ${couvertureColor}`}>{couverturePct} %</div>
          <div className="text-xs text-muted mt-1">des dépenses couvertes à terme</div>
          <div className="mt-1.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${couvertureBadge}`}>
              {couverturePct >= 50 ? '≥ 50 %' : couverturePct >= 25 ? '25–50 %' : '< 25 %'}
            </span>
          </div>
        </div>

        {/* Part sécurisée */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Part sécurisée</div>
          <div className={`text-2xl font-mono tabular-nums ${partColor}`}>{partSecuriseeActuelle} %</div>
          <div className="text-xs text-muted mt-1">du patrimoine en livrets</div>
          <div className="text-[10px] text-muted mt-1.5">{partNote}</div>
        </div>

        {/* Score sécurité */}
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Score de sécurité</div>
          <div className={`text-2xl font-mono tabular-nums ${scoreColor}`}>{scoreSecurite}/10</div>
          <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreSecurite >= 8 ? 'bg-success' : scoreSecurite >= 5 ? 'bg-warning' : 'bg-danger'}`}
              style={{ width: `${scoreSecurite * 10}%` }}
            />
          </div>
          <div className="text-xs text-muted mt-1.5">
            {fondUrgenceAtteint ? '+4 fonds urgence' : ''}{couverturePct >= 50 ? ' +3 couverture' : ''}{partSecuriseeActuelle >= 20 && partSecuriseeActuelle <= 60 ? ' +2 répartition' : ''}{globalParams.duration > 15 ? ' +1 durée' : ''}
          </div>
        </div>
      </div>

      {/* Graphique double */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="text-xs tracking-widest uppercase text-muted mb-4">Fonds d'urgence &amp; revenus passifs</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
              formatter={(v, name) => [
                formatEur(v as number),
                name === 'fondsUrgence' ? 'Fonds urgence' : 'Revenus passifs/mois',
              ]}
              labelFormatter={(l) => `Année ${l}`}
            />
            <ReferenceLine
              y={revenusPassifsVises}
              stroke="#22C55E"
              strokeDasharray="6 3"
              strokeWidth={1.5}
            >
              <Label value="Objectif revenus" position="insideTopRight" fill="#22C55E" fontSize={10} />
            </ReferenceLine>
            {anneeIndependance != null && (
              <ReferenceLine
                x={anneeIndependance}
                stroke="#22C55E"
                strokeDasharray="4 2"
                strokeWidth={1}
              >
                <Label value="Indépendance partielle" position="insideTopLeft" fill="#22C55E" fontSize={9} />
              </ReferenceLine>
            )}
            <Line
              type="monotone"
              dataKey="fondsUrgence"
              stroke="#2563EB"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#2563EB' }}
            />
            <Line
              type="monotone"
              dataKey="revenusPassifs"
              stroke="#6366F1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#6366F1' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-6 mt-3 justify-center">
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-4 h-0.5 bg-orange inline-block rounded" />
            Fonds d'urgence (livrets)
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="w-4 h-0.5 bg-purple inline-block rounded" />
            Revenus passifs/mois (règle 4 %)
          </div>
        </div>
      </div>

      {/* Bloc texte analytique */}
      <div className="bg-elevated border-l-2 border-l-orange rounded-r-lg px-4 py-3 text-sm text-secondary italic leading-relaxed">
        {analysisText}
      </div>
    </div>
  )
}

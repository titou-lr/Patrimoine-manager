import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Label,
} from 'recharts'
import { formatEur } from '../../utils/format'
import type { SimulationResult, GlobalParams } from '../../types'
import NumberInput from '../ui/NumberInput'

interface Props {
  results: SimulationResult[]
  globalParams: GlobalParams
}

interface Params {
  prixBien: number
  apportActuel: number
  apportCible: number
  dureeEmprunt: number
  tauxEmprunt: number
  fraisNotaire: number
}

function computeMensualite(K: number, tauxAnnuel: number, dureeAns: number): number {
  const t = tauxAnnuel / 100 / 12
  const n = dureeAns * 12
  if (t === 0) return K / n
  return (K * t) / (1 - Math.pow(1 + t, -n))
}

export default function RealEstatePanel({ results, globalParams }: Props) {
  const [params, setParams] = useState<Params>({
    prixBien: 300_000,
    apportActuel: 0,
    apportCible: 10,
    dureeEmprunt: 20,
    tauxEmprunt: 3.5,
    fraisNotaire: 7.5,
  })

  function patch(p: Partial<Params>) {
    setParams((prev) => ({ ...prev, ...p }))
  }

  const { prixBien, apportActuel, apportCible, dureeEmprunt, tauxEmprunt, fraisNotaire } = params

  const apportNecessaire = useMemo(
    () => prixBien * (apportCible / 100) + prixBien * (fraisNotaire / 100),
    [prixBien, apportCible, fraisNotaire]
  )

  const K = useMemo(
    () => Math.max(0, prixBien - prixBien * (apportCible / 100)),
    [prixBien, apportCible]
  )

  const mensualite = useMemo(
    () => computeMensualite(K, tauxEmprunt, dureeEmprunt),
    [K, tauxEmprunt, dureeEmprunt]
  )

  const coutTotalCredit = useMemo(
    () => mensualite * dureeEmprunt * 12 - K,
    [mensualite, dureeEmprunt, K]
  )

  const { anneeAtteint } = useMemo(() => {
    for (const r of results) {
      if (r.totalNominal + apportActuel >= apportNecessaire) {
        return { anneeAtteint: r.year, anneesRestantes: r.year }
      }
    }
    return { anneeAtteint: null, anneesRestantes: null }
  }, [results, apportActuel, apportNecessaire])

  const currentYear = new Date().getFullYear()
  const anneeCalendaire = anneeAtteint != null ? currentYear + anneeAtteint : null
  const ageAtteint = anneeAtteint != null ? globalParams.ageActuel + anneeAtteint : null

  const chartData = useMemo(
    () =>
      results.map((r) => ({
        year: r.year,
        capital: Math.round(r.totalNominal + apportActuel),
      })),
    [results, apportActuel]
  )

  const objectifDejaAtteint = apportActuel >= apportNecessaire

  const analysisText = objectifDejaAtteint
    ? `Votre apport actuel de ${formatEur(apportActuel)} couvre déjà l'apport nécessaire de ${formatEur(apportNecessaire)}. Vous pouvez emprunter ${formatEur(K)} sur ${dureeEmprunt} ans à ${tauxEmprunt} %, soit une mensualité de ${formatEur(mensualite)}/mois.`
    : anneeAtteint != null
      ? `À ce rythme, vous atteindrez l'apport nécessaire de ${formatEur(apportNecessaire)} dans ${anneeAtteint} an${anneeAtteint > 1 ? 's' : ''} (en ${anneeCalendaire}), à ${ageAtteint} ans. Vous pourrez alors emprunter ${formatEur(K)} sur ${dureeEmprunt} ans à ${tauxEmprunt} %, soit une mensualité de ${formatEur(mensualite)}/mois.`
      : `À votre rythme actuel, vous n'atteignez pas l'apport nécessaire de ${formatEur(apportNecessaire)} avant la fin de la simulation. Augmentez vos versements ou réduisez votre apport cible.`

  return (
    <div className="flex flex-col gap-6">

      {/* Paramètres */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <h3 className="text-xs tracking-widest uppercase text-muted mb-4">Paramètres immobilier</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Prix du bien visé</span>
            <NumberInput value={prixBien} onChange={(v) => patch({ prixBien: v })} min={10_000} step={5000} suffix="€" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Apport personnel actuel</span>
            <NumberInput value={apportActuel} onChange={(v) => patch({ apportActuel: v })} min={0} step={1000} suffix="€" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Apport cible souhaité</span>
            <NumberInput value={apportCible} onChange={(v) => patch({ apportCible: v })} min={0} max={100} step={1} suffix="%" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Durée du prêt</span>
            <NumberInput value={dureeEmprunt} onChange={(v) => patch({ dureeEmprunt: v })} min={5} max={30} step={1} suffix="ans" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Taux d'intérêt emprunt</span>
            <NumberInput value={tauxEmprunt} onChange={(v) => patch({ tauxEmprunt: v })} min={0} max={15} step={0.1} suffix="%" size="lg" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">Frais de notaire</span>
            <NumberInput value={fraisNotaire} onChange={(v) => patch({ fraisNotaire: v })} min={0} max={20} step={0.5} suffix="%" size="lg" />
          </label>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Apport nécessaire</div>
          <div className="text-2xl font-mono text-orange tabular-nums">{formatEur(apportNecessaire)}</div>
          <div className="text-xs text-muted mt-1">{apportCible} % prix + {fraisNotaire} % notaire</div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Apport atteint dans</div>
          {objectifDejaAtteint ? (
            <div className="text-2xl font-mono text-success tabular-nums">0 an</div>
          ) : anneeAtteint != null ? (
            <div className="text-2xl font-mono text-foreground tabular-nums">{anneeAtteint} an{anneeAtteint > 1 ? 's' : ''}</div>
          ) : (
            <div className="text-2xl font-mono text-danger tabular-nums">—</div>
          )}
          <div className="mt-1.5">
            {objectifDejaAtteint ? (
              <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">✓ Objectif déjà atteint</span>
            ) : anneeCalendaire != null ? (
              <span className="text-[10px] text-muted">en {anneeCalendaire}</span>
            ) : (
              <span className="text-[10px] font-medium text-danger bg-danger/10 px-2 py-0.5 rounded-full">Hors simulation</span>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Mensualité estimée</div>
          <div className="text-2xl font-mono text-purple tabular-nums">{formatEur(mensualite)}/mois</div>
          <div className="text-xs text-muted mt-1">sur {dureeEmprunt} ans</div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-4">
          <div className="text-xs text-muted mb-1.5">Coût total du crédit</div>
          <div className="text-2xl font-mono text-danger tabular-nums">{formatEur(coutTotalCredit)}</div>
          <div className="text-xs text-muted mt-1">intérêts cumulés</div>
        </div>
      </div>

      {/* Graphique */}
      <div className="bg-surface rounded-2xl border border-border p-5">
        <div className="text-xs tracking-widest uppercase text-muted mb-4">Capital vs apport nécessaire</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="re-cap" x1="0" y1="0" x2="0" y2="1">
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
              y={apportNecessaire}
              stroke="#22C55E"
              strokeDasharray="6 3"
              strokeWidth={1.5}
            >
              <Label value="Apport nécessaire" position="insideTopRight" fill="#22C55E" fontSize={10} />
            </ReferenceLine>
            <Area
              type="monotone"
              dataKey="capital"
              stroke="#2563EB"
              strokeWidth={2}
              fill="url(#re-cap)"
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

import { useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useStore, selectActiveSim } from '../../store/useStore'
import { usePatrimoineStore } from '../../patrimoine/store/usePatrimoineStore'
import { useBudgetStore } from '../../budget/store/useBudgetStore'
import {
  computePatrimoineNet,
  computeEmergencyCoverage,
  buildTimelineFromSnapshots,
  computeTopMovers,
} from '../../patrimoine/engine/patrimoineEngine'
import { ASSET_CATEGORY_META, LIABILITY_CATEGORY_META } from '../../patrimoine/data/patrimoineCategories'
import { computeMonthlySnapshot, compareToSimulationAssumption } from '../../budget/engine/budgetEngine'
import { generateAlerts, type Alert } from '../../engine/alertsEngine'
import { generateBudgetAlerts } from '../../budget/engine/budgetAlertsEngine'
import { formatEur, formatPct } from '../../utils/format'
import HealthScoreCard from '../results/HealthScoreCard'
import PatrimoineSaisieTab from '../../patrimoine/components/PatrimoineSaisieTab'
import HelpButton from '../../help/components/HelpButton'
import type { Envelope, GlobalParams, LifeEvent, SimulationResult } from '../../types'
import type { PatrimoineAssetCategory, PatrimoineLiabilityCategory } from '../../patrimoine/types/patrimoine'

type PatrimoineTab = 'overview' | 'saisie'

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
  globalParams: GlobalParams
  onGoToEnvelopes: () => void
  onGoToBudget: () => void
  onGoToSuccession: () => void
  onToast: (msg: string) => void
}

const DAY_MS = 24 * 3600 * 1000
const STALE_DAYS = 30

const EVENT_EMOJI: Record<string, string> = {
  pause: '⏸', windfall: '💰', withdrawal: '🏠',
  expense_increase: '📈', child: '👶', custom: '✏️',
}

const ENVELOPE_FISCALE_LABELS: Record<string, string> = {
  pea: 'PEA',
  assurance_vie: 'Assurance-vie',
  per: 'PER',
  cto: 'CTO',
  compte_bancaire: 'Comptes bancaires',
  hors_enveloppe: 'Hors enveloppe',
}

const ENVELOPE_FISCALE_COLORS: Record<string, string> = {
  pea: '#5e6ad2',
  assurance_vie: '#828fff',
  per: '#8b6bd2',
  cto: '#6c8cd5',
  compte_bancaire: '#4cb782',
  hors_enveloppe: '#8a8f98',
}

function KPI({ label, value, sub, tone }: {
  label: string; value: string; sub?: string; tone?: string
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {sub && <div className="caption" style={{ fontSize: 11.5 }}>{sub}</div>}
    </div>
  )
}

function ChartTooltipBox({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
      borderRadius: 'var(--r-lg)', padding: '8px 12px', fontSize: 12,
    }}>
      <div className="caption" style={{ marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="row gap8" style={{ justifyContent: 'space-between' }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="mono" style={{ color: 'var(--ink)' }}>{formatEur(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/** Donut répartition avec toggle classe d'actifs / enveloppe fiscale */
function RepartitionDonut({ byCategory, byEnvelopeFiscale }: {
  byCategory: Record<string, number>
  byEnvelopeFiscale: Record<string, number>
}) {
  const [mode, setMode] = useState<'classe' | 'fiscale'>('classe')

  const data = useMemo(() => {
    const source = mode === 'classe' ? byCategory : byEnvelopeFiscale
    const entries = Object.entries(source)
      .filter(([key, v]) => v > 0 && (mode === 'fiscale' ||
        (key in ASSET_CATEGORY_META)))  // en mode classe : actifs uniquement (les passifs ont leur propre section)
      .map(([key, val]) => ({
        key,
        val: Math.round(val),
        label: mode === 'classe'
          ? (ASSET_CATEGORY_META[key as PatrimoineAssetCategory]?.label
            ?? LIABILITY_CATEGORY_META[key as PatrimoineLiabilityCategory]?.label ?? key)
          : (ENVELOPE_FISCALE_LABELS[key] ?? key),
        color: mode === 'classe'
          ? (ASSET_CATEGORY_META[key as PatrimoineAssetCategory]?.color ?? '#62666d')
          : (ENVELOPE_FISCALE_COLORS[key] ?? '#62666d'),
      }))
      .sort((a, b) => b.val - a.val)
    const total = entries.reduce((s, e) => s + e.val, 0)
    return { entries: entries.map((e) => ({ ...e, pct: total > 0 ? Math.round((e.val / total) * 100) : 0 })), total }
  }, [mode, byCategory, byEnvelopeFiscale])

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div className="spread" style={{ marginBottom: 16 }}>
        <div className="title">Répartition</div>
        <div className="seg" data-tour-id="patrimoine-repartition-toggle">
          <button className={mode === 'classe' ? 'on' : ''} onClick={() => setMode('classe')}>Par classe d'actifs</button>
          <button className={mode === 'fiscale' ? 'on' : ''} onClick={() => setMode('fiscale')}>Par enveloppe fiscale</button>
        </div>
      </div>
      {data.entries.length === 0 ? (
        <div className="caption" style={{ padding: '24px 0', textAlign: 'center' }}>
          Aucun actif saisi — utilisez l'onglet « Saisir mon patrimoine »
        </div>
      ) : (
        <div className="row gap24" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
            <PieChart width={160} height={160}>
              <Pie data={data.entries} cx={80} cy={80} innerRadius={54} outerRadius={72}
                dataKey="val" paddingAngle={1} startAngle={90} endAngle={-270}
                stroke="none" isAnimationActive={false}>
                {data.entries.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
            }}>
              <div className="mono" style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>
                {data.entries[0]?.pct ?? 0}%
              </div>
              <div className="caption" style={{ fontSize: 10, textAlign: 'center', maxWidth: 74 }}>
                {data.entries[0]?.label ?? ''}
              </div>
            </div>
          </div>
          <div className="col gap8" style={{ minWidth: 200, flex: 1 }}>
            {data.entries.map((d) => (
              <div key={d.key} className="row gap8" style={{ alignItems: 'center' }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: d.color, flexShrink: 0 }} />
                <span className="small grow">{d.label}</span>
                <span className="mono small muted" style={{ width: 84, textAlign: 'right' }}>{formatEur(d.val)}</span>
                <span className="mono caption" style={{ width: 36, textAlign: 'right', color: 'var(--ink-tertiary)' }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPatrimoinePage({
  results, envelopes, globalParams,
  onGoToEnvelopes, onGoToBudget, onGoToSuccession, onToast,
}: Props) {
  const [tab, setTab] = useState<PatrimoineTab>('overview')
  const { assets, liabilities: patLiabilities, snapshots, takeSnapshot } = usePatrimoineStore()
  const { events, liabilities: simLiabilities } = useStore(selectActiveSim)
  const {
    transactions: budgetTxs, envelopes: budgetEnvs,
    categories: budgetCats, recurringRules: budgetRules, selectedMonth,
  } = useBudgetStore()

  const net = useMemo(() => computePatrimoineNet(assets, patLiabilities), [assets, patLiabilities])

  // Snapshot budget du mois (dépenses + taux d'épargne réel)
  const hasBudgetData = budgetEnvs.length > 0 || budgetTxs.length > 0
  const budgetSnapshot = useMemo(
    () => (hasBudgetData ? computeMonthlySnapshot(budgetTxs, budgetEnvs, selectedMonth) : null),
    [hasBudgetData, budgetTxs, budgetEnvs, selectedMonth]
  )

  const emergencyMonths = computeEmergencyCoverage(
    net.patrimoineNet,
    budgetSnapshot && budgetSnapshot.totalExpenses > 0 ? budgetSnapshot.totalExpenses : null
  )

  // Snapshots : dernier, variation, fraîcheur
  const sortedSnaps = useMemo(
    () => [...snapshots].sort((a, b) => a.date.localeCompare(b.date)),
    [snapshots]
  )
  const lastSnap = sortedSnaps[sortedSnaps.length - 1]
  const prevSnap = sortedSnaps[sortedSnaps.length - 2]
  const variation = lastSnap && prevSnap ? lastSnap.patrimoineNet - prevSnap.patrimoineNet : null
  const variationPct = variation !== null && prevSnap && prevSnap.patrimoineNet !== 0
    ? (variation / Math.abs(prevSnap.patrimoineNet)) * 100
    : null
  const snapAgeDays = lastSnap
    ? Math.floor((Date.now() - new Date(lastSnap.date).getTime()) / DAY_MS)
    : null

  const timeline = useMemo(() => buildTimelineFromSnapshots(snapshots), [snapshots])
  const topMovers = useMemo(() => computeTopMovers(snapshots, assets), [snapshots, assets])

  // Prochains événements de vie (3 max, triés par échéance)
  const nextEvents = useMemo(() => {
    const evts = (events ?? []) as LifeEvent[]
    return [...evts].sort((a, b) => a.yearOffset - b.yearOffset).slice(0, 3)
  }, [events])

  // Alertes P1 (mêmes moteurs que SmartAlerts)
  const p1Alerts = useMemo(() => {
    if (results.length === 0) return [] as Alert[]
    const simAlerts = generateAlerts(envelopes, results, globalParams, simLiabilities ?? [])
    let budgetAlerts: Alert[] = []
    if (budgetSnapshot) {
      const gap = compareToSimulationAssumption(budgetSnapshot, globalParams)
      budgetAlerts = generateBudgetAlerts(
        budgetSnapshot, budgetEnvs, budgetCats, budgetTxs, gap, budgetRules
      ) as unknown as Alert[]
    }
    return [...simAlerts, ...budgetAlerts].filter((a) => a.priority === 1).slice(0, 3)
  }, [results, envelopes, globalParams, simLiabilities, budgetSnapshot, budgetEnvs, budgetCats, budgetTxs, budgetRules])

  function handleTakeSnapshot() {
    const snap = takeSnapshot()
    onToast(`Snapshot enregistré — ${assets.length} actif${assets.length > 1 ? 's' : ''}, patrimoine net ${formatEur(snap.patrimoineNet)}`)
  }

  return (
    <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="spread" style={{ marginBottom: 22 }} data-tour-id="patrimoine-header">
          <div>
            <h1 className="headline">Patrimoine</h1>
            <div className="caption">Votre patrimoine réel aujourd'hui — distinct des projections de simulation</div>
          </div>
          <div className="row gap8">
            <button className="btn btn-secondary btn-sm" onClick={onGoToSuccession}>
              Succession / Donation
            </button>
            <div className="seg" data-tour-id="patrimoine-tab-seg">
              <button className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>Vue d'ensemble</button>
              <button className={tab === 'saisie' ? 'on' : ''} onClick={() => setTab('saisie')}>Saisir mon patrimoine</button>
            </div>
            <HelpButton page="patrimoine" />
          </div>
        </div>

        {tab === 'saisie' && (
          <PatrimoineSaisieTab
            simulationEnvelopes={envelopes.map((e) => ({ id: e.id, label: e.label, type: e.type }))}
            onSnapshotTaken={handleTakeSnapshot}
          />
        )}

        {tab === 'overview' && (
          <>
            {/* ── Chiffre dominant ──────────────────────────────────────── */}
            <div className="panel" style={{ padding: '24px 28px', marginBottom: 24 }} data-tour-id="patrimoine-net-hero">
              <div className="row gap24" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <div className="kpi-label" style={{ marginBottom: 6 }}>Patrimoine net</div>
                  <div className="mono" style={{
                    fontSize: 44, fontWeight: 600, lineHeight: 1.05,
                    color: net.patrimoineNet >= 0 ? 'var(--ink)' : 'var(--danger)',
                  }}>
                    {formatEur(net.patrimoineNet)}
                  </div>
                </div>
                {variation !== null && (
                  <div style={{ paddingBottom: 4 }}>
                    <span className="mono" style={{
                      fontSize: 15, fontWeight: 500,
                      color: variation >= 0 ? 'var(--success)' : 'var(--danger)',
                    }}>
                      {variation >= 0 ? '+' : ''}{formatEur(variation)}
                      {variationPct !== null && ` (${variationPct >= 0 ? '+' : ''}${variationPct.toFixed(1)} %)`}
                    </span>
                    <div className="caption" style={{ fontSize: 11 }}>vs snapshot précédent</div>
                  </div>
                )}
                <div className="grow" />
                <div className="col" style={{ alignItems: 'flex-end', gap: 6, paddingBottom: 4 }}>
                  {lastSnap ? (
                    <div className="row gap8">
                      <span className="caption">
                        Dernier snapshot : {new Date(lastSnap.date).toLocaleDateString('fr-FR')}
                      </span>
                      {snapAgeDays !== null && snapAgeDays > STALE_DAYS && (
                        <span className="badge" style={{ color: 'var(--warning)', border: '1px solid var(--warning)' }}>
                          Mettre à jour
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="caption">Aucun snapshot pris</span>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={handleTakeSnapshot} disabled={assets.length === 0 && patLiabilities.length === 0} data-tour-id="patrimoine-snapshot-btn">
                    Prendre un snapshot
                  </button>
                </div>
              </div>
            </div>

            {/* ── KPIs ──────────────────────────────────────────────────── */}
            <div className="kpi-row" style={{
              padding: '16px 0 22px', borderTop: '1px solid var(--hairline)',
              borderBottom: '1px solid var(--hairline)', marginBottom: 24,
            }}>
              <KPI label="Total actifs" value={formatEur(net.totalActifs)} />
              <KPI label="Total passifs" value={formatEur(net.totalPassifs)} tone={net.totalPassifs > 0 ? 'danger' : undefined} />
              <KPI
                label="Ratio liquidités"
                value={net.liquiditeRatio !== null ? formatPct(net.liquiditeRatio * 100, 0) : '—'}
                sub="compte + CTO + crypto / net"
              />
              <KPI
                label="Fonds d'urgence"
                value={emergencyMonths !== null ? `${emergencyMonths.toFixed(1)} mois` : '—'}
                sub={emergencyMonths !== null ? 'de dépenses couvertes' : 'nécessite des données budget'}
              />
              <KPI
                label="Taux d'endettement"
                value={net.tauxEndettement !== null ? formatPct(net.tauxEndettement * 100, 0) : '—'}
                tone={net.tauxEndettement !== null && net.tauxEndettement > 0.5 ? 'danger' : undefined}
              />
              {budgetSnapshot && budgetSnapshot.totalIncome > 0 && (
                <KPI
                  label="Taux d'épargne réel"
                  value={formatPct(budgetSnapshot.realSavingsRate * 100, 0)}
                  sub={`mois ${selectedMonth}`}
                />
              )}
            </div>

            {/* ── Score de santé financière (si simulation lancée) ─────── */}
            {results.length > 0 && <HealthScoreCard results={results} />}

            {/* ── Répartition + Top movers ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: topMovers.length >= 2 ? '3fr 2fr' : '1fr', gap: 24, marginBottom: 24 }}>
              <RepartitionDonut byCategory={net.byCategory} byEnvelopeFiscale={net.byEnvelopeFiscale} />
              {topMovers.length >= 2 && (
                <div className="panel" style={{ padding: 20 }}>
                  <div className="title" style={{ marginBottom: 16 }}>Top movers</div>
                  <div className="col gap10">
                    {topMovers.map((m) => (
                      <div key={m.assetId} className="row gap8" style={{ alignItems: 'center' }}>
                        <div className="grow">
                          <div className="small">{m.label}</div>
                          <div className="caption" style={{ fontSize: 11 }}>
                            {formatEur(m.previousValue)} → {formatEur(m.currentValue)}
                          </div>
                        </div>
                        <span className="mono small" style={{ color: m.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {m.delta >= 0 ? '+' : ''}{formatEur(m.delta)}
                          {m.deltaPct !== null && ` (${m.deltaPct >= 0 ? '+' : ''}${m.deltaPct.toFixed(1)} %)`}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="caption" style={{ marginTop: 12, fontSize: 11 }}>
                    Variations entre les deux derniers snapshots
                  </div>
                </div>
              )}
            </div>

            {/* ── Timeline patrimoine ───────────────────────────────────── */}
            <div className="panel" style={{ padding: '18px 20px 14px', marginBottom: 24 }} data-tour-id="patrimoine-timeline">
              <div className="title" style={{ marginBottom: 12 }}>Évolution du patrimoine</div>
              {timeline.length < 2 ? (
                <div style={{ padding: '36px 0', textAlign: 'center' }}>
                  <div className="title" style={{ marginBottom: 6 }}>Pas encore d'historique</div>
                  <div className="caption" style={{ maxWidth: 420, margin: '0 auto 16px' }}>
                    Saisissez vos actifs et passifs, puis prenez un premier snapshot.
                    Chaque snapshot ajoute un point à cette courbe — revenez mensuellement pour suivre votre progression.
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setTab('saisie')}>
                    Saisir mon patrimoine
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="patNetGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5e6ad2" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#5e6ad2" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--hairline-soft)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'var(--ink-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'var(--ink-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} width={44} />
                    <Tooltip content={<ChartTooltipBox />} />
                    <Area type="monotone" dataKey="totalActifs" name="Actifs" stroke="#4cb782" fill="none" strokeWidth={1.2} strokeDasharray="4 3" />
                    <Area type="monotone" dataKey="totalPassifs" name="Passifs" stroke="#eb5757" fill="none" strokeWidth={1.2} strokeDasharray="4 3" />
                    <Area type="monotone" dataKey="patrimoineNet" name="Patrimoine net" stroke="#5e6ad2" fill="url(#patNetGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Événements de vie + Alertes ───────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="panel" style={{ padding: 20 }}>
                <div className="spread" style={{ marginBottom: 14 }}>
                  <div className="title">Prochains événements de vie</div>
                  <button className="btn btn-ghost btn-sm" onClick={onGoToEnvelopes}>Gérer →</button>
                </div>
                {nextEvents.length === 0 ? (
                  <div className="caption" style={{ padding: '12px 0' }}>
                    Aucun événement planifié — ajoutez-en depuis la page Enveloppes pour modéliser vos projets.
                  </div>
                ) : (
                  <div className="col gap10">
                    {nextEvents.map((ev) => (
                      <div key={ev.id} className="row gap10" style={{ alignItems: 'center' }}>
                        <span style={{ fontSize: 16 }}>{EVENT_EMOJI[ev.type] ?? '📅'}</span>
                        <div className="grow">
                          <div className="small">{ev.label}</div>
                          <div className="caption" style={{ fontSize: 11 }}>
                            Dans {ev.yearOffset} an{ev.yearOffset > 1 ? 's' : ''}
                            {ev.duration ? ` · ${ev.duration} an${ev.duration > 1 ? 's' : ''}` : ''}
                          </div>
                        </div>
                        <span className="mono small muted">
                          {ev.amount != null
                            ? formatEur(ev.amount)
                            : ev.monthlyImpact != null
                              ? `${ev.monthlyImpact > 0 ? '+' : ''}${ev.monthlyImpact} €/mois`
                              : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel" style={{ padding: 20 }}>
                <div className="title" style={{ marginBottom: 14 }}>Alertes actives</div>
                {p1Alerts.length === 0 ? (
                  <div className="caption" style={{ padding: '12px 0' }}>
                    {results.length === 0
                      ? 'Lancez une simulation pour activer les alertes.'
                      : 'Aucune alerte critique — tout est sous contrôle. ✓'}
                  </div>
                ) : (
                  <div className="col gap10">
                    {p1Alerts.map((a) => (
                      <div key={a.id} style={{
                        borderLeft: '2px solid var(--warning)', paddingLeft: 12,
                      }}>
                        <div className="small" style={{ fontWeight: 500 }}>{a.title}</div>
                        <div className="caption" style={{ fontSize: 11.5, marginTop: 2 }}>{a.message}</div>
                        {a.actionLabel && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 0', fontSize: 11.5, color: 'var(--primary-hover)' }}
                            onClick={() => {
                              const target = (a as { actionTarget?: string }).actionTarget
                              if (target === 'budget') onGoToBudget()
                              else onGoToEnvelopes()
                            }}
                          >
                            {a.actionLabel} →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

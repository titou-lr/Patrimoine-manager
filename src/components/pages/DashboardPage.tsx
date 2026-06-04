import { useState } from 'react'
import { useStore, selectActiveSim } from '../../store/useStore'
import { formatEur } from '../../utils/format'
import type { Envelope, GlobalParams, LifeEvent, MonteCarloResult, SimulationResult } from '../../types'
import PatrimoineChart from '../results/PatrimoineChart'
import AllocationPieChart from '../results/AllocationPieChart'
import RetirementPanel from '../results/RetirementPanel'
import RealEstatePanel from '../results/RealEstatePanel'
import CapitalPanel from '../results/CapitalPanel'
import SecurityPanel from '../results/SecurityPanel'
import InflationChart from '../results/InflationChart'
import SmartAlerts from '../alerts/SmartAlerts'
import NetWorthPanel from '../networth/NetWorthPanel'
import HistoryPanel from '../tracking/HistoryPanel'
import { PieChart, Pie, Cell } from 'recharts'

type ChartTab = 'projection' | 'inflation' | 'retraite' | 'immobilier' | 'capital' | 'securite' | 'bilan_net'

const CHART_TABS: { id: ChartTab; label: string }[] = [
  { id: 'projection',  label: 'Projection' },
  { id: 'inflation',   label: 'Inflation' },
  { id: 'retraite',    label: 'Retraite' },
  { id: 'immobilier',  label: 'Immobilier' },
  { id: 'capital',     label: 'Capital' },
  { id: 'securite',    label: 'Sécurité' },
  { id: 'bilan_net',   label: 'Bilan net' },
]

interface Props {
  results: SimulationResult[]
  envelopes: Envelope[]
  globalParams: GlobalParams
  simulationsCount: number
  events: LifeEvent[]
  monteCarloResults?: MonteCarloResult[]
  onOpenCompare: () => void
  onGoToEnvelopes: () => void
  onExportCSV?: () => void
}

// ── SVG icons (inline, minimal) ──────────────────────────────────────────────

const IconPlay   = () => <svg width={13} height={13} viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.5v9l7.5-4.5z" /></svg>
const IconExport = () => <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2.5v6.5M5.4 6.6 8 9.2l2.6-2.6" /><path d="M3 11v1.5h10V11" /></svg>
const IconArrowUp = () => <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12.5V3.5M4.5 7 8 3.5 11.5 7" /></svg>

// ── KPI component ─────────────────────────────────────────────────────────────

function KPI({ label, value, sub, hero, tone }: {
  label: string; value: string; sub?: React.ReactNode; hero?: boolean; tone?: string
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value${hero ? ' hero' : ''}`} style={tone ? { color: `var(--${tone})` } : undefined}>
        {value}
      </div>
      {sub && <div className="caption row gap4" style={{ fontSize: 11.5 }}>{sub}</div>}
    </div>
  )
}

// ── Asset-class donut ─────────────────────────────────────────────────────────

const CLASS_META: Record<string, { label: string; color: string }> = {
  equity:       { label: 'Actions',     color: 'var(--c-equity)' },
  bonds:        { label: 'Obligations', color: 'var(--c-bonds)' },
  real_estate:  { label: 'Immobilier',  color: 'var(--c-realestate)' },
  crypto:       { label: 'Crypto',      color: '#e2b550' },
  money_market: { label: 'Monétaire',   color: 'var(--c-money)' },
  regulated:    { label: 'Livrets',     color: '#4cb782' },
}

const REGULATED_TYPES = new Set(['livret_a', 'ldds', 'livret_jeune'])

function mapAssetClass(name: string): string {
  const n = name.toLowerCase()
  if (/crypto|bitcoin|btc|ethereum|eth|coin/i.test(n)) return 'crypto'
  if (/scpi|immobilier|reit|foncier|pierre/i.test(n)) return 'real_estate'
  if (/obligat|bond|agregat|souverain|treasury/i.test(n)) return 'bonds'
  if (/livret|monetaire|money.?market|fonds.?euro/i.test(n)) return 'money_market'
  return 'equity'
}

function AssetClassDonut({ results, envelopes }: { results: SimulationResult[]; envelopes: Envelope[] }) {
  if (!results.length) return null
  const last = results[results.length - 1]

  const totals: Record<string, number> = {}
  for (const env of envelopes.filter(e => e.active)) {
    const capital = last.byEnvelope[env.id]?.capital ?? 0
    if (!capital) continue

    if (REGULATED_TYPES.has(env.type)) {
      totals.regulated = (totals.regulated ?? 0) + capital
      continue
    }

    const assets = env.assets ?? []
    if (!assets.length) {
      const cls = env.type === 'assurance_vie' || env.type === 'per' ? 'bonds' : 'equity'
      totals[cls] = (totals[cls] ?? 0) + capital
      continue
    }

    const totalAlloc = assets.reduce((s, a) => s + (a.allocation ?? 0), 0) || 100
    for (const asset of assets) {
      const share = (asset.allocation ?? 0) / totalAlloc
      const cls = mapAssetClass(asset.name)
      totals[cls] = (totals[cls] ?? 0) + capital * share
    }
  }

  const total = Object.values(totals).reduce((s, v) => s + v, 0)
  if (!total) return null

  const data = Object.entries(totals)
    .map(([key, val]) => ({
      key, val: Math.round(val),
      pct: Math.round((val / total) * 100),
      label: CLASS_META[key]?.label ?? key,
      color: CLASS_META[key]?.color ?? 'var(--c-equity)',
    }))
    .filter(d => d.pct > 0)
    .sort((a, b) => b.val - a.val)

  const largest = data[0]

  return (
    <div className="row gap24" style={{ alignItems: 'center' }}>
      {/* Donut 160×160 */}
      <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0, overflow: 'hidden' }}>
        <PieChart width={160} height={160}>
          <Pie data={data} cx={80} cy={80} innerRadius={54} outerRadius={72}
            dataKey="val" paddingAngle={1} startAngle={90} endAngle={-270}
            stroke="none" isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
        }}>
          <div className="mono" style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink)' }}>
            {largest?.pct ?? 0}%
          </div>
          <div className="caption" style={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center', maxWidth: 70 }}>
            {largest?.label ?? ''}
          </div>
        </div>
      </div>

      {/* Légende droite */}
      <div className="col gap8" style={{ minWidth: 160, flex: 1 }}>
        {data.map(d => (
          <div key={d.key} className="row gap8" style={{ alignItems: 'center' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: d.color, flexShrink: 0 }} />
            <span className="small grow">{d.label}</span>
            <div style={{ width: 60, height: 3, background: 'var(--hairline)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ width: `${d.pct}%`, height: '100%', background: d.color, borderRadius: 99 }} />
            </div>
            <span className="mono small muted" style={{ textAlign: 'right', width: 72, flexShrink: 0 }}>
              {formatEur(d.val)}
            </span>
            <span className="mono caption" style={{ textAlign: 'right', width: 36, color: 'var(--ink-tertiary)', flexShrink: 0 }}>
              {d.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}


// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage({
  results,
  envelopes,
  globalParams,
  simulationsCount,
  events,
  monteCarloResults,
  onOpenCompare,
  onGoToEnvelopes,
  onExportCSV,
}: Props) {
  const { history } = useStore(selectActiveSim)
  const historyCount = (history ?? []).length

  const [chartTab, setChartTab] = useState<ChartTab>('projection')
  const [historyOpen, setHistoryOpen] = useState(false)

  // ── Empty state ────────────────────────────────────────────────────────────
  if (results.length === 0) {
    return (
      <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="spread" style={{ marginBottom: 22 }}>
            <h1 className="headline">Tableau de bord</h1>
            <button className="btn btn-primary btn-sm" onClick={onGoToEnvelopes}>
              <IconPlay /> Configurer
            </button>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 20, padding: '80px 0', textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 'var(--r-xl)', background: 'var(--surface-2)',
              border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M3 21L10 12l6 6 5-8 4 3" stroke="var(--ink-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="title" style={{ marginBottom: 6 }}>Aucune simulation lancée</div>
              <div className="caption">Configurez vos enveloppes et lancez la simulation pour voir vos projections</div>
            </div>
            <button className="btn btn-primary" onClick={onGoToEnvelopes}>
              <IconPlay /> Aller aux enveloppes
            </button>
          </div>
        </div>
      </div>
    )
  }

  const last = results[results.length - 1]
  const effort = envelopes.reduce((s, e) => s + (e.monthlyContribution ?? 0), 0)
  const gainPct = last.totalContributed > 0
    ? ((last.totalGains / last.totalContributed) * 100).toFixed(0)
    : '0'
  const initialTotal = envelopes.reduce((s, e) => s + (e.currentRealValue ?? e.initialCapital ?? 0), 0)

  // Compute approx weighted annual return
  const approxReturn = (() => {
    const n = results.length
    if (n < 2 || last.totalContributed <= 0) return null
    const r = Math.pow(last.totalNominal / Math.max(1, last.totalContributed), 1 / n) - 1
    return (r * 100).toFixed(1)
  })()

  return (
    <div className="scroll fade-in" style={{ flex: 1, padding: '26px 32px 60px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="spread" style={{ marginBottom: 22 }}>
          <div>
            <div className="row gap8" style={{ marginBottom: 4 }}>
              <h1 className="headline">Tableau de bord</h1>
              <span className="badge badge-accent">
                {(globalParams as any).scenario === 'pessimiste' ? 'Pessimiste' : (globalParams as any).scenario === 'optimiste' ? 'Optimiste' : 'Réaliste'}
              </span>
            </div>
            <div className="caption">
              Projection sur {globalParams.duration} ans
              {globalParams.ageActuel ? ` · retraite visée à ${globalParams.ageActuel + globalParams.duration} ans` : ''}
            </div>
          </div>
          <div className="row gap8">
            {onExportCSV && (
              <button className="btn btn-secondary btn-sm" onClick={onExportCSV}>
                <IconExport /> Exporter
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={onGoToEnvelopes}>
              <IconPlay /> Relancer
            </button>
          </div>
        </div>

        {/* ── KPI row ────────────────────────────────────────────────────── */}
        <div className="kpi-row" style={{ padding: '16px 0 22px', borderTop: '1px solid var(--hairline)', borderBottom: '1px solid var(--hairline)', marginBottom: 24 }}>
          <KPI
            label="Capital à terme"
            value={formatEur(last.totalNominal)}
            hero
            sub={<><span className="pos row gap4"><IconArrowUp />+{gainPct}%</span><span className="tertiary">vs versé</span></>}
          />
          <KPI label="Plus-values" value={`+${formatEur(last.totalGains)}`} tone="success" />
          <KPI label="Total versé" value={formatEur(last.totalContributed)} />
          <KPI label="Versements mensuels" value={`${formatEur(effort)}/mois`} />
          {approxReturn && <KPI label="Rendement net" value={`${approxReturn} %/an`} />}
          <KPI label="Patrimoine actuel" value={formatEur(initialTotal)} />
        </div>

        {/* ── SmartAlerts ────────────────────────────────────────────────── */}
        <SmartAlerts results={results} onNavigate={onGoToEnvelopes} />

        {/* ── Hero chart panel with tabs ──────────────────────────────────── */}
        <div className="panel" style={{ padding: '18px 20px 14px', marginBottom: 24 }}>

          {/* Panel header */}
          <div className="spread" style={{ marginBottom: 10 }}>
            <div className="title">
              {chartTab === 'projection' ? 'Projection du patrimoine'
                : chartTab === 'inflation' ? 'Valeur réelle & inflation'
                : chartTab === 'retraite' ? 'Analyse retraite'
                : chartTab === 'immobilier' ? 'Simulateur immobilier'
                : chartTab === 'capital' ? 'Objectif capital'
                : chartTab === 'securite' ? 'Sécurité financière'
                : 'Bilan net de patrimoine'}
            </div>
            <div className="seg">
              {CHART_TABS.map(t => (
                <button key={t.id} className={chartTab === t.id ? 'on' : ''} onClick={() => setChartTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart area */}
          {chartTab === 'projection' && (
            <PatrimoineChart
              results={results}
              envelopes={envelopes}
              events={events}
              monteCarloResults={monteCarloResults}
            />
          )}
          {chartTab === 'inflation' && <InflationChart results={results} />}
          {chartTab === 'retraite' && (
            <RetirementPanel results={results} envelopes={envelopes} globalParams={globalParams} />
          )}
          {chartTab === 'immobilier' && (
            <RealEstatePanel results={results} globalParams={globalParams} />
          )}
          {chartTab === 'capital' && (
            <CapitalPanel results={results} envelopes={envelopes} globalParams={globalParams} />
          )}
          {chartTab === 'securite' && (
            <SecurityPanel results={results} envelopes={envelopes} globalParams={globalParams} />
          )}
          {chartTab === 'bilan_net' && (
            <NetWorthPanel results={results} globalParams={globalParams} />
          )}
        </div>

        {/* ── Répartition grid (2 columns) ───────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24, alignItems: 'stretch' }}>
          <div className="panel" style={{ padding: 20 }}>
            <div className="title" style={{ marginBottom: 16 }}>Répartition par enveloppe</div>
            <AllocationPieChart results={results} envelopes={envelopes} />
          </div>
          <div className="panel" style={{ padding: 20 }}>
            <div className="title" style={{ marginBottom: 16 }}>Répartition par classe</div>
            <AssetClassDonut results={results} envelopes={envelopes} />
          </div>
        </div>

        {/* ── Tools row ──────────────────────────────────────────────────── */}
        {(historyCount > 0 || simulationsCount > 1) && (
          <div className="row gap8" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
            {historyCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setHistoryOpen(true)}>
                Suivi réel
                <span className="badge badge-accent" style={{ marginLeft: 2 }}>{historyCount}</span>
              </button>
            )}
            {simulationsCount > 1 && (
              <button className="btn btn-secondary btn-sm" onClick={onOpenCompare}>
                Comparer les simulations
              </button>
            )}
          </div>
        )}

      </div>

      {/* ── Drawers / overlays ─────────────────────────────────────────────── */}
      {historyOpen && (
        <HistoryPanel results={results} envelopes={envelopes} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  )
}

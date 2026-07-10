import { useState, useMemo } from 'react'
import { useStore, selectActiveSim, getEffortTotal } from '../../store/useStore'
import { formatEur } from '../../utils/format'
import NumberInput from '../ui/NumberInput'
import LifeEvents from '../tools/LifeEvents'
import HelpButton from '../../help/components/HelpButton'
import { runSimulation } from '../../engine/simulation'
import type { Envelope, Asset, GlobalParams } from '../../types'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ── Constants ────────────────────────────────────────────────────────────────

const ENVELOPE_HUE: Record<string, string> = {
  livret_a: '#4cb782', ldds: '#4cb782', livret_jeune: '#4cb782',
  pea: '#5e6ad2', cto: '#6c8cd5', assurance_vie: '#8b6bd2', per: '#e2b550',
}

const TYPE_LABEL: Record<string, string> = {
  livret_a: 'Livret', ldds: 'Livret', livret_jeune: 'Livret',
  pea: 'PEA', cto: 'CTO', assurance_vie: 'AV', per: 'PER',
}

// ── Inline SVG icons ─────────────────────────────────────────────────────────

const Ic = ({ d, s = 16, sw = 1.5, fill = 'none', children, className = '' }: {
  d?: string; s?: number; sw?: number; fill?: string; children?: React.ReactNode; className?: string
}) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill={fill} stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    {children ?? <path d={d} />}
  </svg>
)

const IcPlay      = () => <Ic fill="currentColor" sw={0}><path d="M5 3.5v9l7.5-4.5z" /></Ic>
const IcRefresh   = (p: { className?: string }) => <Ic className={p.className}><path d="M13 8a5 5 0 1 1-1.6-3.6" /><path d="M13.2 2.6v2.6h-2.6" /></Ic>
const IcPlus      = (p: { size?: number }) => <Ic s={p.size}><path d="M8 3.2v9.6M3.2 8h9.6" /></Ic>
const IcClose     = (p: { size?: number }) => <Ic s={p.size}><path d="M4 4l8 8M12 4l-8 8" /></Ic>
const IcChevron   = (p: { open?: boolean; size?: number }) => (
  <Ic s={p.size ?? 13} className={`chevron${p.open ? ' open' : ''}`}><path d="M6 3.5 10.5 8 6 12.5" /></Ic>
)
const IcSliders   = () => <Ic><path d="M3 5h6M11.5 5h1.5M3 11h1.5M7 11h6" /><circle cx="10" cy="5" r="1.6" /><circle cx="4.5" cy="11" r="1.6" /></Ic>
const IcBank      = () => <Ic><path d="M2.5 6 8 2.6 13.5 6" /><path d="M3.5 6.5v5M6.2 6.5v5M9.8 6.5v5M12.5 6.5v5M2.6 12.5h10.8" /></Ic>
const IcImport    = () => <Ic><path d="M8 2.5v6.5M5.4 6.6 8 9.2l2.6-2.6" /><path d="M3 11v1.5h10V11" /></Ic>

// ── RiskDots ─────────────────────────────────────────────────────────────────

function RiskDots({ n }: { n: number }) {
  return (
    <span className="risk">
      {[1, 2, 3, 4, 5].map(i => <i key={i} className={i <= n ? 'f' : ''} />)}
    </span>
  )
}

// ── Popover for param editing ─────────────────────────────────────────────────

function ParamPopover({ label, value, onChange, min, max, step, suffix }: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; suffix?: string; onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'absolute', top: 36, left: 0, zIndex: 50,
        background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
        borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-pop)',
        padding: 12, minWidth: 180, animation: 'pop .14s var(--ease)',
      }}
    >
      <div className="eyebrow" style={{ marginBottom: 8 }}>{label}</div>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min} max={max} step={step} suffix={suffix}
        size="md"
      />
      <div className="caption" style={{ marginTop: 6 }}>Appuyez sur Entrée pour valider</div>
    </div>
  )
}

// ── ScenarioSelect popover ────────────────────────────────────────────────────

function ScenarioPopover({ value, onChange, onClose }: {
  value: string; onChange: (v: string) => void; onClose: () => void
}) {
  const opts = [
    { id: 'pessimiste', label: 'Pessimiste', note: 'Rendements réduits, inflation élevée' },
    { id: 'realiste',   label: 'Réaliste',   note: 'Projection centrale recommandée' },
    { id: 'optimiste',  label: 'Optimiste',  note: 'Rendements élevés, inflation faible' },
  ]
  return (
    <div style={{
      position: 'absolute', top: 36, left: 0, zIndex: 50,
      background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
      borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-pop)',
      padding: 8, minWidth: 220, animation: 'pop .14s var(--ease)',
    }}>
      {opts.map(o => (
        <div
          key={o.id}
          className={`cmd-row${value === o.id ? ' on' : ''}`}
          onClick={() => { onChange(o.id); onClose() }}
          style={{ margin: '1px 0', height: 'auto', padding: '8px 10px' }}
        >
          <div>
            <div className="subhead" style={{ fontSize: 13 }}>{o.label}</div>
            <div className="caption">{o.note}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── AssetRow ─────────────────────────────────────────────────────────────────

function AssetRow({ a, hue, onOpen }: { a: Asset; hue: string; onOpen: () => void }) {
  const risk = a.expectedReturn > 8 ? 5 : a.expectedReturn > 6 ? 4 : a.expectedReturn > 4 ? 3 : a.expectedReturn > 2 ? 2 : 1
  return (
    <div className="lrow" onClick={onOpen} style={{ paddingLeft: 44, height: 42 }}>
      <span className="dot" style={{ width: 6, height: 6, background: hue }} />
      <div style={{ minWidth: 0, width: 240, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="subhead" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {a.name}
        </span>
      </div>
      <div className="grow row gap8" style={{ maxWidth: 220 }}>
        <div className="meter grow" style={{ maxWidth: 120 }}>
          <i style={{ width: a.allocation + '%', background: hue }} />
        </div>
        <span className="mono small" style={{ width: 40, textAlign: 'right' }}>{a.allocation} %</span>
      </div>
      <RiskDots n={risk} />
      <span className="mono small pos" style={{ width: 56, textAlign: 'right' }}>{a.expectedReturn.toFixed(1)} %</span>
    </div>
  )
}

// ── Group (envelope row) ──────────────────────────────────────────────────────

function Group({ env, open, toggle, selected, onOpenDetail, effort, capReachedYear }: {
  env: Envelope; open: boolean; toggle: () => void; selected: boolean
  onOpenDetail: (id: string) => void; effort: number; capReachedYear?: number
}) {
  const { updateEnvelope } = useStore()
  const isActive = env.active !== false
  const hue = ENVELOPE_HUE[env.type] ?? '#5e6ad2'
  const pct = effort > 0 ? Math.round((env.monthlyContribution / effort) * 100) : 0
  const avgReturn = env.assets.length > 0
    ? env.assets.reduce((s, a) => s + a.expectedReturn * a.allocation / 100, 0)
    : 0

  return (
    <div style={{
      border: `1px solid ${isActive ? 'var(--hairline)' : 'var(--hairline-soft)'}`,
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden', marginBottom: 10,
      background: isActive ? 'var(--canvas)' : 'var(--surface)',
      opacity: isActive ? 1 : 0.7,
    }}>
      {capReachedYear !== undefined && (
        <div style={{
          padding: '6px 12px',
          background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
          borderBottom: '1px solid color-mix(in srgb, var(--warning) 25%, transparent)',
          fontSize: 11, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>⚠️</span>
          <span>Plafond légal atteint en année {capReachedYear + 1} — versements automatiquement stoppés.</span>
        </div>
      )}
      <div
        className="group-head"
        style={selected ? { background: 'var(--surface-2)' } : undefined}
        onClick={toggle}
      >
        <IcChevron open={open} />
        {/* Active/inactive toggle dot */}
        <button
          onClick={e => { e.stopPropagation(); updateEnvelope(env.id, { active: !isActive }) }}
          title={isActive ? 'Désactiver de la simulation' : 'Activer dans la simulation'}
          style={{
            width: 9, height: 9, borderRadius: 3, flexShrink: 0,
            background: isActive ? hue : 'var(--hairline-strong)',
            border: 'none', cursor: 'pointer', padding: 0,
          }}
        />
        <span className="title" style={{ fontSize: 14.5 }}>{env.label}</span>
        <span className="badge">{TYPE_LABEL[env.type] ?? env.type.toUpperCase()}</span>
        {!isActive && (
          <span className="badge" style={{ color: 'var(--ink-tertiary)', background: 'transparent', border: '1px solid var(--hairline-strong)' }}>Inactif</span>
        )}
        <span className="caption" style={{ fontSize: 11.5 }}>
          {env.assets.length} actif{env.assets.length > 1 ? 's' : ''}
        </span>
        <div className="grow" />
        <span className="mono small muted" title="Capital actuel">
          {formatEur(env.initialCapital)}
        </span>
        <div className="row gap6" style={{ width: 150 }}>
          <div className="meter grow">
            <i style={{ width: pct + '%', background: hue }} />
          </div>
          <span className="mono small" style={{ width: 64, textAlign: 'right' }}>
            {formatEur(env.monthlyContribution)}/m
          </span>
        </div>
        <span className="mono small pos" style={{ width: 54, textAlign: 'right' }}>
          {avgReturn.toFixed(1)} %
        </span>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={e => { e.stopPropagation(); onOpenDetail(env.id) }}
          title="Paramètres"
          data-tour-id="envelope-settings-btn"
        >
          <IcSliders />
        </button>
      </div>
      {open && (
        <div className="fade-in" style={{ background: 'var(--canvas)' }}>
          {env.assets.map(a => (
            <AssetRow key={a.id} a={a} hue={hue} onOpen={() => onOpenDetail(env.id)} />
          ))}
          <div
            className="lrow"
            onClick={() => onOpenDetail(env.id)}
            style={{ paddingLeft: 44, height: 38, color: 'var(--ink-tertiary)', borderBottom: 'none' }}
          >
            <IcPlus size={13} />
            <span className="small">Ajouter un actif</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Section accordion header ──────────────────────────────────────────────────

function AccSection({ label, open, onToggle, children }: {
  label: string; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--hairline-soft)' }}>
      <div
        className="spread"
        style={{ padding: '10px 0', cursor: 'pointer' }}
        onClick={onToggle}
      >
        <span className="eyebrow">{label}</span>
        <IcChevron open={open} size={11} />
      </div>
      {open && <div style={{ paddingBottom: 14 }}>{children}</div>}
    </div>
  )
}

// ── DetailPanel ───────────────────────────────────────────────────────────────

function DetailPanel({ env, onClose, onOpenData, globalParams }: {
  env: Envelope; onClose: () => void; onOpenData: () => void; globalParams: GlobalParams
}) {
  const { updateEnvelope, removeEnvelope } = useStore()
  const hue = ENVELOPE_HUE[env.type] ?? '#5e6ad2'

  const [secVersement, setSecVersement] = useState(true)
  const [secActifs, setSecActifs]       = useState(false)
  const [secFiscal, setSecFiscal]       = useState(false)
  const [secBanque, setSecBanque]       = useState(false)
  const [secAvance, setSecAvance]       = useState(false)
  const [secProj, setSecProj]           = useState(false)

  const allocSum = env.assets.reduce((s, a) => s + a.allocation, 0)
  const allocOk = Math.abs(allocSum - 100) < 0.01

  // Local edits (committed on "Enregistrer")
  const [draft, setDraft] = useState({
    label: env.label,
    initialCapital: env.initialCapital,
    monthlyContribution: env.monthlyContribution,
    yearlyContribution: env.yearlyContribution ?? 0,
  })

  function commit() {
    updateEnvelope(env.id, {
      label: draft.label.trim() || env.label,
      initialCapital: draft.initialCapital,
      monthlyContribution: draft.monthlyContribution,
      yearlyContribution: draft.yearlyContribution,
    })
    onClose()
  }

  function handleRemove() {
    if (window.confirm(`Supprimer ${env.label} ?`)) {
      removeEnvelope(env.id)
      onClose()
    }
  }

  // Mini projection chart — force active:true so an inactive envelope still shows its projection
  const miniResults = useMemo(() => {
    if (env.assets.length === 0) return []
    return runSimulation([{ ...env, active: true }], globalParams)
  }, [env, globalParams])

  const chartData = miniResults.map(r => ({
    year: r.year,
    capital: Math.round(r.byEnvelope[env.id]?.capital ?? 0),
    real: Math.round(r.byEnvelope[env.id]?.realValue ?? 0),
  }))

  const lastR = miniResults.length > 0 ? miniResults[miniResults.length - 1].byEnvelope[env.id] : undefined

  return (
    <aside className="detail-panel">
      {/* Header */}
      <div className="spread" style={{ height: 52, padding: '0 16px', borderBottom: '1px solid var(--hairline)', flexShrink: 0 }}>
        <div className="row gap8">
          <span style={{ width: 9, height: 9, borderRadius: 3, background: hue, flexShrink: 0 }} />
          <input
            className="subhead"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}
            value={draft.label}
            onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
          />
          <span className="badge">{TYPE_LABEL[env.type] ?? env.type}</span>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><IcClose size={15} /></button>
      </div>

      {/* Scrollable body */}
      <div className="scroll" style={{ flex: 1, padding: '0 18px' }}>
        {/* ▼ Versement */}
        <AccSection label="Versement" open={secVersement} onToggle={() => setSecVersement(v => !v)}>
          <div className="col gap10">
            <div className="spread">
              <span className="small muted">Capital initial</span>
              <div style={{ width: 130 }}>
                <NumberInput value={draft.initialCapital} onChange={v => setDraft(d => ({ ...d, initialCapital: v }))} min={0} suffix="€" size="sm" />
              </div>
            </div>
            <div className="spread">
              <span className="small muted">Versement mensuel</span>
              <div style={{ width: 130 }}>
                <NumberInput value={draft.monthlyContribution} onChange={v => setDraft(d => ({ ...d, monthlyContribution: v }))} min={0} suffix="€" size="sm" />
              </div>
            </div>
            <div className="spread">
              <span className="small muted">Versement annuel</span>
              <div style={{ width: 130 }}>
                <NumberInput value={draft.yearlyContribution} onChange={v => setDraft(d => ({ ...d, yearlyContribution: v }))} min={0} suffix="€" size="sm" />
              </div>
            </div>
          </div>
        </AccSection>

        {/* ▶ Actifs */}
        <AccSection label="Allocation d'actifs" open={secActifs} onToggle={() => setSecActifs(v => !v)}>
          {env.assets.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div className="row" style={{ gap: 6, paddingBottom: 4, borderBottom: '1px solid var(--hairline-soft)', marginBottom: 6 }}>
                <span className="eyebrow grow" style={{ fontSize: 10 }}>Actif</span>
                <span className="eyebrow" style={{ fontSize: 10, width: 82, textAlign: 'right' }}>Rendement</span>
                <span className="eyebrow" style={{ fontSize: 10, width: 70, textAlign: 'right' }}>Alloc.</span>
                <div style={{ width: 24 }} />
              </div>
              {env.assets.map(a => (
                <div key={a.id} className="row" style={{ gap: 6, marginBottom: 5, alignItems: 'center' }}>
                  <input
                    className="input grow"
                    style={{ fontSize: 12, height: 28, padding: '0 8px', minWidth: 0 }}
                    value={a.name}
                    onChange={e => updateEnvelope(env.id, {
                      assets: env.assets.map(x => x.id === a.id ? { ...x, name: e.target.value } : x),
                    })}
                  />
                  <div style={{ width: 82 }}>
                    <NumberInput
                      value={a.expectedReturn} min={0} max={20} step={0.1} suffix="%" size="sm"
                      onChange={v => updateEnvelope(env.id, {
                        assets: env.assets.map(x => x.id === a.id ? { ...x, expectedReturn: v } : x),
                      })}
                    />
                  </div>
                  <div style={{ width: 70 }}>
                    <NumberInput
                      value={a.allocation} min={0} max={100} suffix="%" size="sm"
                      isWarning={!allocOk}
                      onChange={v => updateEnvelope(env.id, {
                        assets: env.assets.map(x => x.id === a.id ? { ...x, allocation: v } : x),
                      })}
                    />
                  </div>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: 'var(--danger)', flexShrink: 0, width: 24 }}
                    onClick={() => updateEnvelope(env.id, { assets: env.assets.filter(x => x.id !== a.id) })}
                    title="Supprimer cet actif"
                  >
                    <IcClose size={12} />
                  </button>
                </div>
              ))}
              <div className="row" style={{ marginBottom: 6 }}>
                <span className="caption grow">
                  Total :{' '}
                  <span className="mono" style={{ color: allocOk ? 'var(--success)' : 'var(--warning)', fontWeight: 500 }}>
                    {allocSum.toFixed(0)} %
                  </span>
                  {!allocOk && <span className="caption" style={{ marginLeft: 6 }}>— ajustez pour atteindre 100 %</span>}
                </span>
              </div>
            </div>
          )}
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => updateEnvelope(env.id, {
              assets: [...env.assets, { id: `asset_${Date.now()}`, name: 'Nouvel actif', expectedReturn: 5, allocation: 0 }],
            })}
          >
            <IcPlus size={14} /> Ajouter un actif
          </button>
        </AccSection>

        {/* ▶ Fiscalité */}
        <AccSection label="Fiscalité" open={secFiscal} onToggle={() => setSecFiscal(v => !v)}>
          <div className="panel" style={{ padding: 12 }}>
            <div className="spread">
              <span className="small muted">Imposition des gains</span>
              <span className="subhead mono">{env.taxRate === 0 ? 'Exonéré' : `${env.taxRate} %`}</span>
            </div>
            <div className="caption" style={{ marginTop: 4 }}>
              {env.type === 'livret_a' || env.type === 'ldds' || env.type === 'livret_jeune'
                ? 'Livret réglementé — exonéré IR et prélèvements sociaux'
                : env.type === 'pea'
                ? 'PEA : PS 17,2 % après 5 ans, flat tax 30 % avant'
                : env.type === 'cto'
                ? 'CTO : flat tax 30 % ou barème sur option'
                : env.type === 'assurance_vie'
                ? 'AV : taux réduit 24,7 % après 8 ans + abattement'
                : 'PER : sortie en capital taxée TMI + flat 30 % sur gains'}
            </div>
          </div>
        </AccSection>

        {/* ▶ Banque & frais */}
        <AccSection label="Banque & frais" open={secBanque} onToggle={() => setSecBanque(v => !v)}>
          <div className="spread" style={{ marginBottom: 8 }}>
            <div className="eyebrow" />
            <button className="btn btn-ghost btn-sm" onClick={onOpenData}>
              <IcImport /> Importer
            </button>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <div className="row gap8" style={{ marginBottom: 6 }}>
              <IcBank />
              <span className="subhead" style={{ fontSize: 13 }}>
                {env.fees && (env.fees.orderFees > 0 || env.fees.managementFees > 0)
                  ? 'Frais personnalisés'
                  : 'Aucun courtier sélectionné'}
              </span>
            </div>
            {env.fees && (
              <div className="caption mono">
                Courtage {env.fees.orderFees.toFixed(2)} % · Gestion {env.fees.managementFees.toFixed(2)} %
                {env.fees.custodyFees > 0 ? ` · Garde ${env.fees.custodyFees.toFixed(2)} %` : ''}
              </div>
            )}
          </div>
        </AccSection>

        {/* ▶ Options avancées */}
        <AccSection label="Options avancées" open={secAvance} onToggle={() => setSecAvance(v => !v)}>
          <div className="col gap10">
            <div className="spread">
              <span className="small muted">Incluse dans la simulation</span>
              <button
                className={`btn btn-sm ${env.active !== false ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => updateEnvelope(env.id, { active: env.active === false })}
              >
                {env.active !== false ? 'Active' : 'Inactive'}
              </button>
            </div>
            <div className="spread">
              <span className="small muted">Date ouverture</span>
              <input
                type="date"
                className="input mono"
                style={{ width: 140, height: 28, fontSize: 12, padding: '0 8px' }}
                value={env.openedAt ?? ''}
                onChange={e => updateEnvelope(env.id, { openedAt: e.target.value || null })}
              />
            </div>
            <div className="spread">
              <span className="small muted">Horizon clôture</span>
              <div style={{ width: 130 }}>
                <NumberInput
                  value={env.closureHorizon ?? 0}
                  onChange={v => updateEnvelope(env.id, { closureHorizon: v || null })}
                  min={0} max={50} suffix="ans" size="sm"
                />
              </div>
            </div>
            <div className="spread">
              <span className="small muted">Fréquence versements</span>
              <div className="seg">
                {(['monthly', 'quarterly', 'annual'] as const).map((f, i) => (
                  <button
                    key={f}
                    className={(env.contributionFrequency ?? 'monthly') === f ? 'on' : ''}
                    onClick={() => updateEnvelope(env.id, { contributionFrequency: f })}
                  >
                    {['Mois', 'Trim.', 'An'][i]}
                  </button>
                ))}
              </div>
            </div>
            {env.type === 'cto' && (
              <div className="spread">
                <span className="small muted">Réinvestir dividendes</span>
                <button
                  className={`btn btn-sm ${env.reinvestDividends !== false ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => updateEnvelope(env.id, { reinvestDividends: env.reinvestDividends === false })}
                >
                  {env.reinvestDividends !== false ? 'Oui' : 'Non'}
                </button>
              </div>
            )}
          </div>
        </AccSection>

        {/* ▶ Projection individuelle */}
        <AccSection label="Projection individuelle" open={secProj} onToggle={() => setSecProj(v => !v)}>
          {chartData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="var(--hairline-soft)" strokeDasharray="1 0" />
                  <XAxis dataKey="year" tick={{ fill: 'var(--ink-tertiary)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-3)', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--r-md)', fontSize: 12 }}
                    formatter={(v: unknown) => formatEur(v as number)}
                    labelFormatter={(l: unknown) => `An ${l}`}
                  />
                  <Line type="monotone" dataKey="capital" stroke={hue} strokeWidth={2} dot={false} name="Capital" />
                  <Line type="monotone" dataKey="real" stroke={hue} strokeWidth={1.5} strokeDasharray="4 3" dot={false} strokeOpacity={0.6} name="Réel" />
                </LineChart>
              </ResponsiveContainer>
              {lastR && (
                <div className="row gap16" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                  <div><div className="eyebrow">Capital final</div><div className="mono subhead">{formatEur(lastR.capital)}</div></div>
                  <div><div className="eyebrow">Gains nets</div><div className="mono subhead pos">{formatEur(lastR.totalGains)}</div></div>
                  <div><div className="eyebrow">Impôts</div><div className="mono subhead neg">−{formatEur(lastR.tax)}</div></div>
                </div>
              )}
            </>
          ) : (
            <div className="caption" style={{ textAlign: 'center', padding: '16px 0' }}>
              Ajoutez des actifs pour voir la projection
            </div>
          )}
        </AccSection>
      </div>

      {/* Footer */}
      <div className="row gap8" style={{ padding: 14, borderTop: '1px solid var(--hairline)', flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm neg" style={{ color: 'var(--danger)' }} onClick={handleRemove}>
          Supprimer
        </button>
        <div className="grow" />
        <button className="btn btn-secondary btn-sm" onClick={onClose}>Fermer</button>
        <button className="btn btn-primary btn-sm" onClick={commit}>Enregistrer</button>
      </div>
    </aside>
  )
}

// ── EnvelopesPage ─────────────────────────────────────────────────────────────

interface Props {
  isDirty: boolean
  isRunning: boolean
  onRunSimulation: () => void
  onImportFees: (envelopeId: string) => void
  onAddEnvelope: () => void
  capReachedByEnvelope?: Record<string, number>
  onOpenCapModal?: () => void
}

export default function EnvelopesPage({
  isDirty, isRunning, onRunSimulation, onImportFees, onAddEnvelope,
  capReachedByEnvelope, onOpenCapModal,
}: Props) {
  const store = useStore()
  const activeSim = useStore(selectActiveSim)
  const { envelopes, globalParams } = activeSim
  const { updateGlobalParams } = store

  const effort = getEffortTotal(activeSim)
  const contributionSum = envelopes.reduce((s, e) => s + e.monthlyContribution, 0)

  // Open/collapsed groups
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(envelopes.slice(0, 2).map(e => e.id)))
  const toggle = (id: string) => setOpenIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  // Selected envelope → opens DetailPanel
  const [selId, setSelId] = useState<string | null>(null)
  const sel = envelopes.find(e => e.id === selId)

  // Active popover chip
  const [activePopover, setActivePopover] = useState<string | null>(null)

  const scenarioValue = (globalParams as any).scenario ?? 'realiste'

  return (
    <div style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden', height: '100%' }}>
      <div className="content">

        {/* ── SubheadBar ─────────────────────────────────────────────── */}
        <div className="subhead-bar" data-tour-id="envelopes-subheadbar">
          <h1 className="title" style={{ fontSize: 15 }}>Enveloppes</h1>
          <span className="badge">{envelopes.length}</span>
          <div className="grow" />
          <HelpButton page="simulation" />
          <button
            className="btn btn-primary btn-sm"
            onClick={onRunSimulation}
            disabled={isRunning}
            style={!isDirty && !isRunning ? { opacity: 0.6, cursor: 'default' } : undefined}
            data-tour-id="run-simulation-btn"
            title="Calcule la projection et met à jour le tableau de bord (vous y serez redirigé)"
          >
            {isRunning
              ? <><IcRefresh className="spin" /> Calcul…</>
              : isDirty
                ? <><IcPlay /> Lancer la simulation</>
                : <><IcRefresh /> À jour</>}
          </button>
        </div>

        {/* ── Banner plafonds légaux ─────────────────────────────────── */}
        {capReachedByEnvelope && Object.keys(capReachedByEnvelope).length > 0 && (
          <div style={{
            margin: '0', padding: '10px 20px',
            background: 'color-mix(in srgb, var(--warning) 10%, transparent)',
            borderBottom: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)',
            display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span className="small" style={{ flex: 1, color: 'var(--warning)' }}>
              Plafonds légaux atteints :{' '}
              {Object.entries(capReachedByEnvelope)
                .map(([id, yr]) => {
                  const env = envelopes.find(e => e.id === id)
                  return env ? `${env.label} (an ${yr + 1})` : id
                })
                .join(', ')}
            </span>
            {onOpenCapModal && (
              <button
                className="btn btn-sm"
                style={{ background: 'var(--warning)', color: '#000', flexShrink: 0 }}
                onClick={onOpenCapModal}
              >
                Gérer les débordements
              </button>
            )}
          </div>
        )}

        {/* ── FilterChips (global params) ────────────────────────────── */}
        <div
          className="row"
          data-tour-id="filter-chips-bar"
          style={{ height: 44, padding: '0 20px', borderBottom: '1px solid var(--hairline)', background: 'var(--canvas)', flexShrink: 0, position: 'relative', gap: 0 }}
          onClick={e => {
            if (!(e.target as HTMLElement).closest('[data-popover]')) setActivePopover(null)
          }}
        >
          {/* Horizon */}
          <div style={{ position: 'relative' }} data-popover>
            <button className="param-chip" onClick={() => setActivePopover(activePopover === 'horizon' ? null : 'horizon')}>
              <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>Horizon</span>
              <span className="subhead mono" style={{ fontSize: 13 }}>{globalParams.duration} ans</span>
            </button>
            {activePopover === 'horizon' && (
              <ParamPopover label="Horizon de simulation" value={globalParams.duration}
                onChange={v => { updateGlobalParams({ duration: v }); setActivePopover(null) }}
                min={1} max={50} suffix="ans" onClose={() => setActivePopover(null)} />
            )}
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--hairline)', margin: '0 4px', flexShrink: 0 }} />

          {/* Scénario */}
          <div style={{ position: 'relative' }} data-popover>
            <button className="param-chip" onClick={() => setActivePopover(activePopover === 'scenario' ? null : 'scenario')}>
              <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>Scénario</span>
              <span className="subhead mono" style={{ fontSize: 13 }}>
                {scenarioValue === 'pessimiste' ? 'Pessimiste' : scenarioValue === 'optimiste' ? 'Optimiste' : 'Réaliste'}
              </span>
            </button>
            {activePopover === 'scenario' && (
              <ScenarioPopover
                value={scenarioValue}
                onChange={v => updateGlobalParams({ scenario: v } as any)}
                onClose={() => setActivePopover(null)}
              />
            )}
          </div>

          <div style={{ width: 1, height: 14, background: 'var(--hairline)', margin: '0 4px', flexShrink: 0 }} />

          {/* Simulation mode */}
          <button
            className="param-chip"
            onClick={() => updateGlobalParams({ simulationMode: (globalParams.simulationMode ?? 'standard') === 'standard' ? 'advanced' : 'standard' })}
          >
            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>Simulation</span>
            <span className="subhead mono" style={{ fontSize: 13 }}>
              {(globalParams.simulationMode ?? 'standard') === 'advanced' ? 'Monte-Carlo' : 'Standard'}
            </span>
          </button>

          <div className="grow" />

          {/* Indicateur cumulé — chiffre clé de la page */}
          <div className="row" style={{ gap: 8, padding: '0 4px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 600, letterSpacing: '-0.3px' }}>
              {formatEur(contributionSum)}<span style={{ fontSize: 11.5, fontWeight: 400, color: 'var(--ink-subtle)' }}>/mois</span>
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-tertiary)' }}>
              versements
            </span>
          </div>
        </div>

        {/* ── Envelope list ──────────────────────────────────────────── */}
        <div className="scroll" style={{ flex: 1, padding: '16px 20px 40px' }} data-tour-id="envelopes-list-area">

          {/* Column headers */}
          <div className="row" style={{ padding: '0 14px 8px', gap: 12 }}>
            <span className="eyebrow grow">
              {envelopes.length} enveloppe{envelopes.length > 1 ? 's' : ''} · {envelopes.reduce((s, e) => s + e.assets.length, 0)} actifs
            </span>
            <span className="eyebrow" style={{ width: 150, textAlign: 'right' }}>Versement</span>
            <span className="eyebrow" style={{ width: 54, textAlign: 'right' }}>Rdt.</span>
            <div style={{ width: 28 }} />
          </div>

          {/* Groups */}
          {envelopes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-subtle)', fontSize: 13 }}>
              Aucune enveloppe — ajoutez-en une ci-dessous
            </div>
          ) : (
            envelopes.map(env => (
              <Group
                key={env.id}
                env={env}
                open={openIds.has(env.id)}
                toggle={() => toggle(env.id)}
                selected={selId === env.id}
                onOpenDetail={id => setSelId(s => s === id ? null : id)}
                effort={effort}
                capReachedYear={capReachedByEnvelope?.[env.id]}
              />
            ))
          )}

          {/* Add envelope button */}
          <button
            className="lrow"
            onClick={onAddEnvelope}
            data-tour-id="add-envelope-btn"
            style={{
              width: '100%', border: '1px dashed var(--hairline-strong)',
              borderRadius: 'var(--r-lg)', background: 'transparent',
              color: 'var(--ink-subtle)', height: 44, marginTop: 4, justifyContent: 'center',
            }}
          >
            <IcPlus size={15} />
            <span className="subhead">Ajouter une enveloppe</span>
          </button>

          {/* ── Événements de vie ─────────────────────────────────────── */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--hairline)' }} data-tour-id="life-events-section">
            <LifeEvents />
          </div>

        </div>
      </div>

      {/* ── Detail Panel ───────────────────────────────────────────────── */}
      {sel && (
        <DetailPanel
          key={sel.id}
          env={sel}
          onClose={() => setSelId(null)}
          onOpenData={() => onImportFees(sel.id)}
          globalParams={globalParams}
        />
      )}
    </div>
  )
}

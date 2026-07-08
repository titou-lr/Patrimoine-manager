import { Fragment, useState, useEffect, useRef } from 'react'
import KatexFormula from '../ui/KatexFormula'
import InteractiveExample from '../ui/InteractiveExample'
import { formatEur } from '../../utils/format'
import HelpButton from '../../help/components/HelpButton'

// ── Interactive calculators (migrated from ModelsPage) ──────────────────────

function compoundInterest(values: Record<string, number>) {
  const { s0, v, r, t } = values
  const rm = r / 100 / 12
  const periods = Math.round(t * 12)
  let S: number
  if (rm === 0 || periods === 0) {
    S = s0 + v * periods
  } else {
    const factor = Math.pow(1 + rm, periods)
    S = s0 * factor + v * (factor - 1) / rm
  }
  const totalContrib = s0 + v * periods
  const gains = Math.max(0, S - totalContrib)
  return [
    { label: 'Capital final S(t)', value: formatEur(S), highlight: true },
    { label: 'Versements cumulés', value: formatEur(totalContrib) },
    { label: 'Gains', value: formatEur(gains) },
  ]
}

function fisherCalc(values: Record<string, number>) {
  const { rn, inflation } = values
  const rFisher = (1 + rn / 100) / (1 + inflation / 100) - 1
  const rApprox = rn / 100 - inflation / 100
  const ecart = Math.abs((rApprox - rFisher) * 100)
  return [
    { label: 'Rendement réel (Fisher)', value: `${(rFisher * 100).toFixed(2)} %`, highlight: true },
    { label: 'Approximation (r − i)', value: `${(rApprox * 100).toFixed(2)} %` },
    { label: 'Écart de précision', value: `+${ecart.toFixed(3)} pts` },
  ]
}

function pvCalc(values: Record<string, number>) {
  const { fv, i, t } = values
  const pv = fv / Math.pow(1 + i / 100, t)
  const erosion = fv - pv
  return [
    { label: 'Valeur actuelle PV', value: formatEur(pv), highlight: true },
    { label: 'Érosion inflation', value: formatEur(erosion) },
  ]
}

function retirementCalc(values: Record<string, number>) {
  const { expenses, pension, rate } = values
  const annual = Math.max(0, expenses - pension) * 12
  const needed = rate > 0 ? annual / (rate / 100) : 0
  const monthly = needed > 0 ? needed * (rate / 100) / 12 : 0
  return [
    { label: 'Capital nécessaire', value: formatEur(needed), highlight: true },
    { label: 'Retrait mensuel soutenable', value: formatEur(monthly) },
  ]
}

function mortgageCalc(values: Record<string, number>) {
  const { K, t, n } = values
  const rm = t / 100 / 12
  let M: number
  if (rm === 0 || n === 0) { M = n > 0 ? K / n : 0 }
  else { M = K * rm / (1 - Math.pow(1 + rm, -n)) }
  const total = M * n
  const cost = total - K
  return [
    { label: 'Mensualité', value: formatEur(M), highlight: true },
    { label: 'Coût total crédit', value: formatEur(Math.max(0, cost)) },
    { label: 'Total remboursé', value: formatEur(total) },
  ]
}

function loanRemainingCalc(values: Record<string, number>) {
  const { P, r, n, k } = values
  const rm = r / 100 / 12
  if (k >= n) return [{ label: 'Capital restant', value: formatEur(0), highlight: true }]
  let remaining: number
  if (rm === 0) {
    remaining = P * (1 - k / n)
  } else {
    const pow_n = Math.pow(1 + rm, n)
    const pow_k = Math.pow(1 + rm, k)
    remaining = P * (pow_n - pow_k) / (pow_n - 1)
  }
  const interestLeft = Math.max(0, (n - k) * (P * rm / (1 - Math.pow(1 + rm, -n))) - remaining)
  return [
    { label: 'Capital restant R(k)', value: formatEur(remaining), highlight: true },
    { label: 'Intérêts restants', value: formatEur(interestLeft) },
  ]
}

function weightedReturnCalc(values: Record<string, number>) {
  const { r1, w1, r2, w2, r3, w3 } = values
  const total = w1 + w2 + w3
  if (total === 0) return [{ label: 'Rendement pondéré', value: '— %', highlight: true }]
  const r = (r1 * w1 / 100 + r2 * w2 / 100 + r3 * w3 / 100) / total * 100
  return [{ label: 'Rendement pondéré r̄', value: `${r.toFixed(2)} %`, highlight: true }]
}

function avTaxCalc(values: Record<string, number>) {
  const { gains, contrib, yearsHeld, tmi, isCouple } = values
  const g = Math.max(0, gains)
  const abatt = isCouple ? 9200 : 4600
  if (yearsHeld < 8) {
    return [
      { label: 'Régime', value: '< 8 ans', highlight: false },
      { label: 'Impôt', value: formatEur(g * 0.30), highlight: true },
    ]
  }
  const threshold = 150000
  if (contrib <= threshold) {
    const taxable = Math.max(0, g - abatt)
    return [
      { label: 'Régime', value: '≥ 8 ans — taux réduit', highlight: false },
      { label: 'Abattement appliqué', value: formatEur(Math.min(g, abatt)) },
      { label: 'Impôt (24.7%)', value: formatEur(taxable * 0.247), highlight: true },
    ]
  }
  const ratio = threshold / contrib
  const gBelow = g * ratio
  const gAbove = g * (1 - ratio)
  const tax = Math.max(0, gBelow - abatt) * 0.247 + gAbove * 0.30
  return [
    { label: 'Régime', value: '≥ 8 ans — split (> 150 k€)', highlight: false },
    { label: 'Gains part ≤ 150 k€ (24.7%)', value: formatEur(Math.max(0, gBelow - abatt) * 0.247) },
    { label: 'Gains part > 150 k€ (30%)', value: formatEur(gAbove * 0.30) },
    { label: 'Impôt total', value: formatEur(tax), highlight: true },
  ]
  void tmi
}

function sharpeCalc(values: Record<string, number>) {
  const { mu, sigma } = values
  const sharpe = sigma > 0 ? (mu / 100) / (sigma / 100) * Math.sqrt(252) : 0
  return [{ label: 'Sharpe annualisé', value: sharpe.toFixed(3), highlight: true }]
}

// ── Layout helpers ──────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 's1', label: 'Simulation & Épargne' },
  { id: 's2', label: 'Fiscalité française' },
  { id: 's3', label: 'Retraite & Revenus passifs' },
  { id: 's4', label: 'Crédit & Bilan net' },
  { id: 's5', label: 'Indicateurs techniques' },
  { id: 's6', label: 'Monte-Carlo & Markov' },
  { id: 's7', label: 'Black-Litterman & CVaR' },
  { id: 's8', label: 'Métriques de backtest' },
] as const

type SectionId = typeof SECTIONS[number]['id']

// ── Section wrapper ─────────────────────────────────────────────────────────

function Sec({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      id={id}
      style={{ paddingTop: 40, paddingBottom: 48, borderBottom: '1px solid var(--hairline)' }}
    >
      <h2 style={{
        margin: '0 0 24px',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink-tertiary)',
          background: 'var(--surface-2)',
          border: '1px solid var(--hairline)',
          borderRadius: 4,
          padding: '1px 6px',
        }}>{id.replace('s', '').padStart(2, '0')}</span>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {children}
      </div>
    </section>
  )
}

function FormulaGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-tertiary)' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function FormulaCard({
  name, source, formula, vars, example, note,
}: {
  name: string
  source?: string
  formula: string
  vars?: { sym: string; def: string }[]
  example?: string
  note?: string
}) {
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--hairline-soft)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{name}</span>
        {source && (
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', background: 'var(--surface-3)', padding: '1px 8px', borderRadius: 4 }}>
            {source}
          </span>
        )}
      </div>
      {/* Formula */}
      <div style={{ padding: '14px 16px' }}>
        <KatexFormula block>{formula}</KatexFormula>

        {vars && vars.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {vars.map(v => (
              <div key={v.sym} style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary-hover)', minWidth: 120, textAlign: 'right', flexShrink: 0 }}>
                  {v.sym}
                </span>
                <span style={{ color: 'var(--hairline-strong)', flexShrink: 0 }}>—</span>
                <span style={{ color: 'var(--ink-subtle)' }}>{v.def}</span>
              </div>
            ))}
          </div>
        )}

        {example && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--surface-3)', borderRadius: 'var(--r-sm)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {example}
          </div>
        )}

        {note && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--ink-tertiary)', fontStyle: 'italic' }}>{note}</p>
        )}
      </div>
    </div>
  )
}

function ConstantTable({ rows }: { rows: { name: string; value: string; meaning: string }[] }) {
  return (
    <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--hairline)' }}>
            <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 500, color: 'var(--ink-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Constante</th>
            <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 500, color: 'var(--ink-tertiary)', fontSize: 11 }}>Valeur</th>
            <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 500, color: 'var(--ink-tertiary)', fontSize: 11 }}>Signification</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--hairline-soft)' : 'none' }}>
              <td style={{ padding: '7px 14px', fontFamily: 'var(--font-mono)', color: 'var(--primary-hover)', fontSize: 11 }}>{r.name}</td>
              <td style={{ padding: '7px 14px', fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>{r.value}</td>
              <td style={{ padding: '7px 14px', color: 'var(--ink-subtle)' }}>{r.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TransitionMatrix() {
  const labels = ['Exp.', 'Surcha.', 'Récess.', 'Crise']
  const matrix = [
    [0.65, 0.20, 0.10, 0.05],
    [0.30, 0.40, 0.20, 0.10],
    [0.40, 0.10, 0.40, 0.10],
    [0.50, 0.05, 0.30, 0.15],
  ]
  const colors = ['var(--c-expansion)', 'var(--c-overheat)', 'var(--c-recession)', 'var(--c-crisis)']

  return (
    <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', fontFamily: 'var(--font-mono)' }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--hairline)' }}>
            <th style={{ padding: '7px 14px', textAlign: 'left', fontWeight: 400, color: 'var(--ink-tertiary)', fontSize: 11 }}>
              De \ Vers →
            </th>
            {labels.map((l, j) => (
              <th key={j} style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 500, color: colors[j], fontSize: 11 }}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < matrix.length - 1 ? '1px solid var(--hairline-soft)' : 'none' }}>
              <td style={{ padding: '7px 14px', fontWeight: 500, color: colors[i] }}>{labels[i]}</td>
              {row.map((v, j) => (
                <td key={j} style={{
                  padding: '7px 12px',
                  textAlign: 'center',
                  color: i === j ? 'var(--ink)' : 'var(--ink-subtle)',
                  fontWeight: i === j ? 600 : 400,
                }}>
                  {(v * 100).toFixed(0)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: '6px 14px 8px', fontSize: 11, color: 'var(--ink-tertiary)', background: 'var(--surface-2)', borderTop: '1px solid var(--hairline-soft)' }}>
        Chaque ligne somme à 100 % — probabilité de transition d'un régime à l'autre à chaque pas annuel.
        Source: {' '}<span style={{ fontFamily: 'var(--font-mono)' }}>src/data/regimeData.ts: TRANSITION_MATRIX</span>
      </div>
    </div>
  )
}

function RegimeParamsTable() {
  const data = [
    { ac: 'equity',       hist: '8.5%', exp: { mu: '10%', s: '12%' }, over: { mu: '14%', s: '16%' }, rec: { mu: '-8%', s: '20%' }, cris: { mu: '-25%', s: '35%' } },
    { ac: 'bonds',        hist: '4.0%', exp: { mu: '4%',  s: '5%'  }, over: { mu: '1%',  s: '7%'  }, rec: { mu: '8%',  s: '6%'  }, cris: { mu: '5%',   s: '10%' } },
    { ac: 'real_estate',  hist: '5.0%', exp: { mu: '5%',  s: '8%'  }, over: { mu: '6%',  s: '10%' }, rec: { mu: '-3%', s: '12%' }, cris: { mu: '-15%', s: '20%' } },
    { ac: 'money_market', hist: '2.0%', exp: { mu: '2%',  s: '1%'  }, over: { mu: '4%',  s: '2%'  }, rec: { mu: '1%',  s: '1%'  }, cris: { mu: '0%',   s: '1%'  } },
    { ac: 'crypto',       hist: '30%',  exp: { mu: '40%', s: '60%' }, over: { mu: '50%', s: '70%' }, rec: { mu: '-40%',s: '80%' }, cris: { mu: '-70%', s: '90%' } },
  ]
  return (
    <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', overflow: 'auto' }}>
      <table style={{ fontSize: 11, borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', minWidth: 540 }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--hairline)' }}>
            <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--ink-tertiary)' }}>Classe</th>
            <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 500, color: 'var(--ink-tertiary)' }}>r̄ hist.</th>
            {['Expansion', 'Surchauffe', 'Récession', 'Crise'].map((l, i) => (
              <th key={i} colSpan={2} style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 500, color: ['var(--c-expansion)', 'var(--c-overheat)', 'var(--c-recession)', 'var(--c-crisis)'][i], borderLeft: '1px solid var(--hairline-soft)' }}>
                {l}
              </th>
            ))}
          </tr>
          <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--hairline)' }}>
            <th style={{ padding: '4px 12px' }} />
            <th style={{ padding: '4px 12px' }} />
            {[0,1,2,3].map(i => (
              <Fragment key={i}>
                <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 400, color: 'var(--ink-tertiary)', borderLeft: '1px solid var(--hairline-soft)', fontSize: 10 }}>μ</th>
                <th style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 400, color: 'var(--ink-tertiary)', fontSize: 10 }}>σ</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < data.length - 1 ? '1px solid var(--hairline-soft)' : 'none' }}>
              <td style={{ padding: '6px 12px', color: 'var(--ink-muted)' }}>{row.ac}</td>
              <td style={{ padding: '6px 12px', textAlign: 'center', color: 'var(--ink-subtle)' }}>{row.hist}</td>
              {[row.exp, row.over, row.rec, row.cris].map((r, j) => (
                <Fragment key={j}>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--ink)', borderLeft: '1px solid var(--hairline-soft)' }}>{r.mu}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--ink-subtle)' }}>{r.s}</td>
                </Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ModelsReferencePage() {
  const [activeSection, setActiveSection] = useState<SectionId>('s1')
  const contentRef = useRef<HTMLDivElement>(null)

  // Sync active section with scroll position
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    function onScroll() {
      const containerRect = el!.getBoundingClientRect()
      const threshold = containerRect.top + containerRect.height * 0.35

      let best: SectionId = SECTIONS[0].id
      for (const s of SECTIONS) {
        const node = document.getElementById(s.id)
        if (node && node.getBoundingClientRect().top <= threshold) {
          best = s.id as SectionId
        }
      }
      setActiveSection(best)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  function scrollTo(id: SectionId) {
    const node = document.getElementById(id)
    if (node && contentRef.current) {
      contentRef.current.scrollTo({ top: node.offsetTop - 16, behavior: 'smooth' })
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Page header */}
      <div
        data-tour-id="models-page-header"
        style={{
          flexShrink: 0,
          borderBottom: '1px solid var(--hairline)',
          background: 'var(--surface-1)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <SigmaIcon />
        <div>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
            Modèles &amp; Formules
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-tertiary)', marginTop: 1 }}>
            Référence mathématique exhaustive — toutes les formules du code de l'app
          </p>
        </div>
        <div style={{ flex: 1 }} />
        <HelpButton page="models" />
      </div>

      {/* Body: left nav + scrollable content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left nav */}
        <nav data-tour-id="models-left-nav" style={{
          width: 192,
          flexShrink: 0,
          borderRight: '1px solid var(--hairline)',
          overflowY: 'auto',
          padding: '16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          background: 'var(--surface-1)',
        }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                background: activeSection === s.id ? 'var(--primary-tint)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                padding: '6px 10px',
                textAlign: 'left',
                fontSize: 12,
                color: activeSection === s.id ? 'var(--primary-hover)' : 'var(--ink-tertiary)',
                cursor: 'pointer',
                fontWeight: activeSection === s.id ? 500 : 400,
                transition: 'all 0.12s',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                opacity: 0.6,
                minWidth: 18,
              }}>
                {s.id.replace('s', '')}
              </span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Scrollable content */}
        <div ref={contentRef} data-tour-id="models-content-area" style={{ flex: 1, overflowY: 'auto', padding: '0 32px 64px' }}>

          {/* ── Section 1: Simulation & Épargne ────────────────────────────── */}
          <Sec id="s1" title="Simulation & Épargne">

            <FormulaGroup title="Intérêts composés">
              <FormulaCard
                name="Itération mensuelle (utilisée dans l'app)"
                source="simulation.ts:178"
                formula="S_{n+1} = (S_n + v) \times \left(1 + \dfrac{r}{12}\right)"
                vars={[
                  { sym: 'S_n', def: 'solde à la fin du mois n' },
                  { sym: 'v', def: 'versement mensuel net de frais (peut varier mois par mois)' },
                  { sym: 'r', def: 'taux de rendement annuel nominal pondéré du portefeuille' },
                ]}
                note="L'app itère cette formule mois par mois pour intégrer la fiscalité annuelle, les frais variables et les événements de vie. L'itération exacte prime sur la forme analytique."
              />
              <FormulaCard
                name="Forme analytique — versements constants (référence)"
                source="ModelsPage"
                formula="S(t) = S_0 \cdot \left(1+\frac{r}{12}\right)^{12t} + v \cdot \frac{\left(1+\frac{r}{12}\right)^{12t} - 1}{r/12}"
                vars={[
                  { sym: 'S_0', def: 'capital initial' },
                  { sym: 't', def: 'durée en années' },
                ]}
                example={"S₀ = 10 000 €, v = 300 €/mois, r = 7 %, t = 20 ans\nS = 10 000 × 3.870 + 300 × 604.8 = 38 700 + 181 444 = 220 144 €"}
              />
              <InteractiveExample
                title="Calculer un capital final"
                inputs={[
                  { id: 's0', label: 'Capital initial S₀', value: 10000, min: 0, suffix: '€' },
                  { id: 'v', label: 'Versement mensuel v', value: 300, min: 0, suffix: '€' },
                  { id: 'r', label: 'Taux annuel r', value: 7, min: 0, max: 30, step: 0.1, suffix: '%' },
                  { id: 't', label: 'Durée t', value: 20, min: 1, max: 50, suffix: 'ans' },
                ]}
                compute={compoundInterest}
              />
            </FormulaGroup>

            <FormulaGroup title="Rendement pondéré du portefeuille">
              <FormulaCard
                name="Moyenne pondérée des rendements d'actifs"
                source="simulation.ts:58-63"
                formula="\bar{r} = \sum_{i} \frac{r_i}{100} \times \frac{w_i}{100}"
                vars={[
                  { sym: 'r_i', def: "rendement attendu de l'actif i (en %)" },
                  { sym: 'w_i', def: "allocation de l'actif i (en %, somme = 100)" },
                ]}
                example={"ETF MSCI World 70% @ 7% + ETF Europe 30% @ 6%\nr̄ = 0.07×0.70 + 0.06×0.30 = 0.049 + 0.018 = 6.7 %/an"}
              />
              <InteractiveExample
                title="Calculer un rendement pondéré (3 actifs)"
                inputs={[
                  { id: 'r1', label: 'Actif 1 — rendement', value: 7, min: 0, max: 30, step: 0.1, suffix: '%' },
                  { id: 'w1', label: 'Actif 1 — allocation', value: 70, min: 0, max: 100, suffix: '%' },
                  { id: 'r2', label: 'Actif 2 — rendement', value: 4, min: 0, max: 30, step: 0.1, suffix: '%' },
                  { id: 'w2', label: 'Actif 2 — allocation', value: 20, min: 0, max: 100, suffix: '%' },
                  { id: 'r3', label: 'Actif 3 — rendement', value: 2, min: 0, max: 30, step: 0.1, suffix: '%' },
                  { id: 'w3', label: 'Actif 3 — allocation', value: 10, min: 0, max: 100, suffix: '%' },
                ]}
                compute={weightedReturnCalc}
              />
            </FormulaGroup>

            <FormulaGroup title="Inflation — formule de Fisher">
              <FormulaCard
                name="Rendement réel exact (Fisher)"
                source="inflation.ts:23-25"
                formula="r_{\text{réel}} = \frac{1 + r_{\text{nominal}}}{1 + i} - 1"
                vars={[
                  { sym: 'r_{\\text{nominal}}', def: 'taux de rendement nominal annuel (décimal)' },
                  { sym: 'i', def: 'taux d\'inflation annuel (décimal)' },
                ]}
                example={"r = 8%, i = 2.5%\nFisher : (1.08 / 1.025) − 1 = 5.366 %\nApprox  : 8% − 2.5%        = 5.500 %\nÉcart   :                   +0.134 pts"}
              />
              <FormulaCard
                name="Valeur actuelle — déflation d'un montant futur"
                source="inflation.ts:35-42"
                formula="PV = \frac{FV}{(1 + i)^t}"
                vars={[
                  { sym: 'FV', def: 'montant futur en euros courants' },
                  { sym: 'i', def: 'taux d\'inflation (décimal)' },
                  { sym: 't', def: 'durée en années (peut être fractionnaire)' },
                ]}
                example={"FV = 100 000 €, i = 2.5%, t = 20 ans\nPV = 100 000 / (1.025)^20 = 61 027 €"}
              />
              <ConstantTable rows={[
                { name: 'INFLATION_SCENARIOS.low', value: '1.5 %', meaning: 'Scénario inflation basse' },
                { name: 'INFLATION_SCENARIOS.medium', value: '2.5 %', meaning: 'Référence BCE' },
                { name: 'INFLATION_SCENARIOS.high', value: '4.0 %', meaning: 'Scénario inflation haute' },
              ]} />
              <InteractiveExample
                title="Rendement réel (Fisher)"
                inputs={[
                  { id: 'rn', label: 'Rendement nominal r', value: 8, min: 0, max: 30, step: 0.1, suffix: '%' },
                  { id: 'inflation', label: 'Inflation i', value: 2.5, min: 0, max: 15, step: 0.1, suffix: '%' },
                ]}
                compute={fisherCalc}
              />
              <InteractiveExample
                title="Valeur actuelle d'un montant futur"
                inputs={[
                  { id: 'fv', label: 'Montant futur FV', value: 100000, min: 0, suffix: '€' },
                  { id: 'i', label: 'Inflation i', value: 2.5, min: 0, max: 15, step: 0.1, suffix: '%' },
                  { id: 't', label: 'Durée t', value: 20, min: 1, max: 50, suffix: 'ans' },
                ]}
                compute={pvCalc}
              />
            </FormulaGroup>

          </Sec>

          {/* ── Section 2: Fiscalité française ────────────────────────────── */}
          <Sec id="s2" title="Fiscalité française">

            <ConstantTable rows={[
              { name: 'PS_RATE', value: '0.172 (17.2%)', meaning: 'Prélèvements sociaux — source unique : taxation.ts' },
              { name: 'FLAT_TAX_RATE', value: '0.30 (30%)', meaning: 'PFU : 12.8% IR + 17.2% PS' },
              { name: 'AV_REDUCED_RATE', value: '0.247 (24.7%)', meaning: 'AV ≥ 8 ans : 7.5% IR + 17.2% PS' },
              { name: 'AV_THRESHOLD', value: '150 000 €', meaning: 'Seuil de versements AV pour la règle de split' },
            ]} />

            <FormulaGroup title="PEA (Plan Épargne en Actions)">
              <FormulaCard
                name="Taxation à la sortie"
                source="taxation.ts:34-40"
                formula={`T = \\begin{cases} G \\times 30\\% & \\text{si durée} < 5\\text{ ans} \\\\ G \\times 17.2\\% & \\text{si durée} \\geq 5\\text{ ans} \\end{cases}`}
                vars={[
                  { sym: 'G', def: 'gains nets à la sortie (plus-value)' },
                ]}
                example={"Gains = 50 000 €\n< 5 ans : 50 000 × 30% = 15 000 €\n≥ 5 ans : 50 000 × 17.2% = 8 600 €\nÉconomie : 6 400 €"}
              />
            </FormulaGroup>

            <FormulaGroup title="CTO (Compte-Titres Ordinaire)">
              <FormulaCard
                name="Plus-values — PFU ou barème"
                source="taxation.ts:42-50"
                formula={`T = \\begin{cases} G \\times \\left(\\frac{\\text{TMI}}{100} + 17.2\\%\\right) & \\text{si TMI} \\leq 11\\% \\\\ G \\times 30\\% & \\text{si TMI} > 11\\% \\end{cases}`}
                vars={[
                  { sym: 'G', def: 'gains nets (plus-value)' },
                  { sym: '\\text{TMI}', def: 'Taux Marginal d\'Imposition (0–45%)' },
                ]}
                note="L'app choisit automatiquement le régime le plus favorable quand TMI ≤ 11%."
              />
              <FormulaCard
                name="Dividendes — abattement 40%"
                source="taxation.ts:105-108"
                formula="T_{\text{div}} = D \times 0.60 \times \left(\frac{\text{TMI}}{100} + 17.2\%\right)"
                vars={[
                  { sym: 'D', def: 'dividendes bruts reçus' },
                  { sym: '0.60', def: '1 − 40% d\'abattement légal sur dividendes' },
                ]}
                example={"D = 5 000 €, TMI = 30%\nT = 5 000 × 0.60 × (0.30 + 0.172) = 5 000 × 0.60 × 0.472 = 1 416 €"}
              />
            </FormulaGroup>

            <FormulaGroup title="Assurance-Vie">
              <FormulaCard
                name="Taxation à la sortie — 3 cas"
                source="taxation.ts:52-77"
                formula={`T = \\begin{cases}
G \\times 30\\% & \\text{si } t < 8\\text{ ans} \\\\[6pt]
\\max(0,\\, G - A) \\times 24.7\\% & \\text{si } t \\geq 8\\text{ ans},\\; V \\leq 150\\text{k€} \\\\[6pt]
(G_{{\\leq}} - A)\\times 24.7\\% + G_{{>}}\\times 30\\% & \\text{si } t \\geq 8\\text{ ans},\\; V > 150\\text{k€}
\\end{cases}`}
                vars={[
                  { sym: 'G', def: 'gains nets (plus-value)' },
                  { sym: 'A', def: 'abattement annuel : 4 600 € (célibataire) ou 9 200 € (couple)' },
                  { sym: 'V', def: 'total des versements (primes) effectués' },
                  { sym: 'G_{\\leq}', def: `G × 150 000 / V — part des gains correspondant aux versements ≤ 150 k€` },
                  { sym: 'G_{>}', def: `G × (1 − 150 000 / V) — part au-delà` },
                ]}
                example={"Gains = 40 000 €, versements = 200 000 €, ≥ 8 ans, célibataire\nratio = 150 000 / 200 000 = 0.75\nG_≤ = 40 000 × 0.75 = 30 000 €\nG_> = 40 000 × 0.25 = 10 000 €\nImpôt = (30 000 − 4 600) × 24.7% + 10 000 × 30%\n      = 25 400 × 24.7% + 3 000\n      = 6 274 + 3 000 = 9 274 €"}
              />
              <InteractiveExample
                title="Simuler la fiscalité AV"
                inputs={[
                  { id: 'gains', label: 'Gains G', value: 40000, min: 0, suffix: '€' },
                  { id: 'contrib', label: 'Versements totaux V', value: 200000, min: 0, suffix: '€' },
                  { id: 'yearsHeld', label: 'Durée de détention', value: 10, min: 0, max: 30, suffix: 'ans' },
                  { id: 'isCouple', label: 'Déclaration couple (1=oui)', value: 0, min: 0, max: 1, step: 1 },
                  { id: 'tmi', label: 'TMI (info)', value: 30, min: 0, max: 45, suffix: '%' },
                ]}
                compute={avTaxCalc}
              />
            </FormulaGroup>

            <FormulaGroup title="PER (Plan Épargne Retraite) — sortie en capital">
              <FormulaCard
                name="Taxation totale à la sortie"
                source="taxation.ts:79-97"
                formula="T = V \times \frac{\text{TMI}}{100} + G \times 30\%"
                vars={[
                  { sym: 'V', def: 'total des versements déductibles effectués' },
                  { sym: 'G', def: 'gains nets (plus-value uniquement)' },
                  { sym: '\\text{TMI}', def: 'TMI à la retraite (souvent inférieur à celui lors des versements)' },
                ]}
                note="Économie fiscale annuelle lors des versements : Versement × TMI_actuel. L'arbitrage est avantageux si TMI_retraite < TMI_activité."
              />
            </FormulaGroup>

            <FormulaGroup title="Économie fiscale PER (pendant les versements)">
              <FormulaCard
                name="Déduction fiscale annuelle"
                source="simulation.ts:197,211"
                formula="\text{Économie}_{\text{an}} = \sum_{\text{mois}} v_{\text{mensuel}} \times \frac{\text{TMI}}{100}"
                vars={[
                  { sym: 'v_{\\text{mensuel}}', def: 'versement brut mensuel dans le PER' },
                  { sym: '\\text{TMI}', def: 'tranche marginale d\'imposition courante' },
                ]}
                example={"v = 500 €/mois, TMI = 30%\nÉconomie = 500 × 12 × 30% = 1 800 €/an"}
              />
            </FormulaGroup>

          </Sec>

          {/* ── Section 3: Retraite & Revenus passifs ─────────────────────── */}
          <Sec id="s3" title="Retraite & Revenus passifs">

            <FormulaGroup title="Capital nécessaire — règle des 4% (Trinity Study)">
              <FormulaCard
                name="Capital cible"
                source="retirement.ts:41-49"
                formula="C = \frac{(D - P) \times 12}{\tau_r}"
                vars={[
                  { sym: 'D', def: 'dépenses mensuelles en retraite (€)' },
                  { sym: 'P', def: 'pension mensuelle reçue (€)' },
                  { sym: '\\tau_r', def: 'taux de retrait annuel (ex : 0.04 pour la règle des 4%)' },
                ]}
                example={"D = 3 000 €, P = 800 €, τr = 4%\nC = (3 000 − 800) × 12 / 0.04 = 26 400 / 0.04 = 660 000 €"}
              />
              <InteractiveExample
                title="Capital nécessaire pour la retraite"
                inputs={[
                  { id: 'expenses', label: 'Dépenses mensuelles', value: 3000, min: 0, suffix: '€' },
                  { id: 'pension', label: 'Pension mensuelle', value: 800, min: 0, suffix: '€' },
                  { id: 'rate', label: 'Taux de retrait τr', value: 4, min: 0.5, max: 10, step: 0.5, suffix: '%' },
                ]}
                compute={retirementCalc}
              />
            </FormulaGroup>

            <FormulaGroup title="Phase de retrait — simulation de dépletion">
              <FormulaCard
                name="Itération mensuelle de capital (Runway)"
                source="retirement.ts:59-76"
                formula="B_{n+1} = B_n \times \left(1 + \frac{r}{12}\right) - R_m"
                vars={[
                  { sym: 'B_n', def: 'capital restant à la fin du mois n' },
                  { sym: 'r', def: 'taux de rendement annuel du portefeuille de retrait' },
                  { sym: 'R_m', def: 'retrait mensuel (= C × τr / 12)' },
                ]}
                note={`Arrêt : B ≤ 0 ou 2 400 mois (constante MAX_RUNWAY_MONTHS). Si B × (r/12) ≥ Rm, le capital est illimité (perpétuité).`}
              />
              <FormulaCard
                name="Revenu mensuel passif soutenable"
                source="retirement.ts:157"
                formula="R_m = \frac{C \times \tau_r}{12}"
              />
            </FormulaGroup>

            <FormulaGroup title="Rendement pondéré des enveloppes (retraite)">
              <FormulaCard
                name="Poids enveloppe pour calcul du rendement global"
                source="retirement.ts:82-98"
                formula="w_i = \frac{c_i + K_i / 120}{\displaystyle\sum_j \left(c_j + K_j / 120\right)}"
                vars={[
                  { sym: 'c_i', def: 'cotisation mensuelle de l\'enveloppe i' },
                  { sym: 'K_i', def: 'capital initial de l\'enveloppe i' },
                  { sym: '120', def: 'WEIGHT_HORIZON_MONTHS = 10 ans — proxy pour convertir le capital en flux mensuel équivalent' },
                ]}
              />
            </FormulaGroup>

          </Sec>

          {/* ── Section 4: Crédit & Bilan net ─────────────────────────────── */}
          <Sec id="s4" title="Crédit & Bilan net">

            <FormulaGroup title="Mensualité de prêt (annuité constante)">
              <FormulaCard
                name="Formule PMT"
                source="netWorthEngine.ts / RealEstatePanel"
                formula="M = K \cdot \frac{r/12}{1 - (1 + r/12)^{-n}}"
                vars={[
                  { sym: 'K', def: 'capital emprunté (€)' },
                  { sym: 'r', def: 'taux d\'intérêt annuel nominal (décimal)' },
                  { sym: 'n', def: 'durée totale en mois' },
                ]}
                example={"K = 200 000 €, r = 3.5%, n = 240 mois (20 ans)\nM = 200 000 × (0.035/12) / [1 − (1.002917)^−240]\n  = 583.33 / [1 − 0.4993] = 583.33 / 0.5007 ≈ 1 165 €/mois"}
              />
              <InteractiveExample
                title="Calculer une mensualité"
                inputs={[
                  { id: 'K', label: 'Capital K', value: 200000, min: 1000, suffix: '€' },
                  { id: 't', label: 'Taux annuel r', value: 3.5, min: 0.1, max: 15, step: 0.05, suffix: '%' },
                  { id: 'n', label: 'Durée n', value: 240, min: 12, max: 360, suffix: 'mois' },
                ]}
                compute={mortgageCalc}
              />
            </FormulaGroup>

            <FormulaGroup title="Capital restant après k paiements">
              <FormulaCard
                name="Amortissement exact (taux > 0)"
                source="netWorthEngine.ts:12-28"
                formula="R(k) = P \cdot \frac{(1+r)^n - (1+r)^k}{(1+r)^n - 1}"
                vars={[
                  { sym: 'P', def: 'capital restant initial (remainingAmount)' },
                  { sym: 'r', def: 'taux mensuel (= taux_annuel / 12)' },
                  { sym: 'n', def: 'nombre de mois restants au départ (remainingMonths)' },
                  { sym: 'k', def: 'mois écoulés depuis le départ (= yearIndex × 12)' },
                ]}
                note="Si r = 0 : R(k) = P × (1 − k/n) — dépréciation linéaire."
              />
              <InteractiveExample
                title="Capital restant à un instant t"
                inputs={[
                  { id: 'P', label: 'Capital restant P', value: 200000, min: 0, suffix: '€' },
                  { id: 'r', label: 'Taux annuel r', value: 3.5, min: 0, max: 15, step: 0.05, suffix: '%' },
                  { id: 'n', label: 'Mois restants n', value: 240, min: 1, max: 360, suffix: 'mois' },
                  { id: 'k', label: 'Mois écoulés k', value: 60, min: 0, max: 360, suffix: 'mois' },
                ]}
                compute={loanRemainingCalc}
              />
            </FormulaGroup>

            <FormulaGroup title="Bilan net & ratios">
              <FormulaCard
                name="Patrimoine net et ratio d'endettement"
                source="netWorthEngine.ts:66-74"
                formula="\text{NW} = A - L \qquad \rho = \frac{L}{A}"
                vars={[
                  { sym: 'A', def: 'total des actifs (capital simulé à l\'année t)' },
                  { sym: 'L', def: 'total des passifs (capital restant sur tous les crédits à l\'année t)' },
                  { sym: '\\rho', def: 'ratio d\'endettement — alerte si ρ > 50%' },
                ]}
              />
            </FormulaGroup>

          </Sec>

          {/* ── Section 5: Indicateurs techniques ────────────────────────── */}
          <Sec id="s5" title="Indicateurs techniques">

            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-tertiary)' }}>
              Source : <span style={{ fontFamily: 'var(--font-mono)' }}>src/finance/services/indicatorsService.ts</span> — fonctions pures, aucun effet de bord, retournent <span style={{ fontFamily: 'var(--font-mono)' }}>(number | null)[]</span> aligné sur l'input.
            </p>

            <FormulaGroup title="Moyennes mobiles">
              <FormulaCard
                name="SMA — Simple Moving Average"
                source="indicatorsService.ts:5-11"
                formula="\text{SMA}_t = \frac{1}{n} \sum_{i=0}^{n-1} c_{t-i}"
                vars={[
                  { sym: 'c_{t-i}', def: 'cours de clôture i jours avant t' },
                  { sym: 'n', def: 'période (nombre de bougies)' },
                ]}
              />
              <FormulaCard
                name="EMA — Exponential Moving Average (Wilder)"
                source="indicatorsService.ts:13-23"
                formula="\begin{aligned} k &= \frac{2}{n+1} \\[4pt] \text{EMA}_0 &= \text{SMA}(c_{0..n-1}) \\[4pt] \text{EMA}_t &= c_t \cdot k + \text{EMA}_{t-1} \cdot (1-k) \end{aligned}"
                vars={[
                  { sym: 'k', def: 'facteur de lissage exponentiel' },
                  { sym: 'n', def: 'période' },
                ]}
                note="L'initialisation est une SMA sur les n premières valeurs. k = 2/(n+1) est le multiplicateur standard Appel/Wilder."
              />
            </FormulaGroup>

            <FormulaGroup title="RSI — Relative Strength Index (Wilder, 1978)">
              <FormulaCard
                name="RSI avec lissage de Wilder"
                source="indicatorsService.ts:27-44"
                formula={`\\begin{aligned}
\\text{Init} &: \\quad \\overline{G} = \\frac{\\sum_{i=1}^{n} \\max(\\Delta c_i,\\, 0)}{n}, \\quad \\overline{L} = \\frac{\\sum_{i=1}^{n} \\max(-\\Delta c_i,\\, 0)}{n} \\\\[8pt]
\\text{Smooth} &: \\quad \\overline{G}_t = \\frac{\\overline{G}_{t-1} \\cdot (n-1) + \\max(\\Delta c_t,0)}{n} \\\\[4pt]
\\text{RSI} &= 100 - \\frac{100}{1 + \\overline{G}/\\overline{L}}
\\end{aligned}`}
                vars={[
                  { sym: '\\Delta c_t = c_t - c_{t-1}', def: 'variation de clôture' },
                  { sym: 'n', def: 'période (défaut : 14)' },
                  { sym: '\\overline{G}', def: 'moyenne des hausses (Average Gain)' },
                  { sym: '\\overline{L}', def: 'moyenne des baisses (Average Loss)' },
                ]}
                note="Si AvgLoss = 0, RSI = 100. Zone de surachat conventionnelle : RSI > 70. Survente : RSI < 30."
              />
            </FormulaGroup>

            <FormulaGroup title="MACD — Moving Average Convergence Divergence">
              <FormulaCard
                name="MACD, Signal, Histogramme"
                source="indicatorsService.ts:54-79"
                formula={`\\begin{aligned}
\\text{MACD} &= \\text{EMA}_{12} - \\text{EMA}_{26} \\\\[4pt]
\\text{Signal} &= \\text{EMA}(\\text{MACD},\\; 9) \\\\[4pt]
\\text{Histo} &= \\text{MACD} - \\text{Signal}
\\end{aligned}`}
                note="Paramètres par défaut : fast=12, slow=26, signal=9. La ligne Signal est calculée sur les valeurs non-nulles du MACD puis réalignée."
              />
            </FormulaGroup>

            <FormulaGroup title="Bollinger Bands">
              <FormulaCard
                name="Bandes de Bollinger (2σ)"
                source="indicatorsService.ts:89-102"
                formula={`\\begin{aligned}
\\mu &= \\text{SMA}_{20} \\\\[4pt]
\\sigma &= \\sqrt{\\frac{\\displaystyle\\sum_{i=0}^{n-1}(c_{t-i} - \\mu)^2}{n}} \\\\[8pt]
\\text{Upper} &= \\mu + 2\\sigma \\qquad \\text{Lower} = \\mu - 2\\sigma
\\end{aligned}`}
                vars={[
                  { sym: '\\mu', def: 'SMA sur la période (défaut n=20)' },
                  { sym: '\\sigma', def: 'écart-type de population (non corrigé)' },
                  { sym: '2', def: 'multiplicateur (défaut = 2, modifiable)' },
                ]}
              />
            </FormulaGroup>

            <FormulaGroup title="ATR — Average True Range">
              <FormulaCard
                name="ATR avec lissage de Wilder"
                source="indicatorsService.ts:106-122"
                formula={`\\begin{aligned}
\\text{TR}_t &= \\max\\!\\left(H_t - L_t,\\; |H_t - C_{t-1}|,\\; |L_t - C_{t-1}|\\right) \\\\[6pt]
\\text{ATR}_t &= \\frac{\\text{ATR}_{t-1} \\cdot (n-1) + \\text{TR}_t}{n}
\\end{aligned}`}
                vars={[
                  { sym: 'H_t, L_t, C_t', def: 'High, Low, Close de la bougie t' },
                  { sym: 'C_{t-1}', def: 'Close de la bougie précédente' },
                  { sym: 'n', def: 'période (défaut : 14)' },
                ]}
                note="Première valeur : SMA sur les n premières TR. Le TR prend en compte les gaps overnight, contrairement à H−L seul."
              />
            </FormulaGroup>

            <FormulaGroup title="OBV — On-Balance Volume">
              <FormulaCard
                name="Volume cumulé directionnel"
                source="indicatorsService.ts:126-135"
                formula={`\\text{OBV}_t = \\text{OBV}_{t-1} + \\begin{cases} +V_t & \\text{si } C_t > C_{t-1} \\\\ -V_t & \\text{si } C_t < C_{t-1} \\\\ 0 & \\text{si } C_t = C_{t-1} \\end{cases}`}
                vars={[
                  { sym: 'V_t', def: 'volume de la bougie t' },
                ]}
              />
            </FormulaGroup>

            <FormulaGroup title="Volatilité annualisée">
              <FormulaCard
                name="Écart-type des log-retours × √252"
                source="indicatorsService.ts:148-154"
                formula={`\\begin{aligned}
r_i &= \\ln\\!\\left(\\frac{c_i}{c_{i-1}}\\right) \\\\[6pt]
\\sigma_a &= \\sqrt{\\frac{\\displaystyle\\sum_i (r_i - \\bar{r})^2}{n}} \\times \\sqrt{252}
\\end{aligned}`}
                vars={[
                  { sym: 'r_i', def: 'log-retour journalier' },
                  { sym: '\\bar{r}', def: 'moyenne des log-retours' },
                  { sym: '252', def: 'jours de trading annuels (convention)' },
                ]}
                note="σ_a est la volatilité de population (diviseur n, non n−1). Utilisé dans l'optimiseur et le screener."
              />
            </FormulaGroup>

          </Sec>

          {/* ── Section 6: Monte-Carlo & Markov ───────────────────────────── */}
          <Sec id="s6" title="Simulation Monte-Carlo &amp; Markov">

            <FormulaGroup title="Génération de nombres pseudo-aléatoires">
              <FormulaCard
                name="RNG Mulberry32 (déterministe, seedé)"
                source="markovEngine.ts:17-25"
                formula="s_{n+1} = (s_n + \texttt{0x6D2B79F5}) \mathbin{\text{>>>}} 0 \quad \Rightarrow \quad U = \frac{t \mathbin{\text{>>>}} 0}{2^{32}}"
                note="Mix de bits supplémentaire (imul) avant la division finale. Utilisé pour la reproductibilité des trajectoires MC. seed dérivé de l'index de trajectoire."
              />
              <FormulaCard
                name="Box-Muller — variable normale N(μ, σ)"
                source="markovEngine.ts:47-54 / predictionEngine.ts:142-145"
                formula="Z = \sqrt{-2\ln U_1} \cdot \cos(2\pi U_2) \qquad X = \mu + \sigma Z"
                vars={[
                  { sym: 'U_1, U_2', def: 'variables uniformes indépendantes ∈ (0, 1]' },
                  { sym: 'Z', def: 'variable standard N(0,1)' },
                ]}
                note="U₁ est clampé à max(U₁, 1e-10) pour éviter ln(0)."
              />
            </FormulaGroup>

            <FormulaGroup title="Chaîne de Markov à 4 régimes économiques">
              <div>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ink-subtle)' }}>
                  Matrice de transition P — probabilités annuelles de passage d'un régime à l'autre.
                  Source : <span style={{ fontFamily: 'var(--font-mono)' }}>src/data/regimeData.ts</span>
                </p>
                <TransitionMatrix />
              </div>
              <FormulaCard
                name="Tirage du prochain régime (inverse CDF)"
                source="markovEngine.ts:33-45"
                formula="j^* = \min\!\left\{ j \;\middle|\; \sum_{k \leq j} P_{ij} > U \right\}, \quad U \sim \mathcal{U}[0,1]"
                note="Parcours cumulatif de la ligne i de P. Premier j dont le cumul dépasse U est le prochain régime."
              />
              <FormulaCard
                name="Distribution stationnaire (itération puissance)"
                source="markovEngine.ts:58-74"
                formula="\pi^{(t+1)} = \pi^{(t)} \cdot P \quad \text{(2 000 itérations)}"
                note="Convergence garantie car P est ergodique (toutes les transitions > 0). π est calculé une fois au démarrage."
              />
            </FormulaGroup>

            <FormulaGroup title="Paramètres par régime et classe d'actifs">
              <RegimeParamsTable />
            </FormulaGroup>

            <FormulaGroup title="Mélange Markov / historique (warm-up)">
              <FormulaCard
                name="Poids de mélange exponentiel"
                source="markovEngine.ts:127-129"
                formula="w(t) = e^{-\lambda \cdot \max(0,\; t - t_c)}, \quad \lambda = 0.15"
                vars={[
                  { sym: 't', def: 'année courante de la simulation' },
                  { sym: 't_c', def: 'année de transition — calculée par variance inter-régime (≈ 5-15 ans)' },
                  { sym: '\\lambda', def: 'taux de déclin = 0.15 (constante LAMBDA_DECAY)' },
                ]}
                note="Pour t ≤ t_c : w = 1 (pur Markov). Pour t > t_c : w décline vers 0, le retour converge vers r_historique."
              />
              <FormulaCard
                name="Retour final par actif"
                source="markovEngine.ts:189-218"
                formula="r_{\text{final}} = w \cdot r_{\text{Markov}} + (1 - w) \cdot r_{\text{hist}}"
                vars={[
                  { sym: 'r_{\\text{Markov}}', def: 'retour échantillonné : N(μ_régime, σ_régime) via Box-Muller' },
                  { sym: 'r_{\\text{hist}}', def: 'rendement historique moyen de la classe d\'actif (constant)' },
                ]}
              />
            </FormulaGroup>

            <FormulaGroup title="GBM — Mouvement Brownien Géométrique (prédiction court-terme)">
              <FormulaCard
                name="Équation différentielle stochastique (discrétisée)"
                source="predictionEngine.ts:94-138"
                formula="S_t = S_{t-1} \cdot \exp\!\left[\left(\mu - \frac{\sigma^2}{2}\right)\Delta t + \sigma \sqrt{\Delta t}\, Z\right]"
                vars={[
                  { sym: 'S_t', def: 'prix à l\'instant t' },
                  { sym: '\\mu', def: 'drift — moyenne des log-retours historiques' },
                  { sym: '\\sigma', def: 'volatilité — écart-type des log-retours historiques' },
                  { sym: '\\Delta t = 1/252', def: 'pas journalier' },
                  { sym: 'Z \\sim \\mathcal{N}(0,1)', def: 'variable normale via Box-Muller' },
                ]}
                note="N = 200 trajectoires, horizon = 30 jours. P10/P50/P90 calculés par tri cross-sectionnel à chaque jour."
              />
            </FormulaGroup>

          </Sec>

          {/* ── Section 7: Black-Litterman & CVaR ─────────────────────────── */}
          <Sec id="s7" title="Black-Litterman &amp; CVaR">

            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-tertiary)' }}>
              Source : <span style={{ fontFamily: 'var(--font-mono)' }}>src/engine/portfolioOptimizer.ts</span>
            </p>

            <ConstantTable rows={[
              { name: 'BL_DELTA', value: '2.5', meaning: 'Coefficient d\'aversion au risque global (δ)' },
              { name: 'BL_TAU', value: '0.05', meaning: 'Incertitude sur le prior (τ) — faible = forte confiance dans le marché' },
              { name: 'MONTE_CARLO_N', value: '1 000', meaning: 'Trajectoires pour le CVaR de l\'optimiseur' },
            ]} />

            <FormulaGroup title="Matrice de covariance">
              <FormulaCard
                name="Construction à partir des corrélations et volatilités par régime"
                source="portfolioOptimizer.ts:120-139"
                formula={`\\Sigma_{ij} = \\begin{cases} \\sigma_i^2 & i = j \\\\[4pt] \\sigma_i \\cdot \\sigma_j \\cdot \\rho_{ij} & i \\neq j \\end{cases}`}
                vars={[
                  { sym: '\\sigma_i', def: 'volatilité de l\'actif i dans le régime courant' },
                  { sym: '\\rho_{ij}', def: 'corrélation entre classes d\'actifs (table ASSET_CLASS_CORRELATIONS)' },
                ]}
                example={"Corrélations clés :\nequity–bonds      : −0.20\nequity–real_estate:  0.40\nequity–crypto     :  0.15\nbonds–real_estate :  0.10"}
              />
            </FormulaGroup>

            <FormulaGroup title="Black-Litterman (Idzorek 2005)">
              <FormulaCard
                name="1. Rendements implicites d'équilibre"
                source="portfolioOptimizer.ts:143-147"
                formula="\pi = \delta \cdot \Sigma \cdot w_m"
                vars={[
                  { sym: '\\delta = 2.5', def: 'aversion au risque (BL_DELTA)' },
                  { sym: '\\Sigma', def: 'matrice de covariance' },
                  { sym: 'w_m', def: 'poids de marché (MARKET_CAP_WEIGHTS : equity 45%, bonds 25%, immo 15%, money 10%, crypto 5%)' },
                ]}
              />
              <FormulaCard
                name="2. Intégration des vues d'investisseur"
                source="portfolioOptimizer.ts:153-196"
                formula={`\\begin{aligned}
A &= (\\tau\\Sigma)^{-1} + P^\\top \\Omega^{-1} P \\\\[6pt]
b &= (\\tau\\Sigma)^{-1}\\pi + P^\\top \\Omega^{-1} Q \\\\[6pt]
\\mu_{\\text{BL}} &= A^{-1} b
\\end{aligned}`}
                vars={[
                  { sym: '\\tau = 0.05', def: 'incertitude sur le prior (BL_TAU)' },
                  { sym: 'P', def: 'matrice de sélection des vues (n_vues × n_actifs), ligne i = [0…0 1 0…0]' },
                  { sym: 'Q', def: 'vecteur des rendements espérés par vue × confiance/100' },
                  { sym: '\\Omega', def: 'matrice de covariance des vues : diag(τΣ P^⊤ P)' },
                ]}
                note="Inversion matricielle par élimination de Gauss-Jordan (pivotage partiel). Fallback sur identité si pivot < 1e-12."
              />
            </FormulaGroup>

            <FormulaGroup title="CVaR — Conditional Value at Risk">
              <FormulaCard
                name="CVaR 95% sur N trajectoires Monte-Carlo"
                source="portfolioOptimizer.ts:200-227"
                formula={`\\begin{aligned}
\\text{CAGR}_i &= \\left(\\frac{V_{T,i}}{V_{0,i}}\\right)^{1/T} - 1 \\quad \\text{(trajectoire } i\\text{)} \\\\[8pt]
\\text{VaR}_{\\alpha} &= \\text{percentile}\\left(\\{\\text{CAGR}_i\\},\\; 1 - \\alpha\\right) \\\\[6pt]
\\text{CVaR} &= \\mathbb{E}\\!\\left[\\text{CAGR}_i \\mid \\text{CAGR}_i \\leq \\text{VaR}_{\\alpha}\\right]
\\end{aligned}`}
                vars={[
                  { sym: '\\alpha = 0.95', def: 'niveau de confiance (5% pire cas)' },
                  { sym: 'T', def: 'durée de la simulation (années)' },
                ]}
                note="CVaR = perte moyenne dans les 5% pires scénarios — mesure de risque cohérente plus robuste que VaR seul."
              />
            </FormulaGroup>

            <FormulaGroup title="Optimisation de portefeuille (gradient projeté)">
              <FormulaCard
                name="Algorithme de descente de gradient avec projection sur simplexe"
                source="portfolioOptimizer.ts:303-350"
                formula={`w^{(k+1)} = \\text{proj}_{\\Delta_c}\\!\\left(w^{(k)} - \\eta \\cdot \\nabla f(w^{(k)})\\right)`}
                vars={[
                  { sym: '\\eta = 0.01', def: 'taux d\'apprentissage (learning rate)' },
                  { sym: '\\nabla f', def: 'gradient : −r_net (maximiser le rendement net après impôts)' },
                  { sym: '\\Delta_c', def: 'simplexe contraint : w_i ≥ 0, Σw_i = 1, w_i ≤ w_{max,i}' },
                  { sym: 'K = 500', def: 'nombre maximum d\'itérations' },
                ]}
                note="Convergence si max|Δw| < 1e-6. Projection par reclipping itératif (20 sous-itérations max)."
              />
            </FormulaGroup>

          </Sec>

          {/* ── Section 8: Métriques de backtest ──────────────────────────── */}
          <Sec id="s8" title="Métriques de backtest">

            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-tertiary)' }}>
              Source : <span style={{ fontFamily: 'var(--font-mono)' }}>src/finance/engine/backtestEngine.ts</span> — exécution sur données historiques, sans look-ahead bias (signal sur bougie i, exécution sur open de bougie i+1).
            </p>

            <FormulaGroup title="Performance">
              <FormulaCard
                name="Max Drawdown"
                source="backtestEngine.ts:4-15"
                formula="\text{MDD} = \max_{0 \leq s \leq t \leq T} \frac{P_s - P_t}{P_s}"
                vars={[
                  { sym: 'P_s', def: 'valeur du portefeuille au pic s' },
                  { sym: 'P_t', def: 'valeur du portefeuille au creux t (t ≥ s)' },
                ]}
                note="MDD mesuré sur la courbe d'équité (equity curve) reconstruite pas à pas."
              />
              <FormulaCard
                name="Sharpe Ratio annualisé (risk-free = 0)"
                source="backtestEngine.ts:137-143"
                formula="S = \frac{\bar{r}}{\sigma} \times \sqrt{252}"
                vars={[
                  { sym: '\\bar{r}', def: 'moyenne des retours journaliers (r_i = (Eq_i − Eq_{i−1}) / Eq_{i−1})' },
                  { sym: '\\sigma', def: 'écart-type de population des retours journaliers' },
                  { sym: '252', def: 'jours de trading par an' },
                ]}
              />
              <InteractiveExample
                title="Calculer un Sharpe annualisé"
                inputs={[
                  { id: 'mu', label: 'Retour moyen journalier μ', value: 0.05, min: -5, max: 5, step: 0.01, suffix: '%' },
                  { id: 'sigma', label: 'Volatilité journalière σ', value: 1.2, min: 0.01, max: 10, step: 0.01, suffix: '%' },
                ]}
                compute={sharpeCalc}
              />
              <FormulaCard
                name="Buy & Hold (benchmark)"
                source="backtestEngine.ts:145-147"
                formula="\text{B\&H} = \frac{P_T - P_0}{P_0} \times 100\%"
                note="Retour total sans levier, sans coût de transaction. Sert de référence pour évaluer l'alpha de la stratégie."
              />
            </FormulaGroup>

            <FormulaGroup title="Qualité des trades">
              <FormulaCard
                name="Win Rate"
                source="backtestEngine.ts:127-129"
                formula="\text{WR} = \frac{N_{\text{gain}}}{N_{\text{total}}}"
                vars={[
                  { sym: 'N_{\\text{gain}}', def: 'nombre de trades fermés avec PnL > 0' },
                  { sym: 'N_{\\text{total}}', def: 'total des trades fermés (sell orders)' },
                ]}
              />
              <FormulaCard
                name="Profit Factor"
                source="backtestEngine.ts:132-134"
                formula="\text{PF} = \frac{\sum_i \max(\text{PnL}_i,\, 0)}{\left|\sum_i \min(\text{PnL}_i,\, 0)\right|}"
                note="PF > 1 : la stratégie génère plus de gains que de pertes. PF > 2 est considéré excellent."
              />
            </FormulaGroup>

            <FormulaGroup title="PnL d'un trade">
              <FormulaCard
                name="Calcul du P&L réalisé à la clôture"
                source="backtestEngine.ts:86-95"
                formula={`\\begin{aligned}
\\text{Coût d'entrée} &= Q \\cdot P_{\\text{entry}} \\cdot (1 + f_r) \\\\[4pt]
\\text{Produit de sortie} &= Q \\cdot P_{\\text{exit}} \\cdot (1 - f_r) \\\\[4pt]
\\text{PnL} &= \\text{Produit} - \\text{Coût}
\\end{aligned}`}
                vars={[
                  { sym: 'Q', def: 'quantité (nombre de titres)' },
                  { sym: 'P_{\\text{entry}}, P_{\\text{exit}}', def: 'prix d\'entrée et de sortie (open de la bougie suivante)' },
                  { sym: 'f_r', def: 'taux de frais (config.feeRate)' },
                ]}
              />
            </FormulaGroup>

          </Sec>

        </div>
      </div>
    </div>
  )
}

// ── Icons ───────────────────────────────────────────────────────────────────

function SigmaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3H4l4.5 5L4 13h8" />
    </svg>
  )
}

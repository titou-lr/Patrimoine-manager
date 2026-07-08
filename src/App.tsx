import { useEffect, useRef, useState } from 'react'
import { useStore, selectActiveSim } from './store/useStore'
import { runSimulation, ZERO_FEES } from './engine/simulation'
import { runMonteCarlo } from './engine/markovEngine'
import { exportToCSV } from './utils/exportCSV'
import type { Asset, Envelope, EnvelopeFees, LifeEvent, MonteCarloResult, SimulationResult, GlobalParams } from './types'
import DataModal from './components/data/DataModal'
import OnboardingModal, { type OnboardingResult } from './components/onboarding/OnboardingModal'
import ProfileScreen from './components/profiles/ProfileScreen'
import { useTourStore } from './tour/store/useTourStore'
import WelcomeForm from './tour/components/WelcomeForm'
import TourController from './tour/components/TourController'
import {
  getActiveProfileId,
  getActiveProfile,
  getProfiles,
  setActiveProfile,
  markProfileOnboarded,
} from './profiles/profileService'
import EnvelopeTypeSelector from './components/inputs/EnvelopeTypeSelector'
import CapOverflowModal, { type CapRedirectChoice } from './components/inputs/CapOverflowModal'
import { createEnvelopeFromPreset } from './data/envelopePresets'
import SimulationComparePanel from './components/results/SimulationComparePanel'
import DashboardPage from './components/pages/DashboardPage'
import EnvelopesPage from './components/pages/EnvelopesPage'
import PortfolioOptimizer from './components/optimizer/PortfolioOptimizer'
import FinancePage from './finance/components/FinancePage'
import EducationPage from './education/components/EducationPage'
import BrokersPage from './components/pages/BrokersPage'
import ModelsReferencePage from './components/pages/ModelsReferencePage'
import BudgetPage from './budget/components/BudgetPage'
import DashboardPatrimoinePage from './components/pages/DashboardPatrimoinePage'
import SuccessionPage from './patrimoine/succession/SuccessionPage'
import HelpHost from './help/components/HelpHost'
import { usePatrimoineStore } from './patrimoine/store/usePatrimoineStore'
import { formatEur } from './utils/format'

type AppPage =
  | 'patrimoine' | 'succession'
  | 'simulation_dashboard' | 'envelopes' | 'optimizer'
  | 'finance' | 'education' | 'brokers' | 'models' | 'budget'

interface RunState {
  envelopes: Envelope[]
  globalParams: GlobalParams
  events: LifeEvent[]
  results: SimulationResult[]
  monteCarloResults?: MonteCarloResult[]
}

function computeRunState(
  envelopes: Envelope[],
  globalParams: GlobalParams,
  events: LifeEvent[] = []
): RunState {
  return { envelopes, globalParams, events, results: runSimulation(envelopes, globalParams, events) }
}

function createEnvelopesFromProfile(
  profile: OnboardingResult['riskProfile'],
  monthly: number
): Envelope[] {
  type Alloc = { livret_a?: number; ldds?: number; pea?: number; cto?: number }
  const allocs: Record<typeof profile, Alloc> = {
    prudent:   { livret_a: 0.5, ldds: 0.2, pea: 0.3 },
    equilibre: { livret_a: 0.2, ldds: 0.1, pea: 0.5, cto: 0.2 },
    dynamique: { livret_a: 0.1,             pea: 0.7, cto: 0.2 },
  }
  const a = allocs[profile]
  const envs: Envelope[] = []
  if (a.livret_a) envs.push({ id: 'livret_a', type: 'livret_a', label: 'Livret A', initialCapital: 0, monthlyContribution: Math.round(monthly * a.livret_a), yearlyContribution: 0, assets: [{ id: 'la', name: 'Livret A réglementé', expectedReturn: 3, allocation: 100 }], taxRate: 0, fees: ZERO_FEES, active: true, contributionMode: 'euros', contributionPercent: a.livret_a * 100 })
  if (a.ldds) envs.push({ id: 'ldds', type: 'ldds', label: 'LDDS', initialCapital: 0, monthlyContribution: Math.round(monthly * a.ldds), yearlyContribution: 0, assets: [{ id: 'ldds', name: 'LDDS réglementé', expectedReturn: 3, allocation: 100 }], taxRate: 0, fees: ZERO_FEES, active: true, contributionMode: 'euros', contributionPercent: a.ldds * 100 })
  if (a.pea) envs.push({ id: 'pea', type: 'pea', label: 'PEA', initialCapital: 0, monthlyContribution: Math.round(monthly * a.pea), yearlyContribution: 0, assets: [{ id: 'pea_w', name: 'ETF MSCI World', expectedReturn: 7, allocation: 70 }, { id: 'pea_e', name: 'ETF Europe', expectedReturn: 6, allocation: 30 }], taxRate: 17.2, fees: { orderFees: 0.5, orderFeesMin: 0.99, custodyFees: 0, entryFees: 0, managementFees: 0, exitFees: 0 }, active: true, contributionMode: 'euros', contributionPercent: a.pea * 100 })
  if (a.cto) envs.push({ id: 'cto', type: 'cto', label: 'CTO', initialCapital: 0, monthlyContribution: Math.round(monthly * a.cto), yearlyContribution: 0, assets: [{ id: 'cto_s', name: 'ETF S&P 500', expectedReturn: 7.5, allocation: 60 }, { id: 'cto_b', name: 'Obligations', expectedReturn: 3.5, allocation: 40 }], taxRate: 30, fees: { orderFees: 0.5, orderFeesMin: 0.99, custodyFees: 0, entryFees: 0, managementFees: 0, exitFees: 0 }, active: true, contributionMode: 'euros', contributionPercent: a.cto * 100 })
  return envs
}

// ── SVG icons (Linear 1.5px style) ──────────────────────────────────────────

const Svg = ({ d, s = 16, sw = 1.5, fill = 'none', children, className = '', style = {} }: {
  d?: string; s?: number; sw?: number; fill?: string; children?: React.ReactNode; className?: string; style?: React.CSSProperties
}) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill={fill} stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    {children ?? <path d={d} />}
  </svg>
)

const IconHome     = (p: { size?: number }) => <Svg s={p.size}><path d="M2.5 7.2 8 2.8l5.5 4.4" /><path d="M3.7 6.6V13h8.6V6.6" /></Svg>
const IconLayers   = (p: { size?: number }) => <Svg s={p.size}><path d="M8 2.2 14 5 8 7.8 2 5z" /><path d="M2.4 8 8 10.6 13.6 8" /><path d="M2.4 11 8 13.6 13.6 11" /></Svg>
const IconSpark    = (p: { size?: number; className?: string }) => <Svg s={p.size} className={p.className}><path d="M2.5 11 6 6.5l2.6 2.2L13.5 3" /><path d="M10.4 3h3.1v3.1" /></Svg>
const IconSearch   = (p: { size?: number }) => <Svg s={p.size}><circle cx="7" cy="7" r="4.3" /><path d="m10.4 10.4 3 3" /></Svg>
const IconChevronD = (p: { size?: number; className?: string }) => <Svg s={p.size} className={p.className}><path d="M3.5 6 8 10.5 12.5 6" /></Svg>
const IconPlus     = (p: { size?: number }) => <Svg s={p.size}><path d="M8 3.2v9.6M3.2 8h9.6" /></Svg>
const IconPlay     = (p: { size?: number }) => <Svg s={p.size} fill="currentColor" sw={0}><path d="M5 3.5v9l7.5-4.5z" /></Svg>
const IconExport   = (p: { size?: number }) => <Svg s={p.size}><path d="M8 2.5v6.5M5.4 6.6 8 9.2l2.6-2.6" /><path d="M3 11v1.5h10V11" /></Svg>
const IconClose    = (p: { size?: number }) => <Svg s={p.size}><path d="M4 4l8 8M12 4l-8 8" /></Svg>
const IconUser     = (p: { size?: number }) => <Svg s={p.size}><circle cx="8" cy="5.5" r="2.6" /><path d="M3.2 13.2a4.8 4.8 0 0 1 9.6 0" /></Svg>
const IconDollar   = (p: { size?: number }) => <Svg s={p.size}><path d="M8 1.5v13" /><path d="M11 4H6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H4.5" /></Svg>
const IconGraduate = (p: { size?: number }) => <Svg s={p.size}><path d="M2 6.5 8 4l6 2.5-6 2.5z" /><path d="M5 8.2V12c0 1 1.34 1.8 3 1.8s3-.8 3-1.8V8.2" /><path d="M14 6.5v3.5" /></Svg>
const IconBank     = (p: { size?: number }) => <Svg s={p.size}><path d="M2 13h12" /><path d="M3 13V7" /><path d="M6.5 13V7" /><path d="M9.5 13V7" /><path d="M13 13V7" /><path d="M1.5 7h13L8 2z" /></Svg>
const IconSigma    = (p: { size?: number }) => <Svg s={p.size}><path d="M12 3H4l4.5 5L4 13h8" /></Svg>
const IconBudget   = (p: { size?: number }) => <Svg s={p.size}><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 7h6M5 10h4" /><path d="M8 3V1.5" /></Svg>
const IconPie      = (p: { size?: number }) => <Svg s={p.size}><path d="M8 2a6 6 0 1 0 6 6H8z" /><path d="M10 1.8A6 6 0 0 1 14.2 6H10z" /></Svg>
const IconGift     = (p: { size?: number }) => <Svg s={p.size}><rect x="2.5" y="6" width="11" height="7.5" rx="1" /><path d="M8 6v7.5M2.5 9h11" /><path d="M8 6C6 6 4.5 5 4.5 3.8 4.5 2.8 5.3 2.2 6.2 2.2 7.4 2.2 8 3.5 8 6zm0 0c2 0 3.5-1 3.5-2.2 0-1-.8-1.6-1.7-1.6C8.6 2.2 8 3.5 8 6z" /></Svg>

// ── Command Palette ──────────────────────────────────────────────────────────

interface Cmd {
  group: string
  icon: React.ReactNode
  label: string
  kbd?: string
  run: () => void
}

function CommandPalette({
  close, go, openOnboarding, runSim,
}: {
  close: () => void
  go: (p: AppPage) => void
  openOnboarding: () => void
  runSim: () => void
}) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const cmds: Cmd[] = [
    { group: 'Navigation', icon: <IconPie size={16} />, label: 'Aller au Patrimoine', kbd: 'G P', run: () => go('patrimoine') },
    { group: 'Navigation', icon: <IconGift size={16} />, label: 'Aller à la Succession', kbd: 'G S', run: () => go('succession') },
    { group: 'Navigation', icon: <IconHome size={16} />, label: 'Aller au tableau de bord simulation', kbd: 'G D', run: () => go('simulation_dashboard') },
    { group: 'Navigation', icon: <IconLayers size={16} />, label: 'Aller aux enveloppes', kbd: 'G E', run: () => go('envelopes') },
    { group: 'Navigation', icon: <IconSpark size={16} />, label: 'Aller à l\'optimiseur', kbd: 'G O', run: () => go('optimizer') },
    { group: 'Navigation', icon: <IconDollar size={16} />, label: 'Aller à Finance', kbd: 'G F', run: () => go('finance') },
    { group: 'Navigation', icon: <IconGraduate size={16} />, label: 'Aller à Éducation', kbd: 'G U', run: () => go('education') },
    { group: 'Navigation', icon: <IconBank size={16} />, label: 'Aller aux Courtiers', kbd: 'G B', run: () => go('brokers') },
    { group: 'Navigation', icon: <IconSigma size={16} />, label: 'Aller aux Modèles & Formules', kbd: 'G M', run: () => go('models') },
    { group: 'Navigation', icon: <IconBudget size={16} />, label: 'Aller au Budget', kbd: 'G G', run: () => go('budget') },
    { group: 'Actions', icon: <IconPlay size={16} />, label: 'Lancer la simulation', kbd: '⌘ ↵', run: runSim },
    { group: 'Actions', icon: <IconPlus size={16} />, label: 'Ajouter une enveloppe', run: () => go('envelopes') },
    { group: 'Actions', icon: <IconSpark size={16} />, label: 'Optimiser le portefeuille', run: () => go('optimizer') },
    { group: 'Actions', icon: <IconUser size={16} />, label: 'Refaire la configuration', run: openOnboarding },
    { group: 'Export', icon: <IconExport size={16} />, label: 'Exporter CSV', run: () => {} },
  ]

  const filtered = cmds.filter(c => c.label.toLowerCase().includes(q.toLowerCase()))
  useEffect(() => { setSel(0) }, [q])

  const fire = (c?: Cmd) => { c?.run(); close() }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(filtered.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); fire(filtered[sel]) }
    else if (e.key === 'Escape') close()
  }

  let lastGroup = ''
  return (
    <div className="scrim" onMouseDown={close} style={{ zIndex: 100 }}>
      <div className="palette" onMouseDown={e => e.stopPropagation()} onKeyDown={onKey}>
        <div className="palette-input">
          <IconSearch size={17} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Tapez une commande ou recherchez…" />
          <span className="kbd">Esc</span>
        </div>
        <div className="scroll" style={{ overflowY: 'auto', padding: '6px 0 10px' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--ink-subtle)' }}>
              Aucun résultat pour « {q} »
            </div>
          )}
          {filtered.map((c, i) => {
            const showGroup = c.group !== lastGroup
            lastGroup = c.group
            return (
              <div key={i}>
                {showGroup && <div className="cmd-section">{c.group}</div>}
                <div
                  className={`cmd-row${i === sel ? ' on' : ''}`}
                  onMouseEnter={() => setSel(i)}
                  onClick={() => fire(c)}
                >
                  <span className="ci" style={{ display: 'flex' }}>{c.icon}</span>
                  <span style={{ flex: 1 }}>{c.label}</span>
                  {c.kbd && <span className="kbd">{c.kbd}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Profile Dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({
  close, onStartOnboarding, onRestartTour, profileName, profileInitials, profileColor,
}: {
  close: () => void
  onStartOnboarding: () => void
  onRestartTour: () => void
  profileName: string
  profileInitials: string
  profileColor: string
}) {
  const profiles = getProfiles()
  const activeId = getActiveProfileId()
  const [hov, setHov] = useState<string | null>(null)

  return (
    <div
      className="scrim"
      onMouseDown={close}
      style={{ alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: 54, paddingLeft: 8, zIndex: 100 }}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          width: 296, background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-pop)', overflow: 'hidden',
          animation: 'pop .18s var(--ease)',
        }}
      >
        {/* Current profile header */}
        <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--hairline)' }}>
          <div className="row gap10" style={{ marginBottom: 8 }}>
            <div
              className="avatar"
              style={{ width: 36, height: 36, background: profileColor, fontSize: 14, borderRadius: 10, flexShrink: 0 }}
            >
              {profileInitials}
            </div>
            <div>
              <div className="title">{profileName}</div>
              <div className="caption">Espace personnel</div>
            </div>
          </div>
        </div>

        {/* Workspace list */}
        <div style={{ padding: '6px 0' }}>
          <div className="cmd-section">Espaces de travail</div>
          {profiles.map(p => (
            <div
              key={p.id}
              className={`cmd-row${p.id === activeId ? ' on' : ''}`}
              onMouseEnter={() => setHov(p.id)}
              onMouseLeave={() => setHov(null)}
              onClick={() => { if (p.id !== activeId) { setActiveProfile(p.id); window.location.reload() } close() }}
              style={{ margin: '1px 6px' }}
            >
              <div className="avatar" style={{ width: 22, height: 22, background: p.color, fontSize: 9, borderRadius: 6, flexShrink: 0 }}>
                {p.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="grow">
                <div className="subhead" style={{ fontSize: 13 }}>{p.name}</div>
              </div>
              {p.id === activeId
                ? <span className="badge badge-accent">Actif</span>
                : hov === p.id && <span className="caption" style={{ fontSize: 11.5 }}>Basculer</span>}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ borderTop: '1px solid var(--hairline)', padding: '6px 0' }}>
          <div className="cmd-row" onClick={() => { onRestartTour(); close() }} style={{ margin: '1px 6px' }}>
            <span className="ci" style={{ display: 'flex' }}><IconSpark size={15} /></span>
            <span>Relancer le tutoriel</span>
          </div>
          <div className="cmd-row" onClick={() => { onStartOnboarding(); close() }} style={{ margin: '1px 6px' }}>
            <span className="ci" style={{ display: 'flex' }}><IconUser size={15} /></span>
            <span>Reconfigurer le profil</span>
          </div>
          <div
            className="cmd-row"
            onClick={() => { window.location.reload() }}
            style={{ margin: '1px 6px', color: 'var(--danger)' }}
          >
            <span className="ci" style={{ display: 'flex', color: 'var(--danger)' }}><IconClose size={15} /></span>
            <span>Changer de profil</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [showProfileScreen] = useState(() => !getActiveProfileId())
  const [currentPage, setCurrentPage] = useState<AppPage>('patrimoine')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  const store = useStore()
  const {
    addEnvelope, updateEnvelope, undo, redo,
    simulations, applyOnboarding, setDirty,
    setActiveSimulation, addSimulation,
  } = store
  const activeSim = selectActiveSim(store)
  const { envelopes, globalParams, isDirty, events } = activeSim

  const [showOnboarding, setShowOnboarding] = useState(false)
  const tourStore = useTourStore()

  // Show WelcomeForm only for new profiles (not yet onboarded)
  // Existing profiles (onboarded=true) go straight to TourController
  const profileOnboarded = getActiveProfile()?.onboarded ?? false
  const tourReady = tourStore.formCompleted || profileOnboarded
  const [comparePanelOpen, setComparePanelOpen] = useState(false)
  const [dataModalOpen, setDataModalOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [showEnvelopeSelector, setShowEnvelopeSelector] = useState(false)
  const [capModalOpen, setCapModalOpen] = useState(false)
  const [_capModalDismissed, setCapModalDismissed] = useState(false)
  const [capReachedByEnvelope, setCapReachedByEnvelope] = useState<Record<string, number>>({})
  const [feesImportTarget, setFeesImportTarget] = useState<{
    envelopeId: string; envelopeType: Envelope['type']; envelopeLabel: string
  } | null>(null)

  const [runState, setRunState] = useState<RunState>(() =>
    computeRunState(envelopes, globalParams, events ?? [])
  )

  useEffect(() => {
    const sim = selectActiveSim(useStore.getState())
    setRunState(computeRunState(sim.envelopes, sim.globalParams, sim.events ?? []))
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSim.id])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      const meta = e.ctrlKey || e.metaKey

      if (meta && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p) }
      if (e.key === 'Escape') { setPaletteOpen(false); setProfileDropdownOpen(false) }

      if (!inInput) {
        if (meta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
        if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      }
      if (meta && e.key === '1') { e.preventDefault(); navigateTo('simulation_dashboard') }
      if (meta && e.key === '2') { e.preventDefault(); navigateTo('envelopes') }
      if (meta && e.key === '3') { e.preventDefault(); navigateTo('optimizer') }
      if (meta && e.key === '4') { e.preventDefault(); navigateTo('finance') }
      if (meta && e.key === '5') { e.preventDefault(); navigateTo('education') }
      if (meta && e.key === '6') { e.preventDefault(); navigateTo('brokers') }
      if (meta && e.key === '7') { e.preventDefault(); navigateTo('models') }
      if (meta && e.key === '8') { e.preventDefault(); navigateTo('budget') }
      if (meta && e.key === '9') { e.preventDefault(); navigateTo('patrimoine') }
      if (meta && e.key === '0') { e.preventDefault(); navigateTo('succession') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(null), 3000)
  }

  // ── Initialisation patrimoine — bloc unique au mount initial ─────────────
  // Ordre : 1. versements périodiques en attente, 2. prix de marché (async).
  // Pas de useEffect réactif récurrent — même pattern que
  // generateRecurringTransactions() du Budget (appel explicite, une fois).
  useEffect(() => {
    if (!getActiveProfileId()) return
    const { applyVersementsEnAttente, refreshPrixMarche } = usePatrimoineStore.getState()

    const versements = applyVersementsEnAttente()
    if (versements.updated.length > 0) {
      const s = versements.nbVersements > 1 ? 's' : ''
      showToast(
        `${versements.nbVersements} versement${s} appliqué${s} — ` +
        `+${formatEur(versements.totalApplied)} sur ${versements.updated.length} actif${versements.updated.length > 1 ? 's' : ''}`
      )
    }

    refreshPrixMarche()
      .then(({ updated }) => {
        if (updated.length > 0) {
          showToast(`Prix de marché actualisés — ${updated.length} actif${updated.length > 1 ? 's' : ''}`)
        }
      })
      .catch(() => { /* hors ligne — fail silencieux, dernière valeur conservée */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function navigateTo(page: AppPage) {
    setCurrentPage(page); window.scrollTo(0, 0)
  }

  function handleRunSimulation(capDismissed = false) {
    if (isRunning) return
    setIsRunning(true)
    setTimeout(async () => {
      const sim = selectActiveSim(useStore.getState())
      const standardState = computeRunState(sim.envelopes, sim.globalParams, sim.events ?? [])
      setRunState(standardState)
      if (sim.globalParams.simulationMode === 'advanced') {
        try {
          const { results: mcResults } = await runMonteCarlo(sim.envelopes, sim.globalParams, sim.globalParams.duration)
          setRunState(prev => ({ ...prev, monteCarloResults: mcResults }))
        } catch { /* fallback silencieux */ }
      } else {
        setRunState(prev => ({ ...prev, monteCarloResults: undefined }))
      }
      setDirty(false)
      setIsRunning(false)

      // Détection enveloppes au plafond
      const caps: Record<string, number> = {}
      if (standardState.results.length > 0) {
        const last = standardState.results[standardState.results.length - 1]
        for (const [envId, envResult] of Object.entries(last.byEnvelope)) {
          if (envResult.capReachedYear !== undefined) caps[envId] = envResult.capReachedYear
        }
      }
      setCapReachedByEnvelope(caps)
      if (Object.keys(caps).length > 0 && !capDismissed) {
        setCapModalOpen(true)
      }
    }, 0)
  }

  function handleCapModalApply(choices: CapRedirectChoice[]) {
    for (const c of choices) {
      updateEnvelope(c.envelopeId, { capRedirectTo: c.capRedirectTo })
    }
    setCapModalOpen(false)
    setCapModalDismissed(true)
    handleRunSimulation(true)
  }

  function handleOnboardingComplete(data: OnboardingResult) {
    const envs = createEnvelopesFromProfile(data.riskProfile, data.monthlyInvestment)
    const investmentRate = data.monthlySalary > 0
      ? Math.round((data.monthlyInvestment / data.monthlySalary) * 100) : 20
    applyOnboarding(envs, { duration: data.duration, ageActuel: data.ageActuel, monthlyIncome: data.monthlySalary, investmentRate }, { ageRetirement: data.ageRetirement })
    const profileId = getActiveProfileId()
    if (profileId) markProfileOnboarded(profileId)
    setShowOnboarding(false)
  }

  function handleOnboardingSkip() {
    const profileId = getActiveProfileId()
    if (profileId) markProfileOnboarded(profileId)
    setShowOnboarding(false)
  }

  function handleImportFees(envelopeId: string) {
    const env = envelopes.find(e => e.id === envelopeId)
    if (!env) return
    setFeesImportTarget({ envelopeId, envelopeType: env.type, envelopeLabel: env.label })
    setDataModalOpen(true)
  }

  function handleApplyFees(fees: EnvelopeFees) {
    if (!feesImportTarget) return
    updateEnvelope(feesImportTarget.envelopeId, { fees })
    showToast(`Frais appliqués à ${feesImportTarget.envelopeLabel}`)
    setDataModalOpen(false)
    setFeesImportTarget(null)
  }

  function handleUseAsset(name: string, expectedReturn: number, envelopeId?: string) {
    const targetId = envelopeId ?? envelopes.find(e => e.active)?.id
    if (!targetId) return
    const target = envelopes.find(e => e.id === targetId)
    if (!target) return
    const newAsset: Asset = { id: `asset_${Date.now()}`, name, expectedReturn, allocation: 0 }
    updateEnvelope(targetId, { assets: [...target.assets, newAsset] })
    setDataModalOpen(false)
  }

  // Full-screen profile selector when no profile is active
  if (showProfileScreen) {
    return <ProfileScreen onProfileSelected={() => window.location.reload()} />
  }

  const profile = getActiveProfile()
  const profileName = profile?.name ?? 'Profil'
  const profileColor = profile?.color ?? '#5e6ad2'
  const profileInitials = profileName.substring(0, 2).toUpperCase()

  const { results } = runState

  return (
    <div className="app">

      {/* ── Print header ─────────────────────────────────────────────────── */}
      <div className="print-header">
        <strong>Simulation Patrimoine</strong> —{' '}
        {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>

      {/* ── Sidebar — always visible, fixed ──────────────────────────────── */}
      <aside className="sidebar no-print">

        {/* WorkspaceSwitch — avatar + name + chevron */}
        <div className="ws-switch" onClick={() => setProfileDropdownOpen(p => !p)}>
          <div
            className="avatar"
            style={{ width: 26, height: 26, background: profileColor, fontSize: 11, borderRadius: 7, flexShrink: 0 }}
          >
            {profileInitials}
          </div>
          <div className="col grow" style={{ gap: 0 }}>
            <div className="subhead" style={{ lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profileName}
            </div>
            <div className="caption" style={{ fontSize: 11 }}>Espace personnel</div>
          </div>
          <IconChevronD size={13} className="tertiary" />
        </div>

        {/* Search / Cmd+K */}
        <div className="cmdk" style={{ margin: '0 8px 6px' }} onClick={() => setPaletteOpen(true)}>
          <IconSearch size={13} />
          <span className="grow">Rechercher…</span>
          <span className="kbd">⌘K</span>
        </div>

        {/* Transverse pages — independent of any simulation */}
        <nav className="col" style={{ gap: 1, marginTop: 4 }}>
          <div
            className={`nav-item${currentPage === 'patrimoine' ? ' on' : ''}`}
            onClick={() => navigateTo('patrimoine')}
          >
            <IconPie size={16} />
            <span className="grow">Patrimoine</span>
          </div>
          <div
            className={`nav-item${currentPage === 'succession' ? ' on' : ''}`}
            onClick={() => navigateTo('succession')}
          >
            <IconGift size={16} />
            <span className="grow">Succession</span>
          </div>
          <div
            className={`nav-item${currentPage === 'finance' ? ' on' : ''}`}
            onClick={() => navigateTo('finance')}
          >
            <IconDollar size={16} />
            <span className="grow">Finance</span>
            <span className="live-dot dot" style={{ background: 'var(--success)', width: 6, height: 6 }} />
          </div>
          <div
            className={`nav-item${currentPage === 'education' ? ' on' : ''}`}
            onClick={() => navigateTo('education')}
          >
            <IconGraduate size={16} />
            <span className="grow">Éducation</span>
          </div>
          <div
            className={`nav-item${currentPage === 'brokers' ? ' on' : ''}`}
            onClick={() => navigateTo('brokers')}
          >
            <IconBank size={16} />
            <span className="grow">Courtiers</span>
          </div>
          <div
            className={`nav-item${currentPage === 'models' ? ' on' : ''}`}
            onClick={() => navigateTo('models')}
          >
            <IconSigma size={16} />
            <span className="grow">Modèles</span>
          </div>
          <div
            className={`nav-item${currentPage === 'budget' ? ' on' : ''}`}
            onClick={() => navigateTo('budget')}
          >
            <IconBudget size={16} />
            <span className="grow">Budget</span>
          </div>
        </nav>

        {/* Simulations section — divider + list with nested sub-pages for active sim */}
        <div className="simulations-section scroll" style={{ flex: 1 }}>
          <div className="divider" style={{ margin: '8px 16px' }} />
          <div className="row" style={{ padding: '0 18px 6px' }}>
            <span className="eyebrow grow">Simulations</span>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, color: 'var(--ink-tertiary)', display: 'flex' }}
              onClick={() => addSimulation()}
              title="Nouvelle simulation"
            >
              <IconPlus size={13} />
            </button>
          </div>
          <div className="col" style={{ gap: 1 }}>
            {simulations.map(sim => {
              const isActive = sim.id === activeSim.id
              return (
                <div key={sim.id}>
                  <div
                    className={`nav-item${isActive ? ' on' : ''}`}
                    onClick={() => { if (!isActive) { setActiveSimulation(sim.id); navigateTo('simulation_dashboard') } }}
                    title={`${sim.globalParams.duration} ans`}
                  >
                    <span className="dot" style={{
                      background: isActive ? 'var(--primary-hover)' : 'var(--hairline-strong)',
                      width: 6, height: 6,
                    }} />
                    <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sim.name}
                    </span>
                  </div>
                  {isActive && (
                    <div style={{
                      margin: '1px 8px 2px 20px',
                      paddingLeft: 8,
                      borderLeft: '1px solid var(--hairline-strong)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1,
                    }}>
                      <div
                        className={`nav-item${currentPage === 'simulation_dashboard' ? ' on' : ''}`}
                        style={{ margin: 0 }}
                        onClick={() => navigateTo('simulation_dashboard')}
                      >
                        <IconHome size={16} />
                        <span className="grow">Tableau de bord</span>
                      </div>
                      <div
                        className={`nav-item${currentPage === 'envelopes' ? ' on' : ''}`}
                        style={{ margin: 0 }}
                        onClick={() => navigateTo('envelopes')}
                      >
                        <IconLayers size={16} />
                        <span className="grow">Enveloppes</span>
                        {isDirty && <span className="dot" style={{ background: 'var(--primary)', width: 6, height: 6 }} />}
                      </div>
                      <div
                        className={`nav-item${currentPage === 'optimizer' ? ' on' : ''}`}
                        style={{ margin: 0 }}
                        onClick={() => navigateTo('optimizer')}
                      >
                        <IconSpark size={16} />
                        <span className="grow">Optimiseur</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </aside>

      {/* ── Main content — pushed right of the fixed sidebar ──────────────── */}
      <div className="main-content">

        {/* ── Page content ─────────────────────────────────────────────── */}
        {currentPage === 'patrimoine' && (
          <DashboardPatrimoinePage
            results={runState.results}
            envelopes={runState.envelopes}
            globalParams={runState.globalParams}
            onGoToEnvelopes={() => navigateTo('envelopes')}
            onGoToBudget={() => navigateTo('budget')}
            onGoToSuccession={() => navigateTo('succession')}
            onToast={showToast}
          />
        )}
        {currentPage === 'succession' && (
          <SuccessionPage
            results={runState.results}
            onBack={() => navigateTo('patrimoine')}
          />
        )}
        {currentPage === 'simulation_dashboard' && (
          <DashboardPage
            results={runState.results}
            envelopes={runState.envelopes}
            globalParams={runState.globalParams}
            events={runState.events}
            monteCarloResults={runState.monteCarloResults}
            simulationsCount={simulations.length}
            onOpenCompare={() => setComparePanelOpen(true)}
            onGoToEnvelopes={() => navigateTo('envelopes')}
            onGoToBudget={() => navigateTo('budget')}
            onExportCSV={() => exportToCSV(results, runState.envelopes)}
          />
        )}
        {currentPage === 'envelopes' && (
          <EnvelopesPage
            isDirty={isDirty}
            isRunning={isRunning}
            onRunSimulation={handleRunSimulation}
            onImportFees={handleImportFees}
            onAddEnvelope={() => setShowEnvelopeSelector(true)}
            onOpenData={() => navigateTo('brokers')}
            capReachedByEnvelope={Object.keys(capReachedByEnvelope).length > 0 ? capReachedByEnvelope : undefined}
            onOpenCapModal={() => setCapModalOpen(true)}
          />
        )}
        {currentPage === 'optimizer' && <PortfolioOptimizer />}
        {currentPage === 'finance' && <FinancePage />}
        {currentPage === 'education' && <EducationPage onGoToFinance={() => navigateTo('finance')} />}
        {currentPage === 'brokers' && <BrokersPage />}
        {currentPage === 'models' && <ModelsReferencePage />}
        {currentPage === 'budget' && <BudgetPage onGoToEnvelopes={() => navigateTo('envelopes')} />}
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      {paletteOpen && (
        <CommandPalette
          close={() => setPaletteOpen(false)}
          go={navigateTo}
          openOnboarding={() => { setShowOnboarding(true); setPaletteOpen(false) }}
          runSim={() => { handleRunSimulation(); setPaletteOpen(false) }}
        />
      )}

      {profileDropdownOpen && (
        <ProfileDropdown
          close={() => setProfileDropdownOpen(false)}
          onStartOnboarding={() => { setShowOnboarding(true) }}
          onRestartTour={() => { tourStore.resetAllTours(); navigateTo('envelopes') }}
          profileName={profileName}
          profileInitials={profileInitials}
          profileColor={profileColor}
        />
      )}

      {comparePanelOpen && (
        <SimulationComparePanel onClose={() => setComparePanelOpen(false)} />
      )}

      {/* DataModal as overlay (fees import from EnvelopesPage) */}
      {dataModalOpen && (
        <DataModal
          onClose={() => { setDataModalOpen(false); setFeesImportTarget(null) }}
          onUseAsset={handleUseAsset}
          activeEnvelopes={envelopes.filter(e => e.active).map(e => ({ id: e.id, label: e.label, type: e.type }))}
          feesImport={feesImportTarget ? { envelopeType: feesImportTarget.envelopeType, envelopeLabel: feesImportTarget.envelopeLabel } : undefined}
          onApplyFees={feesImportTarget ? handleApplyFees : undefined}
        />
      )}

      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
      )}

      {capModalOpen && Object.keys(capReachedByEnvelope).length > 0 && (
        <CapOverflowModal
          capReachedByEnvelope={capReachedByEnvelope}
          envelopes={envelopes}
          onApply={handleCapModalApply}
          onClose={() => { setCapModalOpen(false); setCapModalDismissed(true) }}
        />
      )}

      {showEnvelopeSelector && (
        <EnvelopeTypeSelector
          onSelect={presetKey => { addEnvelope(createEnvelopeFromPreset(presetKey)); setShowEnvelopeSelector(false) }}
          onClose={() => setShowEnvelopeSelector(false)}
        />
      )}

      {/* ── Aide contextuelle (overlay par page) ─────────────────────────── */}
      <HelpHost />

      {/* ── Tour system ──────────────────────────────────────────────────── */}
      {!tourReady && <WelcomeForm />}
      {tourReady && <TourController currentPage={currentPage} onNavigateTo={navigateTo} />}

      {toast && (
        <div className="no-print toast-enter" style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 110,
          background: 'var(--surface-2)', border: '1px solid var(--hairline-strong)',
          borderRadius: 'var(--r-lg)', padding: '10px 16px',
          fontSize: 13, color: 'var(--ink)', boxShadow: 'var(--shadow-pop)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}

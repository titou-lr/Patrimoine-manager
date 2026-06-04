import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Envelope, GlobalParams, RetirementParams, HistoryEntry, LifeEvent, Liability } from '../types'
import { getStoreKey } from '../profiles/profileService'

// Internal undo/redo snapshot — not exported, distinct from HistoryEntry in types/
interface UndoEntry {
  envelopes: Envelope[]
  globalParams: GlobalParams
}

export interface Simulation {
  id: string
  name: string
  envelopes: Envelope[]
  globalParams: GlobalParams
  retirementParams: RetirementParams
  past: UndoEntry[]
  future: UndoEntry[]
  isDirty: boolean
  lastModifiedEnvelopeId: string | null
  history: HistoryEntry[]   // real-value tracking entries (Feature 2)
  events: LifeEvent[]       // life events (Feature 4)
  liabilities: Liability[]  // passifs financiers (dettes, crédits)
}

interface StoreState {
  simulations: Simulation[]
  activeSimulationId: string

  // One-shot setup from onboarding
  applyOnboarding: (
    envelopes: Envelope[],
    globalParams: Partial<GlobalParams>,
    retirementParams: Partial<RetirementParams>
  ) => void

  // Simulation management
  addSimulation: () => void
  removeSimulation: (id: string) => void
  renameSimulation: (id: string, name: string) => void
  duplicateSimulation: (id: string) => void
  setActiveSimulation: (id: string) => void

  // Data actions (operate on active simulation)
  addEnvelope: (envelope: Envelope) => void
  updateEnvelope: (id: string, patch: Partial<Envelope>) => void
  removeEnvelope: (id: string) => void
  updateGlobalParams: (patch: Partial<GlobalParams>) => void
  updateRetirementParams: (patch: Partial<RetirementParams>) => void
  resetState: () => void
  undo: () => void
  redo: () => void

  // Dirty flag
  setDirty: (v: boolean) => void

  // Effort/contribution sync
  rebalanceEnvelopes: (mode: 'last' | 'proportional') => void

  // History entries (Feature 2 — real-value tracking)
  addHistoryEntry: (entry: HistoryEntry) => void
  removeHistoryEntry: (id: string) => void

  // Life events (Feature 4)
  addLifeEvent: (event: LifeEvent) => void
  removeLifeEvent: (id: string) => void
  updateLifeEvent: (id: string, patch: Partial<LifeEvent>) => void

  // Liabilities (Feature — bilan net)
  addLiability: (liability: Liability) => void
  updateLiability: (id: string, patch: Partial<Liability>) => void
  removeLiability: (id: string) => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Effort d'épargne mensuel total = salaire × taux / 100 */
export function getEffortTotal(sim: Pick<Simulation, 'globalParams'>): number {
  return sim.globalParams.monthlyIncome * sim.globalParams.investmentRate / 100
}

/** Toujours cohérent — les contributions sont libres, indépendantes du salaire */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isContributionCoherent(_sim: Simulation): boolean {
  return true
}

// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PARAMS: GlobalParams = {
  duration: 20,
  inflationRate: 2,
  monthlyIncome: 3000,
  investmentRate: 20,
  ageActuel: 23,
}

// effortTotal par défaut = 3000 * 20 / 100 = 600€
const DEFAULT_ENVELOPES: Envelope[] = [
  {
    id: 'livret_a',
    type: 'livret_a',
    label: 'Livret A',
    initialCapital: 5000,
    monthlyContribution: 100,
    yearlyContribution: 0,
    assets: [{ id: 'la_asset', name: 'Livret A réglementé', expectedReturn: 3, allocation: 100 }],
    taxRate: 0,
    fees: { orderFees: 0, orderFeesMin: 0, custodyFees: 0, entryFees: 0, managementFees: 0, exitFees: 0 },
    active: true,
    contributionMode: 'euros',
    contributionPercent: (100 / 600) * 100,  // ~16.67%
  },
  {
    id: 'pea',
    type: 'pea',
    label: 'PEA',
    initialCapital: 2000,
    monthlyContribution: 300,
    yearlyContribution: 0,
    assets: [
      { id: 'pea_world', name: 'ETF MSCI World', expectedReturn: 7, allocation: 70 },
      { id: 'pea_eu',    name: 'ETF Europe',     expectedReturn: 6, allocation: 30 },
    ],
    taxRate: 17.2,
    fees: { orderFees: 0.5, orderFeesMin: 0.99, custodyFees: 0, entryFees: 0, managementFees: 0, exitFees: 0 },
    active: true,
    contributionMode: 'euros',
    contributionPercent: (300 / 600) * 100,  // 50%
  },
  {
    id: 'cto',
    type: 'cto',
    label: 'CTO',
    initialCapital: 1000,
    monthlyContribution: 200,
    yearlyContribution: 0,
    assets: [
      { id: 'cto_sp500', name: 'ETF S&P500',  expectedReturn: 7.5, allocation: 60 },
      { id: 'cto_bonds', name: 'Obligations', expectedReturn: 3.5, allocation: 40 },
    ],
    taxRate: 30,
    fees: { orderFees: 0.5, orderFeesMin: 0.99, custodyFees: 0, entryFees: 0, managementFees: 0, exitFees: 0 },
    active: true,
    contributionMode: 'euros',
    contributionPercent: (200 / 600) * 100,  // 33.33%
  },
]

export const DEFAULT_RETIREMENT_PARAMS: RetirementParams = {
  ageRetirement: 55,
  monthlyExpenses: 3000,
  pensionMonthly: 800,
  withdrawalRate: 4,
  lifeExpectancy: 90,
}

const DEFAULT_SIMULATION: Simulation = {
  id: 'sim_default',
  name: 'Simulation 1',
  envelopes: DEFAULT_ENVELOPES,
  globalParams: DEFAULT_PARAMS,
  retirementParams: DEFAULT_RETIREMENT_PARAMS,
  past: [],
  future: [],
  isDirty: true,
  lastModifiedEnvelopeId: null,
  history: [],
  events: [],
  liabilities: [],
}

// ── State shape ───────────────────────────────────────────────────────────
// simulations[] — tableau de simulations indépendantes
//   Chaque Simulation a son propre historique undo/redo (past[], future[])
//   persist strip past/future avant serialisation (reset intentionnel au reload)
// activeSimulationId — pointe vers la simulation courante

/** Taille max de l'historique undo/redo par simulation */
const MAX_HISTORY_SIZE = 30

// ── Helpers ────────────────────────────────────────────────────────────────

function mapActive(
  sims: Simulation[],
  activeId: string,
  fn: (s: Simulation) => Simulation
): Simulation[] {
  return sims.map((s) => (s.id === activeId ? fn(s) : s))
}

function pushHistory(sim: Simulation): Pick<Simulation, 'past' | 'future'> {
  return {
    past: [...sim.past.slice(-(MAX_HISTORY_SIZE - 1)), { envelopes: sim.envelopes, globalParams: sim.globalParams }],
    future: [],
  }
}

/** Champs qui impactent réellement le résultat de simulation */
const SIMULATION_AFFECTING_KEYS: (keyof Envelope)[] = [
  'monthlyContribution',
  'yearlyContribution',
  'initialCapital',
  'assets',
  'active',
  'fees',
  'taxRate',
  'dividendRate',
  'maxContribution',
  'openedAt',
  'closureHorizon',
  'currentRealValue',
  'contributionFrequency',
  'reinvestDividends',
  'estimatedMonthlyDividends',
]

function patchAffectsSimulation(patch: Partial<Envelope>): boolean {
  return SIMULATION_AFFECTING_KEYS.some((k) => k in patch)
}

// ── Exported selector ──────────────────────────────────────────────────────

export function selectActiveSim(s: { simulations: Simulation[]; activeSimulationId: string }): Simulation {
  return s.simulations.find((sim) => sim.id === s.activeSimulationId) ?? s.simulations[0]
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      simulations: [DEFAULT_SIMULATION],
      activeSimulationId: DEFAULT_SIMULATION.id,

      // ── Onboarding ──

      applyOnboarding: (envelopes, globalParamsPatch, retirementParamsPatch) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => {
            const newParams = { ...sim.globalParams, ...globalParamsPatch }
            const effort = getEffortTotal({ globalParams: newParams })
            const envsWithPercent = envelopes.map((e) => ({
              ...e,
              contributionMode: (e.contributionMode ?? 'euros') as 'euros' | 'percent',
              contributionPercent: effort > 0 ? (e.monthlyContribution / effort) * 100 : 0,
            }))
            return {
              ...sim,
              envelopes: envsWithPercent,
              globalParams: newParams,
              retirementParams: { ...(sim.retirementParams ?? DEFAULT_RETIREMENT_PARAMS), ...retirementParamsPatch },
              isDirty: true,
              past: [],
              future: [],
            }
          }),
        })),

      // ── Simulation management ──

      addSimulation: () =>
        set((s) => {
          const n = s.simulations.length + 1
          const newSim: Simulation = {
            id: `sim_${Date.now()}`,
            name: `Simulation ${n}`,
            envelopes: DEFAULT_ENVELOPES,
            globalParams: DEFAULT_PARAMS,
            retirementParams: DEFAULT_RETIREMENT_PARAMS,
            past: [],
            future: [],
            isDirty: true,
            lastModifiedEnvelopeId: null,
            history: [],
            events: [],
            liabilities: [],
          }
          return { simulations: [...s.simulations, newSim], activeSimulationId: newSim.id }
        }),

      removeSimulation: (id) =>
        set((s) => {
          if (s.simulations.length <= 1) return s
          const idx = s.simulations.findIndex((sim) => sim.id === id)
          const remaining = s.simulations.filter((sim) => sim.id !== id)
          const newActiveId =
            s.activeSimulationId === id
              ? remaining[Math.max(0, idx - 1)].id
              : s.activeSimulationId
          return { simulations: remaining, activeSimulationId: newActiveId }
        }),

      renameSimulation: (id, name) =>
        set((s) => ({
          simulations: s.simulations.map((sim) => (sim.id === id ? { ...sim, name } : sim)),
        })),

      duplicateSimulation: (id) =>
        set((s) => {
          const src = s.simulations.find((sim) => sim.id === id)
          if (!src) return s
          const newSim: Simulation = {
            ...src,
            id: `sim_${Date.now()}`,
            name: `${src.name} (copie)`,
            past: [],
            future: [],
            isDirty: true,
          }
          return { simulations: [...s.simulations, newSim], activeSimulationId: newSim.id }
        }),

      setActiveSimulation: (id) => set({ activeSimulationId: id }),

      // ── Data actions on active simulation ──

      addEnvelope: (envelope) =>
        set((s) => {
          const activeSim = selectActiveSim(s)
          const effort = getEffortTotal(activeSim)
          const envWithPercent: Envelope = {
            ...envelope,
            contributionMode: envelope.contributionMode ?? 'euros',
            contributionPercent: effort > 0
              ? (envelope.monthlyContribution / effort) * 100
              : 0,
          }
          return {
            simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
              ...sim,
              ...pushHistory(sim),
              envelopes: [...sim.envelopes, envWithPercent],
              isDirty: true,
            })),
          }
        }),

      updateEnvelope: (id, patch) =>
        set((s) => {
          const activeSim = selectActiveSim(s)
          const effort = getEffortTotal(activeSim)

          // Auto-sync contributionPercent ↔ monthlyContribution
          let finalPatch = { ...patch }
          if ('monthlyContribution' in patch && !('contributionPercent' in patch)) {
            finalPatch.contributionPercent = effort > 0
              ? ((patch.monthlyContribution as number) / effort) * 100
              : 0
          } else if ('contributionPercent' in patch && !('monthlyContribution' in patch)) {
            finalPatch.monthlyContribution = Math.round(
              effort * (patch.contributionPercent as number) / 100
            )
          }

          const dirty = patchAffectsSimulation(finalPatch)
          return {
            simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
              ...sim,
              ...pushHistory(sim),
              envelopes: sim.envelopes.map((e) => (e.id === id ? { ...e, ...finalPatch } : e)),
              isDirty: dirty ? true : sim.isDirty,
              lastModifiedEnvelopeId: dirty ? id : sim.lastModifiedEnvelopeId,
            })),
          }
        }),

      removeEnvelope: (id) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            ...pushHistory(sim),
            envelopes: sim.envelopes.filter((e) => e.id !== id),
            isDirty: true,
          })),
        })),

      updateGlobalParams: (patch) =>
        set((s) => {
          const activeSim = selectActiveSim(s)
          const newParams = { ...activeSim.globalParams, ...patch }
          return {
            simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
              ...sim,
              ...pushHistory(sim),
              globalParams: newParams,
              isDirty: true,
            })),
          }
        }),

      updateRetirementParams: (patch) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            retirementParams: { ...(sim.retirementParams ?? DEFAULT_RETIREMENT_PARAMS), ...patch },
          })),
        })),

      resetState: () => {
        if (window.confirm('Réinitialiser cette simulation ? Cette action est irréversible.')) {
          set((s) => ({
            simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
              ...sim,
              envelopes: DEFAULT_ENVELOPES,
              globalParams: DEFAULT_PARAMS,
              retirementParams: DEFAULT_RETIREMENT_PARAMS,
              past: [],
              future: [],
              isDirty: true,
              lastModifiedEnvelopeId: null,
              history: [],
              events: [],
              liabilities: [],
            })),
          }))
        }
      },

      setDirty: (v) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            isDirty: v,
          })),
        })),

      undo: () =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => {
            if (sim.past.length === 0) return sim
            const prev = sim.past[sim.past.length - 1]
            return {
              ...sim,
              past: sim.past.slice(0, -1),
              future: [
                { envelopes: sim.envelopes, globalParams: sim.globalParams },
                ...sim.future.slice(0, MAX_HISTORY_SIZE - 1),
              ],
              envelopes: prev.envelopes,
              globalParams: prev.globalParams,
              isDirty: true,
            }
          }),
        })),

      redo: () =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => {
            if (sim.future.length === 0) return sim
            const next = sim.future[0]
            return {
              ...sim,
              past: [...sim.past.slice(-(MAX_HISTORY_SIZE - 1)), { envelopes: sim.envelopes, globalParams: sim.globalParams }],
              future: sim.future.slice(1),
              envelopes: next.envelopes,
              globalParams: next.globalParams,
              isDirty: true,
            }
          }),
        })),

      rebalanceEnvelopes: (mode) =>
        set((s) => {
          const activeSim = selectActiveSim(s)
          const effort = getEffortTotal(activeSim)
          const activeEnvs = activeSim.envelopes.filter((e) => e.active)

          if (mode === 'last') {
            const lastId = activeSim.lastModifiedEnvelopeId
            const lastEnv = lastId ? activeEnvs.find((e) => e.id === lastId) : null
            if (!lastEnv) return s
            const sumOthers = activeEnvs
              .filter((e) => e.id !== lastId)
              .reduce((acc, e) => acc + e.monthlyContribution, 0)
            const newMonthly = Math.max(0, effort - sumOthers)
            const newPercent = effort > 0 ? (newMonthly / effort) * 100 : 0
            return {
              simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
                ...sim,
                ...pushHistory(sim),
                envelopes: sim.envelopes.map((e) =>
                  e.id === lastId
                    ? { ...e, monthlyContribution: newMonthly, contributionPercent: newPercent }
                    : e
                ),
                isDirty: true,
              })),
            }
          }

          // proportional: scale all active envelopes so sum = effort
          const sum = activeEnvs.reduce((acc, e) => acc + e.monthlyContribution, 0)
          const scale = sum > 0 ? effort / sum : 0
          return {
            simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
              ...sim,
              ...pushHistory(sim),
              envelopes: sim.envelopes.map((e) => {
                if (!e.active) return e
                const newMonthly = Math.round(e.monthlyContribution * scale)
                return {
                  ...e,
                  monthlyContribution: newMonthly,
                  contributionPercent: effort > 0 ? (newMonthly / effort) * 100 : 0,
                }
              }),
              isDirty: true,
            })),
          }
        }),

      // ── History entries ──

      addHistoryEntry: (entry) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            history: [...(sim.history ?? []), entry],
          })),
        })),

      removeHistoryEntry: (id) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            history: (sim.history ?? []).filter((e) => e.id !== id),
          })),
        })),

      // ── Life events ──

      addLifeEvent: (event) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            events: [...(sim.events ?? []), event],
            isDirty: true,
          })),
        })),

      removeLifeEvent: (id) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            events: (sim.events ?? []).filter((e) => e.id !== id),
            isDirty: true,
          })),
        })),

      updateLifeEvent: (id, patch) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            events: (sim.events ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
            isDirty: true,
          })),
        })),

      // ── Liabilities ──

      addLiability: (liability) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            liabilities: [...(sim.liabilities ?? []), liability],
          })),
        })),

      updateLiability: (id, patch) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            liabilities: (sim.liabilities ?? []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
          })),
        })),

      removeLiability: (id) =>
        set((s) => ({
          simulations: mapActive(s.simulations, s.activeSimulationId, (sim) => ({
            ...sim,
            liabilities: (sim.liabilities ?? []).filter((l) => l.id !== id),
          })),
        })),
    }),
    {
      name: getStoreKey(),
      // Strip past/future before persisting (reset on reload is intentional)
      partialize: (state) => ({
        simulations: state.simulations.map((sim) => ({
          ...sim,
          past: [],
          future: [],
          isDirty: true,  // always start dirty after reload (results need to be re-run)
        })),
        activeSimulationId: state.activeSimulationId,
      }),
    }
  )
)

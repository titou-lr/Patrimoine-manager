/**
 * Store du module Patrimoine Réel — clé persist `patrimoine-actuel-[profileId]`.
 * Seul nouveau store de la session — porte aussi le paramétrage succession
 * (bénéficiaires + donations) pour ne pas créer de store supplémentaire.
 *
 * RÈGLE : aucune écriture croisée — ce store ne modifie jamais useStore,
 * et useStore ne modifie jamais ce store. Les liens (linkedEnvelopeId) sont
 * purement informatifs.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getActiveProfileId } from '../../profiles/profileService'
import { computePatrimoineNet, computeVersementsEnAttente } from '../engine/patrimoineEngine'
import { fetchPrixActifs } from '../engine/priceFetcher'
import type {
  PatrimoineAsset,
  PatrimoineLiability,
  PatrimoineSnapshot,
} from '../types/patrimoine'
import type { Beneficiaire, DonationHistorique } from '../succession/successionEngine'

/** Nombre maximum de snapshots conservés (FIFO) */
export const MAX_SNAPSHOTS = 120

function getStoreName(): string {
  const id = getActiveProfileId()
  return id ? `patrimoine-actuel-${id}` : 'patrimoine-actuel'
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface PatrimoineState {
  assets: PatrimoineAsset[]
  liabilities: PatrimoineLiability[]
  snapshots: PatrimoineSnapshot[]

  // Succession (Tâche 3)
  beneficiaires: Beneficiaire[]
  donations: DonationHistorique[]

  upsertAsset: (asset: Omit<PatrimoineAsset, 'id'> & { id?: string }) => void
  removeAsset: (id: string) => void
  upsertLiability: (liability: Omit<PatrimoineLiability, 'id'> & { id?: string }) => void
  removeLiability: (id: string) => void

  /**
   * Enregistre l'état complet à date dans l'historique (max 120, FIFO).
   * Jamais appelé automatiquement — uniquement sur action explicite.
   */
  takeSnapshot: () => PatrimoineSnapshot

  /**
   * Applique les versements périodiques en attente (metadata.versementPeriodique
   * actif dont prochaineDate est dépassée). Appelé UNE fois au chargement de
   * l'app (bloc d'initialisation d'App.tsx), jamais dans un useEffect réactif.
   * Ne prend PAS de snapshot — action utilisateur explicite uniquement.
   */
  applyVersementsEnAttente: () => { updated: string[]; totalApplied: number; nbVersements: number }

  /**
   * Met à jour les prix des actifs avec ticker via l'infrastructure Finance
   * (fetchPrixActifs). Appelé une fois au chargement, après
   * applyVersementsEnAttente(). Hors ligne : fail silencieux, la dernière
   * valeur connue (et lastPriceFetchAt) est conservée.
   */
  refreshPrixMarche: () => Promise<{ updated: string[] }>

  upsertBeneficiaire: (b: Omit<Beneficiaire, 'id'> & { id?: string }) => void
  removeBeneficiaire: (id: string) => void
  upsertDonation: (d: Omit<DonationHistorique, 'id'> & { id?: string }) => void
  removeDonation: (id: string) => void
}

export const usePatrimoineStore = create<PatrimoineState>()(
  persist(
    (set, get) => ({
      assets: [],
      liabilities: [],
      snapshots: [],
      beneficiaires: [],
      donations: [],

      upsertAsset: (asset) =>
        set((s) => {
          const withDefaults = {
            ...asset,
            currency: asset.currency || 'EUR',
            lastUpdatedAt: asset.lastUpdatedAt || new Date().toISOString(),
          }
          if (asset.id && s.assets.some((a) => a.id === asset.id)) {
            return {
              assets: s.assets.map((a) =>
                a.id === asset.id ? ({ ...a, ...withDefaults } as PatrimoineAsset) : a
              ),
            }
          }
          return {
            assets: [...s.assets, { ...withDefaults, id: asset.id ?? uid('pat') } as PatrimoineAsset],
          }
        }),

      removeAsset: (id) =>
        set((s) => ({ assets: s.assets.filter((a) => a.id !== id) })),

      upsertLiability: (liability) =>
        set((s) => {
          const withDefaults = {
            ...liability,
            currency: liability.currency || 'EUR',
            lastUpdatedAt: liability.lastUpdatedAt || new Date().toISOString(),
          }
          if (liability.id && s.liabilities.some((l) => l.id === liability.id)) {
            return {
              liabilities: s.liabilities.map((l) =>
                l.id === liability.id ? ({ ...l, ...withDefaults } as PatrimoineLiability) : l
              ),
            }
          }
          return {
            liabilities: [
              ...s.liabilities,
              { ...withDefaults, id: liability.id ?? uid('pas') } as PatrimoineLiability,
            ],
          }
        }),

      removeLiability: (id) =>
        set((s) => ({ liabilities: s.liabilities.filter((l) => l.id !== id) })),

      takeSnapshot: () => {
        const { assets, liabilities } = get()
        const net = computePatrimoineNet(assets, liabilities)
        const byAsset: Record<string, number> = {}
        for (const a of assets) byAsset[a.id] = a.currentValue
        const snapshot: PatrimoineSnapshot = {
          id: uid('snap'),
          date: new Date().toISOString(),
          totalActifs: net.totalActifs,
          totalPassifs: net.totalPassifs,
          patrimoineNet: net.patrimoineNet,
          byCategory: net.byCategory,
          byAsset,
        }
        set((s) => ({
          snapshots: [...s.snapshots, snapshot].slice(-MAX_SNAPSHOTS),
        }))
        return snapshot
      },

      applyVersementsEnAttente: () => {
        const now = new Date()
        const updated: string[] = []
        let totalApplied = 0
        let nbVersements = 0
        const nextAssets = get().assets.map((a) => {
          const pending = computeVersementsEnAttente(a, now)
          if (pending.nbVersements === 0) return a
          updated.push(a.id)
          totalApplied += pending.montantTotal
          nbVersements += pending.nbVersements
          return {
            ...a,
            currentValue: a.currentValue + pending.montantTotal,
            lastUpdatedAt: now.toISOString(),
            metadata: {
              ...a.metadata,
              versementPeriodique: {
                ...a.metadata!.versementPeriodique!,
                prochaineDate: pending.nouvelleProchaineDate,
              },
            },
          }
        })
        if (updated.length > 0) set({ assets: nextAssets })
        return { updated, totalApplied, nbVersements }
      },

      refreshPrixMarche: async () => {
        // fetchPrixActifs filtre lui-même : ticker requis + TTL 1h (lastPriceFetchAt)
        const prices = await fetchPrixActifs(get().assets)
        const updated: string[] = []
        const nowIso = new Date().toISOString()
        const nextAssets = get().assets.map((a) => {
          const r = prices[a.id]
          if (!r || 'erreur' in r) return a // échec silencieux — dernière valeur conservée
          updated.push(a.id)
          const quantite = Number(a.metadata?.quantite)
          const hasQuantite = Number.isFinite(quantite) && quantite > 0
          return {
            ...a,
            // ticker + quantite renseignés → currentValue calculé, sinon saisi manuellement
            currentValue: hasQuantite ? r.prix * quantite : a.currentValue,
            lastUpdatedAt: hasQuantite ? nowIso : a.lastUpdatedAt,
            metadata: {
              ...a.metadata,
              prixUnitaire: r.prix,
              lastPriceFetchAt: r.fetchedAt,
            },
          }
        })
        if (updated.length > 0) set({ assets: nextAssets })
        return { updated }
      },

      upsertBeneficiaire: (b) =>
        set((s) => {
          if (b.id && s.beneficiaires.some((x) => x.id === b.id)) {
            return {
              beneficiaires: s.beneficiaires.map((x) =>
                x.id === b.id ? ({ ...x, ...b } as Beneficiaire) : x
              ),
            }
          }
          return { beneficiaires: [...s.beneficiaires, { ...b, id: b.id ?? uid('ben') } as Beneficiaire] }
        }),

      removeBeneficiaire: (id) =>
        set((s) => ({
          beneficiaires: s.beneficiaires.filter((b) => b.id !== id),
          donations: s.donations.filter((d) => d.beneficiaireId !== id),
        })),

      upsertDonation: (d) =>
        set((s) => {
          if (d.id && s.donations.some((x) => x.id === d.id)) {
            return {
              donations: s.donations.map((x) => (x.id === d.id ? ({ ...x, ...d } as DonationHistorique) : x)),
            }
          }
          return { donations: [...s.donations, { ...d, id: d.id ?? uid('don') } as DonationHistorique] }
        }),

      removeDonation: (id) =>
        set((s) => ({ donations: s.donations.filter((d) => d.id !== id) })),
    }),
    { name: getStoreName() }
  )
)

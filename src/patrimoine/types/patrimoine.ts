/**
 * Types du module Patrimoine Réel — source de vérité du patrimoine actuel.
 * Distinct de la simulation (futur) et du budget (flux).
 */

/** Catégories d'actifs patrimoniaux */
export type PatrimoineAssetCategory =
  | 'compte_bancaire'
  | 'pea'
  | 'assurance_vie'
  | 'per'
  | 'cto'
  | 'crypto'
  | 'immobilier_principal'
  | 'immobilier_locatif'
  | 'or_metaux'
  | 'private_equity'
  | 'parts_societe'
  | 'vehicule'
  | 'art_collection'
  | 'autre_actif'

/** Catégories de passifs patrimoniaux */
export type PatrimoineLiabilityCategory =
  | 'credit_immobilier'
  | 'credit_conso'
  | 'credit_auto'
  | 'dette_fiscale'
  | 'autre_passif'

/** Fréquence d'un versement périodique automatique */
export type VersementFrequence = 'monthly' | 'quarterly' | 'annual'

/**
 * Versement périodique automatique sur un actif financier.
 * Appliqué au lancement de l'app via applyVersementsEnAttente() —
 * jamais dans un useEffect réactif récurrent.
 */
export interface VersementPeriodique {
  montant: number
  frequence: VersementFrequence
  /** Date ISO (YYYY-MM-DD) du prochain versement à appliquer */
  prochaineDate: string
  actif: boolean
}

/**
 * Champs spécifiques par catégorie, stockés librement.
 * Ex. immobilier : adresse, surface, loyerMensuel, encoursCredit,
 * dateAcquisition, valeurAcquisition. Bancaire/enveloppes : iban, etablissement.
 *
 * Champs typés (catégories financières uniquement) :
 * - versementPeriodique — versements automatiques (Tâche versements)
 * - ticker / quantite / prixUnitaire / lastPriceFetchAt — prix de marché.
 *   Si ticker + quantite sont renseignés, currentValue = prixUnitaire × quantite
 *   (calculé au fetch) ; sinon currentValue reste saisi manuellement.
 */
export interface PatrimoineMetadata {
  versementPeriodique?: VersementPeriodique | null
  /** Ticker Yahoo Finance (ex. "EWLD.PA", "BTC-EUR", "OR=F") */
  ticker?: string
  /** Prix unitaire de la dernière mise à jour réussie */
  prixUnitaire?: number
  /** Nombre d'unités détenues */
  quantite?: number
  /** Date ISO du dernier fetch de prix réussi */
  lastPriceFetchAt?: string
  [key: string]: string | number | VersementPeriodique | null | undefined
}

/** Actif détenu réellement par l'utilisateur aujourd'hui */
export interface PatrimoineAsset {
  id: string
  label: string
  category: PatrimoineAssetCategory
  /** Sous-catégorie libre (ex. "ETF World", "Studio Lyon 3e") */
  subcategory?: string
  currentValue: number
  /** Devise — défaut 'EUR' */
  currency: string
  /** Date ISO de dernière mise à jour de la valeur */
  lastUpdatedAt: string
  notes?: string
  /** Pointe vers Envelope.id de la simulation — purement informatif, jamais d'écriture croisée */
  linkedEnvelopeId?: string
  metadata?: PatrimoineMetadata
}

/** Passif (dette) détenu réellement par l'utilisateur */
export interface PatrimoineLiability {
  id: string
  label: string
  category: PatrimoineLiabilityCategory
  /** Capital restant dû */
  currentValue: number
  currency: string
  lastUpdatedAt: string
  notes?: string
  /**
   * Pointe vers BudgetCategory.id — purement informatif, aucune écriture
   * croisée automatique. Le seul pont est la proposition post-import du
   * relevé bancaire, confirmée explicitement par l'utilisateur.
   */
  linkedBudgetCategoryId?: string
  metadata?: PatrimoineMetadata
}

/** Photographie du patrimoine à une date donnée — prise sur action explicite */
export interface PatrimoineSnapshot {
  id: string
  date: string // ISO
  totalActifs: number
  totalPassifs: number
  patrimoineNet: number
  /** Totaux par catégorie (actifs positifs, passifs sous leur catégorie) */
  byCategory: Record<string, number>
  /** Valeur par actif au moment du snapshot (asset.id → currentValue) — pour les top movers */
  byAsset: Record<string, number>
}

/** Résultat agrégé du calcul de patrimoine net */
export interface PatrimoineNetResult {
  totalActifs: number
  totalPassifs: number
  patrimoineNet: number
  byCategory: Record<string, number>
  /** Totaux par enveloppe fiscale (pea / assurance_vie / per / cto / compte_bancaire / hors_enveloppe) */
  byEnvelopeFiscale: Record<string, number>
  /** (compte_bancaire + cto + crypto) / patrimoineNet — null si patrimoineNet ≤ 0 */
  liquiditeRatio: number | null
  /** totalPassifs / totalActifs — null si aucun actif */
  tauxEndettement: number | null
}

/** Point de la timeline patrimoine (construit depuis les snapshots) */
export interface PatrimoineTimelinePoint {
  date: string // ISO YYYY-MM-DD
  totalActifs: number
  totalPassifs: number
  patrimoineNet: number
}

/** Variation d'un actif entre deux snapshots (top movers) */
export interface AssetMover {
  assetId: string
  label: string
  previousValue: number
  currentValue: number
  delta: number
  deltaPct: number | null
}

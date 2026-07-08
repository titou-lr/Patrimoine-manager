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

/**
 * Champs spécifiques par catégorie, stockés librement.
 * Ex. immobilier : adresse, surface, loyerMensuel, encoursCredit,
 * dateAcquisition, valeurAcquisition. Bancaire/enveloppes : iban, etablissement.
 */
export type PatrimoineMetadata = Record<string, string | number>

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

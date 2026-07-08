/**
 * Métadonnées d'affichage des catégories du module Patrimoine Réel.
 * Source unique des libellés, groupes et couleurs — ne pas redéfinir dans les composants.
 */

import type { PatrimoineAssetCategory, PatrimoineLiabilityCategory } from '../types/patrimoine'

/** Groupes de saisie de l'onglet "Saisir mon patrimoine" */
export type AssetGroup = 'financier' | 'immobilier' | 'alternatif'

export interface AssetCategoryMeta {
  label: string
  group: AssetGroup
  color: string
  /** Catégorie comptée dans le ratio liquidités */
  liquid: boolean
  /** Catégorie mappée à une enveloppe fiscale de la simulation */
  envelopeFiscale?: 'pea' | 'assurance_vie' | 'per' | 'cto' | 'compte_bancaire'
}

export const ASSET_CATEGORY_META: Record<PatrimoineAssetCategory, AssetCategoryMeta> = {
  compte_bancaire:      { label: 'Compte bancaire',      group: 'financier',  color: '#4cb782', liquid: true,  envelopeFiscale: 'compte_bancaire' },
  pea:                  { label: 'PEA',                  group: 'financier',  color: '#5e6ad2', liquid: false, envelopeFiscale: 'pea' },
  assurance_vie:        { label: 'Assurance-vie',        group: 'financier',  color: '#828fff', liquid: false, envelopeFiscale: 'assurance_vie' },
  per:                  { label: 'PER',                  group: 'financier',  color: '#8b6bd2', liquid: false, envelopeFiscale: 'per' },
  cto:                  { label: 'CTO',                  group: 'financier',  color: '#6c8cd5', liquid: true,  envelopeFiscale: 'cto' },
  crypto:               { label: 'Crypto',               group: 'financier',  color: '#e2b550', liquid: true },
  immobilier_principal: { label: 'Résidence principale', group: 'immobilier', color: '#d2885e', liquid: false },
  immobilier_locatif:   { label: 'Immobilier locatif',   group: 'immobilier', color: '#c2703f', liquid: false },
  or_metaux:            { label: 'Or & métaux précieux', group: 'alternatif', color: '#d4af37', liquid: false },
  private_equity:       { label: 'Private equity',       group: 'alternatif', color: '#9a6bd2', liquid: false },
  parts_societe:        { label: 'Parts de société',     group: 'alternatif', color: '#62a0d2', liquid: false },
  vehicule:             { label: 'Véhicule',             group: 'alternatif', color: '#8a8f98', liquid: false },
  art_collection:       { label: 'Art & collection',     group: 'alternatif', color: '#d25e8f', liquid: false },
  autre_actif:          { label: 'Autre actif',          group: 'alternatif', color: '#62666d', liquid: false },
}

export const LIABILITY_CATEGORY_META: Record<PatrimoineLiabilityCategory, { label: string; color: string }> = {
  credit_immobilier: { label: 'Crédit immobilier', color: '#eb5757' },
  credit_conso:      { label: 'Crédit conso',      color: '#eb7857' },
  credit_auto:       { label: 'Crédit auto',       color: '#eb9a57' },
  dette_fiscale:     { label: 'Dette fiscale',     color: '#d25e5e' },
  autre_passif:      { label: 'Autre passif',      color: '#a05757' },
}

export const ASSET_GROUP_LABELS: Record<AssetGroup, string> = {
  financier:  'Actifs financiers',
  immobilier: 'Immobilier',
  alternatif: 'Actifs alternatifs',
}

/** Catégories immobilières — champs spécifiques (adresse, surface, encoursCredit…) */
export const REAL_ESTATE_CATEGORIES: PatrimoineAssetCategory[] = [
  'immobilier_principal',
  'immobilier_locatif',
]

/** Catégories bancaires/enveloppes — champs IBAN + établissement */
export const BANKING_CATEGORIES: PatrimoineAssetCategory[] = [
  'compte_bancaire', 'pea', 'assurance_vie', 'per', 'cto',
]

/**
 * Moteur Succession / Donation — fonctions pures, ZÉRO import React.
 * Droit fiscal français, barèmes 2024 hardcodés (aucune API externe).
 *
 * Références implémentées :
 *  - Abattements par lien de parenté (CGI art. 779) + rappel fiscal 15 ans
 *  - Barème en ligne directe (CGI art. 777), exonération conjoint/PACS (loi TEPA 2007)
 *  - Barèmes collatéraux (frères/sœurs 35/45 %, neveux 55 %, autres 60 %)
 *  - Assurance-vie : art. 990 I (avant 70 ans — 152 500 €/bénéf, 20 % puis 31,25 %)
 *    et art. 757 B (après 70 ans — abattement global 30 500 €)
 */

import type { PatrimoineAsset } from '../types/patrimoine'

// ── Types ────────────────────────────────────────────────────────────────────

export type LienParente =
  | 'conjoint'
  | 'enfant'
  | 'petit_enfant'
  | 'frere_soeur'
  | 'parent'
  | 'neveu_niece'
  | 'autre'

export interface Beneficiaire {
  id: string
  prenom: string
  lienParente: LienParente
  dateNaissance: string // ISO YYYY-MM-DD
  /** Fraction de la succession (0.5 = la moitié) — le total doit faire 1 */
  partSuccessorale: number
}

export interface DonationHistorique {
  id: string
  beneficiaireId: string
  montant: number
  date: string // ISO YYYY-MM-DD
  type: 'manuel' | 'assurance_vie_avant_70' | 'assurance_vie_apres_70'
}

export interface BeneficiaireResult {
  beneficiaireId: string
  prenom: string
  lienParente: LienParente
  /** Part brute de la masse successorale */
  part: number
  baseAvantAbattement: number
  abattementDisponible: number
  abattementUtilise: number
  baseImposable: number
  /** Droits de succession + prélèvement assurance-vie éventuel */
  droits: number
  /** droits / part brute (0 si part nulle) */
  tauxEffectif: number
  /** Détail assurance-vie hors succession (990 I) */
  avExonere: number
  avTaxable: number
  avPrelevement: number
}

export interface SuccessionResult {
  masseSuccessorale: number
  /** Capital assurance-vie traité hors succession (toggle avant-70 ans actif) */
  assuranceVieHorsSuccession: number
  byBeneficiaire: BeneficiaireResult[]
  totalDroits: number
  patrimoineTransmisNet: number
}

export interface ComputeSuccessionOptions {
  /** Traiter les AV comme structurées avant 70 ans (régime 990 I, hors succession) */
  includeAssuranceVieHorsSuccession: boolean
}

// ── Constantes fiscales 2024 ─────────────────────────────────────────────────

export const LIEN_LABELS: Record<LienParente, string> = {
  conjoint:     'Conjoint / PACS',
  enfant:       'Enfant',
  petit_enfant: 'Petit-enfant',
  frere_soeur:  'Frère / sœur',
  parent:       'Parent',
  neveu_niece:  'Neveu / nièce',
  autre:        'Autre (tiers)',
}

/** Fenêtre du rappel fiscal des donations (années) */
export const RAPPEL_FISCAL_YEARS = 15

/** Barème en ligne directe 2024 (enfant, petit-enfant, parent) */
const BAREME_LIGNE_DIRECTE: Array<{ upTo: number; rate: number }> = [
  { upTo: 8_072,     rate: 0.05 },
  { upTo: 12_109,    rate: 0.10 },
  { upTo: 15_932,    rate: 0.15 },
  { upTo: 552_324,   rate: 0.20 },
  { upTo: 902_838,   rate: 0.30 },
  { upTo: 1_805_677, rate: 0.40 },
  { upTo: Infinity,  rate: 0.45 },
]

/** Barème frères/sœurs 2024 */
const BAREME_FRERE_SOEUR: Array<{ upTo: number; rate: number }> = [
  { upTo: 24_430,   rate: 0.35 },
  { upTo: Infinity, rate: 0.45 },
]

// ── Calculs élémentaires ─────────────────────────────────────────────────────

/**
 * Abattement personnel par lien de parenté (rappel fiscal 15 ans à déduire).
 * `frereSoeurConditionsRemplies` : célibataire/veuf/invalide vivant sous le
 * même toit → abattement majoré 15 932 €, sinon 7 967 €.
 * Le conjoint est exonéré totalement (Infinity) — loi TEPA 2007.
 */
export function abattementParLien(
  lien: LienParente,
  frereSoeurConditionsRemplies = true
): number {
  switch (lien) {
    case 'conjoint':     return Infinity
    case 'enfant':       return 100_000
    case 'petit_enfant': return 31_865
    case 'frere_soeur':  return frereSoeurConditionsRemplies ? 15_932 : 7_967
    case 'parent':       return 100_000
    case 'neveu_niece':  return 7_967
    case 'autre':        return 1_594
  }
}

/** Droits de succession sur une base imposable donnée, selon le lien. */
export function baremeSuccession(base: number, lien: LienParente): number {
  if (base <= 0) return 0
  switch (lien) {
    case 'conjoint':
      return 0 // exonération totale entre époux/PACS
    case 'enfant':
    case 'petit_enfant':
    case 'parent':
      return applyBrackets(base, BAREME_LIGNE_DIRECTE)
    case 'frere_soeur':
      return applyBrackets(base, BAREME_FRERE_SOEUR)
    case 'neveu_niece':
      return base * 0.55
    case 'autre':
      return base * 0.60
  }
}

function applyBrackets(base: number, brackets: Array<{ upTo: number; rate: number }>): number {
  let tax = 0
  let prev = 0
  for (const b of brackets) {
    if (base <= prev) break
    const slice = Math.min(base, b.upTo) - prev
    tax += slice * b.rate
    prev = b.upTo
  }
  return tax
}

/**
 * Rappel fiscal : somme des donations de type 'manuel' des 15 dernières
 * années pour un bénéficiaire — vient réduire l'abattement disponible.
 */
export function rappelFiscalDonations(
  donations: DonationHistorique[],
  beneficiaireId: string,
  today: Date = new Date()
): number {
  const cutoff = new Date(today)
  cutoff.setFullYear(cutoff.getFullYear() - RAPPEL_FISCAL_YEARS)
  return donations
    .filter(
      (d) =>
        d.beneficiaireId === beneficiaireId &&
        d.type === 'manuel' &&
        new Date(d.date) >= cutoff
    )
    .reduce((s, d) => s + d.montant, 0)
}

/**
 * Régime assurance-vie art. 990 I (versements AVANT 70 ans), par bénéficiaire :
 * abattement 152 500 €, puis prélèvement 20 % jusqu'à 700 000 € taxables,
 * 31,25 % au-delà. Retourne les montants exonéré/taxable et le prélèvement.
 */
export function exonerationAssuranceVie(
  montant: number,
  ageSouscripteur: number
): { exonere: number; taxable: number; prelevement: number } {
  if (montant <= 0) return { exonere: 0, taxable: 0, prelevement: 0 }
  if (ageSouscripteur >= 70) {
    // Régime 757 B géré globalement dans computeSuccession (abattement 30 500 € commun)
    return { exonere: 0, taxable: montant, prelevement: 0 }
  }
  const exonere = Math.min(montant, 152_500)
  const taxable = montant - exonere
  const at20 = Math.min(taxable, 700_000)
  const at3125 = Math.max(0, taxable - 700_000)
  return { exonere, taxable, prelevement: at20 * 0.20 + at3125 * 0.3125 }
}

/** Abattement global (tous bénéficiaires confondus) — AV versements après 70 ans */
export const AV_APRES_70_ABATTEMENT_GLOBAL = 30_500

// ── Calcul complet ───────────────────────────────────────────────────────────

const AV_CATEGORIES = new Set(['assurance_vie'])

/**
 * Calcule la succession complète.
 *
 * @param patrimoineNet   Patrimoine net actuel (ou projeté) — masse de départ
 * @param assetsDetail    Détail des actifs (pour isoler l'assurance-vie)
 * @param beneficiaires   Bénéficiaires avec parts successorales (total attendu = 1)
 * @param donations       Historique des donations (rappel fiscal 15 ans)
 * @param ageDuDefunt     Âge du défunt — proxy de l'âge aux versements AV
 * @param options         Toggle AV hors succession (régime avant 70 ans)
 */
export function computeSuccession(
  patrimoineNet: number,
  assetsDetail: PatrimoineAsset[],
  beneficiaires: Beneficiaire[],
  donations: DonationHistorique[],
  ageDuDefunt: number,
  options: ComputeSuccessionOptions = { includeAssuranceVieHorsSuccession: true }
): SuccessionResult {
  const avTotal = assetsDetail
    .filter((a) => AV_CATEGORIES.has(a.category))
    .reduce((s, a) => s + (a.currentValue || 0), 0)

  const avAvant70 = options.includeAssuranceVieHorsSuccession && ageDuDefunt < 70
  const avHorsSuccession = avAvant70 ? Math.min(avTotal, Math.max(0, patrimoineNet)) : 0

  // Masse successorale civile (hors capitaux AV 990 I)
  const masseSuccessorale = Math.max(0, patrimoineNet - avHorsSuccession)

  const byBeneficiaire: BeneficiaireResult[] = beneficiaires.map((b) => {
    const part = masseSuccessorale * b.partSuccessorale

    // Abattement disponible = abattement légal - donations rappelées (15 ans)
    const abattementLegal = abattementParLien(b.lienParente)
    const rappel = rappelFiscalDonations(donations, b.id)
    const abattementDisponible =
      abattementLegal === Infinity ? Infinity : Math.max(0, abattementLegal - rappel)

    const abattementUtilise =
      abattementDisponible === Infinity ? part : Math.min(part, abattementDisponible)
    const baseImposable = Math.max(0, part - abattementUtilise)
    const droitsSuccession = baremeSuccession(baseImposable, b.lienParente)

    // Part d'assurance-vie hors succession (990 I) — conjoint exonéré (loi TEPA)
    let avExonere = 0
    let avTaxable = 0
    let avPrelevement = 0
    if (avHorsSuccession > 0) {
      const avPart = avHorsSuccession * b.partSuccessorale
      if (b.lienParente === 'conjoint') {
        avExonere = avPart
      } else {
        const r = exonerationAssuranceVie(avPart, ageDuDefunt)
        avExonere = r.exonere
        avTaxable = r.taxable
        avPrelevement = r.prelevement
      }
    }

    const droits = droitsSuccession + avPrelevement
    const totalRecu = part + (avHorsSuccession > 0 ? avHorsSuccession * b.partSuccessorale : 0)

    return {
      beneficiaireId: b.id,
      prenom: b.prenom,
      lienParente: b.lienParente,
      part: totalRecu,
      baseAvantAbattement: part,
      abattementDisponible: abattementDisponible === Infinity ? part : abattementDisponible,
      abattementUtilise,
      baseImposable,
      droits,
      tauxEffectif: totalRecu > 0 ? droits / totalRecu : 0,
      avExonere,
      avTaxable,
      avPrelevement,
    }
  })

  // AV versements après 70 ans (si le défunt a ≥ 70 ans et toggle actif) :
  // abattement global 30 500 € puis droits classiques — appliqué en réduisant
  // les droits déjà calculés serait complexe ; ici les capitaux AV restent dans
  // la masse et bénéficient de l'abattement global réparti au prorata.
  if (!avAvant70 && options.includeAssuranceVieHorsSuccession && avTotal > 0 && ageDuDefunt >= 70) {
    const totalParts = beneficiaires.reduce((s, b) => s + b.partSuccessorale, 0) || 1
    for (const r of byBeneficiaire) {
      const b = beneficiaires.find((x) => x.id === r.beneficiaireId)!
      if (b.lienParente === 'conjoint') continue
      const abattementAvPart = AV_APRES_70_ABATTEMENT_GLOBAL * (b.partSuccessorale / totalParts)
      const avPart = Math.min(avTotal * b.partSuccessorale, r.baseImposable)
      const reduction = Math.min(avPart, abattementAvPart)
      if (reduction <= 0) continue
      const nouvelleBase = Math.max(0, r.baseImposable - reduction)
      r.baseImposable = nouvelleBase
      r.droits = baremeSuccession(nouvelleBase, b.lienParente) + r.avPrelevement
      r.tauxEffectif = r.part > 0 ? r.droits / r.part : 0
    }
  }

  const totalDroits = byBeneficiaire.reduce((s, r) => s + r.droits, 0)

  return {
    masseSuccessorale,
    assuranceVieHorsSuccession: avHorsSuccession,
    byBeneficiaire,
    totalDroits,
    patrimoineTransmisNet: Math.max(0, patrimoineNet) - totalDroits,
  }
}

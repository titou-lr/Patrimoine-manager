import type { Envelope, EnvelopeType, EnvelopeFees } from '../types'
import { ZERO_FEES } from '../engine/simulation'

// ─── Définition des presets ───────────────────────────────────────────────────

export type TaxRule = 'exempt' | 'flat30' | 'pea' | 'cto' | 'av' | 'per'

export interface EnvelopePreset {
  label: string
  maxContribution: number
  taxRule: TaxRule
  defaultReturn: number
  regulated: boolean
  description: string
  plafondLabel?: string
}

export const ENVELOPE_PRESETS: Record<string, EnvelopePreset> = {
  livret_a: {
    label: 'Livret A',
    maxContribution: 22_950,
    taxRule: 'exempt',
    defaultReturn: 3.0,
    regulated: true,
    description: 'Épargne réglementée, exonéré IR et PS',
    plafondLabel: 'Plafond : 22 950 €',
  },
  ldds: {
    label: 'LDDS',
    maxContribution: 12_000,
    taxRule: 'exempt',
    defaultReturn: 3.0,
    regulated: true,
    description: 'Livret développement durable et solidaire',
  },
  lep: {
    label: 'LEP',
    maxContribution: 10_000,
    taxRule: 'exempt',
    defaultReturn: 4.0,
    regulated: true,
    description: 'Livret épargne populaire — taux le plus élevé',
  },
  livret_jeune: {
    label: 'Livret Jeune',
    maxContribution: 1_600,
    taxRule: 'exempt',
    defaultReturn: 3.0,
    regulated: true,
    description: 'Réservé aux 12-25 ans',
  },
  pel: {
    label: 'PEL',
    maxContribution: 61_200,
    taxRule: 'flat30',
    defaultReturn: 2.25,
    regulated: true,
    description: 'Plan Épargne Logement — taux garanti',
  },
  pea: {
    label: 'PEA',
    maxContribution: 150_000,
    taxRule: 'pea',
    defaultReturn: 7.0,
    regulated: false,
    description: 'Exonéré IR après 5 ans, PS 17.2%',
  },
  pea_pme: {
    label: 'PEA-PME',
    maxContribution: 225_000,
    taxRule: 'pea',
    defaultReturn: 6.5,
    regulated: false,
    description: 'PEA dédié aux PME françaises/européennes',
  },
  cto: {
    label: 'CTO',
    maxContribution: Infinity,
    taxRule: 'cto',
    defaultReturn: 7.0,
    regulated: false,
    description: 'Flat tax 30% ou barème progressif',
  },
  assurance_vie: {
    label: 'Assurance-vie',
    maxContribution: Infinity,
    taxRule: 'av',
    defaultReturn: 4.5,
    regulated: false,
    description: 'Fiscalité avantageuse après 8 ans',
  },
  per: {
    label: 'PER',
    maxContribution: Infinity,
    taxRule: 'per',
    defaultReturn: 6.0,
    regulated: false,
    description: 'Déduction fiscale versements, imposition sortie',
  },
}

// ─── Groupes pour l'UI ────────────────────────────────────────────────────────

export const PRESET_GROUPS: { label: string; keys: string[] }[] = [
  { label: 'Livrets réglementés', keys: ['livret_a', 'ldds', 'lep', 'livret_jeune', 'pel'] },
  { label: 'Enveloppes de marché', keys: ['pea', 'pea_pme', 'cto', 'assurance_vie', 'per'] },
]

// ─── Mapping preset → EnvelopeType ───────────────────────────────────────────

const PRESET_TO_TYPE: Record<string, EnvelopeType> = {
  livret_a:      'livret_a',
  ldds:          'ldds',
  lep:           'livret_a',      // exonéré, traitement fiscal identique
  livret_jeune:  'livret_jeune',
  pel:           'cto',           // flat30, pas d'équivalent exact
  pea:           'pea',
  pea_pme:       'pea',           // mêmes règles PEA
  cto:           'cto',
  assurance_vie: 'assurance_vie',
  per:           'per',
}

const TAX_RATE_BY_TYPE: Record<EnvelopeType, number> = {
  livret_a:      0,
  ldds:          0,
  livret_jeune:  0,
  pea:           17.2,
  cto:           30,
  assurance_vie: 24.7,
  per:           30,
}

const DEFAULT_FEES: Record<EnvelopeType, EnvelopeFees> = {
  livret_a:      ZERO_FEES,
  ldds:          ZERO_FEES,
  livret_jeune:  ZERO_FEES,
  pea:           { orderFees: 0.5, orderFeesMin: 0.99, custodyFees: 0, entryFees: 0, managementFees: 0, exitFees: 0 },
  cto:           { orderFees: 0.5, orderFeesMin: 0.99, custodyFees: 0, entryFees: 0, managementFees: 0, exitFees: 0 },
  assurance_vie: { orderFees: 0, orderFeesMin: 0, custodyFees: 0, entryFees: 1.5, managementFees: 0.85, exitFees: 0 },
  per:           { orderFees: 0, orderFeesMin: 0, custodyFees: 0, entryFees: 1.5, managementFees: 0.85, exitFees: 0 },
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Crée une Envelope pré-remplie depuis un preset. */
export function createEnvelopeFromPreset(presetKey: string): Envelope {
  const preset = ENVELOPE_PRESETS[presetKey]
  if (!preset) throw new Error(`Preset inconnu : ${presetKey}`)

  const type = PRESET_TO_TYPE[presetKey] ?? 'cto'
  const ts = Date.now()

  return {
    id: `env_${ts}`,
    type,
    label: preset.label,
    initialCapital: 0,
    monthlyContribution: 0,
    yearlyContribution: 0,
    assets: [{
      id: `asset_${ts}`,
      name: preset.label,
      expectedReturn: preset.defaultReturn,
      allocation: 100,
    }],
    taxRate: TAX_RATE_BY_TYPE[type] ?? 30,
    fees: { ...DEFAULT_FEES[type] },
    active: true,
    maxContribution: isFinite(preset.maxContribution) ? preset.maxContribution : undefined,
    dividendRate: 0,
  }
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

export function formatPlafond(maxCont: number): string {
  if (!isFinite(maxCont)) return 'Illimité'
  return new Intl.NumberFormat('fr-FR').format(maxCont) + ' €'
}

export const TAX_RULE_LABEL: Record<TaxRule, string> = {
  exempt: 'Exonéré d\'IR et PS',
  flat30: 'Flat tax 30%',
  pea:    'PS 17.2% après 5 ans',
  cto:    'Flat tax 30% ou barème',
  av:     'Taux réduit après 8 ans',
  per:    'TMI à la sortie',
}

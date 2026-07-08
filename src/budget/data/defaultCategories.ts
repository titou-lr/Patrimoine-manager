import type { BudgetCategory } from '../types/budget'

// Catégorie par défaut des transactions sans mot-clé reconnu (source unique de l'id)
export const UNCATEGORIZED_ID = 'var-uncategorized'

export const DEFAULT_CATEGORIES: BudgetCategory[] = [
  // ── Revenus ──────────────────────────────────────────────────────────────
  { id: 'inc-salary',    label: 'Salaire',             group: 'income',   color: '#4cb782', isSystem: true },
  { id: 'inc-freelance', label: 'Freelance / Primes',  group: 'income',   color: '#34a06e', isSystem: true },
  { id: 'inc-passive',   label: 'Revenus passifs',      group: 'income',   color: '#62b787', isSystem: true },
  { id: 'inc-other',     label: 'Autres revenus',       group: 'income',   color: '#8abfa0', isSystem: true },

  // ── Charges fixes ────────────────────────────────────────────────────────
  { id: 'fix-rent',      label: 'Loyer / Crédit immo', group: 'fixed',    color: '#5e6ad2', isSystem: true },
  { id: 'fix-insurance', label: 'Assurances',          group: 'fixed',    color: '#6c78d5', isSystem: true },
  { id: 'fix-subscr',    label: 'Abonnements',         group: 'fixed',    color: '#7a86d8', isSystem: true },
  { id: 'fix-car',       label: 'Crédit voiture',      group: 'fixed',    color: '#8894db', isSystem: true },
  { id: 'fix-other',     label: 'Autres charges fixes', group: 'fixed',   color: '#96a2de', isSystem: true },

  // ── Dépenses variables ───────────────────────────────────────────────────
  { id: UNCATEGORIZED_ID, label: 'Non catégorisé',  group: 'variable', color: '#62666d', isSystem: true },
  { id: 'var-food',      label: 'Alimentation',        group: 'variable', color: '#eb9234', isSystem: true },
  { id: 'var-resto',     label: 'Restaurants / Sorties', group: 'variable', color: '#d47c2a', isSystem: true },
  { id: 'var-transport', label: 'Transport',            group: 'variable', color: '#c06621', isSystem: true },
  { id: 'var-health',    label: 'Santé',                group: 'variable', color: '#f09d4e', isSystem: true },
  { id: 'var-clothes',   label: 'Vêtements',            group: 'variable', color: '#f5b16b', isSystem: true },
  { id: 'var-leisure',   label: 'Loisirs / Vacances',  group: 'variable', color: '#eb7575', isSystem: true },
  { id: 'var-home',      label: 'Maison / Bricolage',   group: 'variable', color: '#c96b6b', isSystem: true },
  { id: 'var-tech',      label: 'High-tech / Équipement', group: 'variable', color: '#a85f5f', isSystem: true },
  { id: 'var-other',     label: 'Autres dépenses',      group: 'variable', color: '#d4948a', isSystem: true },

  // ── Épargne ──────────────────────────────────────────────────────────────
  { id: 'sav-invest',    label: 'Investissements',      group: 'savings',  color: '#828fff', isSystem: true },
  { id: 'sav-emergency', label: 'Fonds d\'urgence',     group: 'savings',  color: '#9a9fff', isSystem: true },
  { id: 'sav-project',   label: 'Épargne projet',       group: 'savings',  color: '#b2b0ff', isSystem: true },
  { id: 'sav-other',     label: 'Autre épargne',        group: 'savings',  color: '#cac0ff', isSystem: true },
]

export const CATEGORY_GROUP_LABELS: Record<string, string> = {
  income:   'Revenus',
  fixed:    'Charges fixes',
  variable: 'Dépenses variables',
  savings:  'Épargne',
}

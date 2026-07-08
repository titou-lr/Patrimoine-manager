import type { BudgetCategory, BudgetTransaction } from '../types/budget'
import { UNCATEGORIZED_ID } from '../data/defaultCategories'

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Find the best matching category for a transaction label using keywords.
 * Longest normalized keyword wins (most specific match). If tie, first category in array wins.
 * Keywords shorter than 3 normalized characters are ignored.
 *
 * IMPORTANT: Cette fonction normalise elle-même label ET chaque keyword via normalizeText().
 * Ne jamais appeler .includes() brut ailleurs dans le code pour cette logique —
 * même si les keywords sont stockés normalisés, la double-normalisation est idempotente
 * et garantit la robustesse quelle que soit la source des données.
 */
export function matchCategoryByKeyword(
  label: string,
  categories: BudgetCategory[]
): { categoryId: string; matchedKeyword: string } | null {
  const normalizedLabel = normalizeText(label)
  let best: { categoryId: string; matchedKeyword: string; normLen: number } | null = null

  for (const cat of categories) {
    if (!cat.keywords?.length) continue
    for (const kw of cat.keywords) {
      const normKw = normalizeText(kw)
      if (normKw.length < 3) continue
      if (normalizedLabel.includes(normKw)) {
        if (!best || normKw.length > best.normLen) {
          best = { categoryId: cat.id, matchedKeyword: kw, normLen: normKw.length }
        }
      }
    }
  }

  if (!best) return null
  return { categoryId: best.categoryId, matchedKeyword: best.matchedKeyword }
}

/**
 * Re-evaluate keyword matching for a set of transactions.
 * Never touches transactions where categorySource === 'manual' (or field absent).
 */
export function applyKeywordMatching(
  transactions: BudgetTransaction[],
  categories: BudgetCategory[]
): BudgetTransaction[] {
  return transactions.map((tx) => {
    if (!tx.categorySource || tx.categorySource === 'manual') return tx
    const match = matchCategoryByKeyword(tx.label, categories)
    if (match) {
      return { ...tx, categoryId: match.categoryId, categorySource: 'keyword_match' }
    }
    return { ...tx, categoryId: UNCATEGORIZED_ID, categorySource: 'default' }
  })
}
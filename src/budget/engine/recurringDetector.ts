import type { BudgetTransaction, RecurringFrequency, RecurringRule } from '../types/budget'
import { uid } from './budgetEngine'

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[0-9]/g, '')
    .replace(/[^a-zàâäéèêëîïôùûüçœæ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function mode(values: number[]): number {
  const freq: Record<number, number> = {}
  let maxFreq = 0
  let result = values[0]
  for (const v of values) {
    freq[v] = (freq[v] ?? 0) + 1
    if (freq[v] > maxFreq) {
      maxFreq = freq[v]
      result = v
    }
  }
  return result
}

function inferFrequency(avgDays: number): RecurringFrequency | null {
  if (avgDays >= 4 && avgDays <= 10) return 'weekly'       // ±3 jours autour de 7
  if (avgDays >= 25 && avgDays <= 35) return 'monthly'     // ±5 jours autour de 30
  if (avgDays >= 80 && avgDays <= 100) return 'quarterly'  // ±10 jours autour de 90
  if (avgDays >= 350 && avgDays <= 380) return 'annual'    // ±15 jours autour de 365
  return null
}

function checkIntervalConsistency(dates: string[], freq: RecurringFrequency): boolean {
  if (dates.length < 2) return false
  const sorted = [...dates].sort()
  const gaps = sorted.slice(1).map((d, i) => daysBetween(sorted[i], d))

  const tolerance: Record<RecurringFrequency, number> = {
    weekly: 3,
    monthly: 5,
    quarterly: 10,
    annual: 15,
  }
  const expectedDays: Record<RecurringFrequency, number> = {
    weekly: 7,
    monthly: 30,
    quarterly: 90,
    annual: 365,
  }

  const tol = tolerance[freq]
  const exp = expectedDays[freq]
  return gaps.every((g) => Math.abs(g - exp) <= tol)
}

export function detectRecurringCandidates(
  transactions: BudgetTransaction[],
  minOccurrences = 3
): RecurringRule[] {
  // group by normalized label
  const groups: Record<string, BudgetTransaction[]> = {}

  for (const tx of transactions) {
    const key = normalizeLabel(tx.label)
    if (!key) continue
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }

  const candidates: RecurringRule[] = []

  for (const [, txs] of Object.entries(groups)) {
    if (txs.length < minOccurrences) continue

    // Check amount proximity (all within ±5% of the median)
    const amounts = txs.map((t) => t.amount)
    const med = median(amounts)
    const similar = txs.filter((t) => Math.abs(t.amount - med) / Math.max(med, 0.01) <= 0.05)

    if (similar.length < minOccurrences) continue

    const dates = similar.map((t) => t.date).sort()
    if (dates.length < 2) continue

    const gaps = dates.slice(1).map((d, i) => daysBetween(dates[i], d))
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length

    const freq = inferFrequency(avgGap)
    if (!freq) continue
    if (!checkIntervalConsistency(dates, freq)) continue

    // Most frequent category
    const catFreq: Record<string, number> = {}
    for (const t of similar) {
      catFreq[t.categoryId] = (catFreq[t.categoryId] ?? 0) + 1
    }
    const categoryId = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0][0]

    // Most frequent transaction type
    const typeFreq: Record<string, number> = {}
    for (const t of similar) {
      typeFreq[t.type] = (typeFreq[t.type] ?? 0) + 1
    }
    const type = (Object.entries(typeFreq).sort((a, b) => b[1] - a[1])[0][0]) as BudgetTransaction['type']

    // Day of month (mode) — only meaningful for monthly/quarterly/annual
    const daysOfMonth = similar.map((t) => new Date(t.date).getDate())
    const dayOfMonth = mode(daysOfMonth)

    candidates.push({
      id: uid(),
      label: similar[0].label,
      amount: Math.round(med * 100) / 100,
      type,
      categoryId,
      frequency: freq,
      dayOfMonth: freq !== 'weekly' ? dayOfMonth : undefined,
      active: false,
      detectedAutomatically: true,
      lastGeneratedMonth: null,
    })
  }

  return candidates
}

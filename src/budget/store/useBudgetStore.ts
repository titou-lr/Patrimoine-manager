import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getActiveProfileId } from '../../profiles/profileService'
import { DEFAULT_CATEGORIES, UNCATEGORIZED_ID } from '../data/defaultCategories'
import { computeImportHash } from '../engine/csvImport'
import { normalizeText, applyKeywordMatching } from '../engine/categoryMatcher'
import { uid, currentYearMonth } from '../engine/budgetEngine'
import type { BudgetCategory, BudgetEnvelope, BudgetTransaction, RecurringRule, SavingsGoal } from '../types/budget'

interface BudgetState {
  categories: BudgetCategory[]
  envelopes: BudgetEnvelope[]
  transactions: BudgetTransaction[]
  recurringRules: RecurringRule[]
  savingsGoals: SavingsGoal[]

  // session only — not persisted (Zustand persist serializes all fields by default,
  // but selectedMonth is intentionally reset on mount via partialize)
  selectedMonth: string       // YYYY-MM

  addTransaction: (tx: Omit<BudgetTransaction, 'id'>) => void
  updateTransaction: (id: string, patch: Partial<BudgetTransaction>) => void
  removeTransaction: (id: string) => void
  importTransactions: (candidates: Omit<BudgetTransaction, 'id'>[]) => { imported: number; duplicatesSkipped: number }

  addEnvelope: (envelope: Omit<BudgetEnvelope, 'id'>) => void
  updateEnvelope: (id: string, patch: Partial<BudgetEnvelope>) => void
  removeEnvelope: (id: string) => void

  addCategory: (category: Omit<BudgetCategory, 'id' | 'isSystem'>) => void
  removeCategory: (id: string) => void   // no-op if isSystem === true
  addKeywordToCategory: (categoryId: string, keyword: string) => { success: boolean; error?: 'duplicate' | 'too_short' }
  removeKeywordFromCategory: (categoryId: string, keyword: string) => void
  recategorizeTransactions: (scope: 'uncategorized_only' | 'all_non_manual') => { updated: number }

  upsertRecurringRule: (rule: Omit<RecurringRule, 'id'> & { id?: string }) => void
  removeRecurringRule: (id: string) => void
  generateRecurringTransactions: (month: string) => number

  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void
  updateSavingsGoal: (id: string, patch: Partial<SavingsGoal>) => void
  removeSavingsGoal: (id: string) => void

  setSelectedMonth: (month: string) => void
}

function getStoreName(): string {
  const id = getActiveProfileId()
  return id ? `patrimoine-budget-${id}` : 'patrimoine-budget'
}

function dayOfMonthDate(month: string, day: number): string {
  const [y, m] = month.split('-').map(Number)
  // Clamp to last day of month
  const lastDay = new Date(y, m, 0).getDate()
  const d = Math.min(day, lastDay)
  return `${month}-${String(d).padStart(2, '0')}`
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      envelopes: [],
      transactions: [],
      recurringRules: [],
      savingsGoals: [],
      selectedMonth: currentYearMonth(),

      addTransaction: (tx) =>
        set((s) => ({
          transactions: [...s.transactions, { ...tx, id: uid() }],
        })),

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      removeTransaction: (id) =>
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        })),

      importTransactions: (candidates) => {
        const existing = get().transactions
        // Build set of existing hashes (compute on-the-fly for all sources)
        const existingHashes = new Set<string>()
        for (const tx of existing) {
          if (tx.importHash) {
            existingHashes.add(tx.importHash)
          } else {
            // Recompute hash for transactions that don't have one (e.g. manual)
            existingHashes.add(computeImportHash(tx.date, tx.amount, tx.label))
          }
        }

        const toAdd: BudgetTransaction[] = []
        let duplicatesSkipped = 0

        for (const candidate of candidates) {
          const hash = candidate.importHash ?? computeImportHash(candidate.date, candidate.amount, candidate.label)
          if (existingHashes.has(hash)) {
            duplicatesSkipped++
          } else {
            existingHashes.add(hash)
            toAdd.push({ ...candidate, id: uid(), importHash: hash })
          }
        }

        if (toAdd.length > 0) {
          set((s) => ({ transactions: [...s.transactions, ...toAdd] }))
        }

        return { imported: toAdd.length, duplicatesSkipped }
      },

      addEnvelope: (envelope) =>
        set((s) => ({
          envelopes: [...s.envelopes, { ...envelope, id: uid() }],
        })),

      updateEnvelope: (id, patch) =>
        set((s) => ({
          envelopes: s.envelopes.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      removeEnvelope: (id) =>
        set((s) => ({
          envelopes: s.envelopes.filter((e) => e.id !== id),
        })),

      addCategory: (category) =>
        set((s) => ({
          categories: [...s.categories, { ...category, id: uid(), isSystem: false }],
        })),

      removeCategory: (id) =>
        set((s) => {
          const cat = s.categories.find((c) => c.id === id)
          if (!cat || cat.isSystem) return s  // no-op for system categories
          return { categories: s.categories.filter((c) => c.id !== id) }
        }),

      addKeywordToCategory: (categoryId, keyword) => {
        const normKw = normalizeText(keyword)
        if (normKw.length < 3) return { success: false, error: 'too_short' }

        const state = get()
        // Check if the same normalized keyword already exists on any OTHER category
        for (const cat of state.categories) {
          if (cat.id === categoryId) continue
          if ((cat.keywords ?? []).some((kw) => normalizeText(kw) === normKw)) {
            return { success: false, error: 'duplicate' }
          }
        }
        // Also check for duplicates on the target category itself
        const target = state.categories.find((c) => c.id === categoryId)
        if (!target) return { success: false, error: 'duplicate' }
        if ((target.keywords ?? []).some((kw) => normalizeText(kw) === normKw)) {
          return { success: false, error: 'duplicate' }
        }

        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === categoryId
              ? { ...c, keywords: [...(c.keywords ?? []), normKw] }
              : c
          ),
        }))
        return { success: true }
      },

      removeKeywordFromCategory: (categoryId, keyword) => {
        const normKw = normalizeText(keyword)
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === categoryId
              ? { ...c, keywords: (c.keywords ?? []).filter((kw) => normalizeText(kw) !== normKw) }
              : c
          ),
        }))
      },

      recategorizeTransactions: (scope) => {
        const { transactions, categories } = get()
        const subset =
          scope === 'uncategorized_only'
            ? transactions.filter((tx) => tx.categoryId === UNCATEGORIZED_ID)
            : transactions.filter((tx) => tx.categorySource !== 'manual' && tx.categorySource !== undefined)

        const updated = applyKeywordMatching(subset, categories)

        let count = 0
        const updatedIds = new Set(updated.map((tx) => tx.id))
        const updatedMap = new Map(updated.map((tx) => [tx.id, tx]))

        const nextTxs = transactions.map((tx) => {
          if (!updatedIds.has(tx.id)) return tx
          const next = updatedMap.get(tx.id)!
          if (next.categoryId !== tx.categoryId || next.categorySource !== tx.categorySource) count++
          return next
        })

        set({ transactions: nextTxs })
        return { updated: count }
      },

      upsertRecurringRule: (rule) =>
        set((s) => {
          if (rule.id) {
            const exists = s.recurringRules.some((r) => r.id === rule.id)
            if (exists) {
              return {
                recurringRules: s.recurringRules.map((r) =>
                  r.id === rule.id ? { ...r, ...rule, id: rule.id! } : r
                ),
              }
            }
          }
          return {
            recurringRules: [...s.recurringRules, { ...rule, id: rule.id ?? uid() }],
          }
        }),

      removeRecurringRule: (id) =>
        set((s) => ({
          recurringRules: s.recurringRules.filter((r) => r.id !== id),
        })),

      addSavingsGoal: (goal) =>
        set((s) => ({
          savingsGoals: [...s.savingsGoals, { ...goal, id: uid() }],
        })),

      updateSavingsGoal: (id, patch) =>
        set((s) => ({
          savingsGoals: s.savingsGoals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      removeSavingsGoal: (id) =>
        set((s) => ({
          savingsGoals: s.savingsGoals.filter((g) => g.id !== id),
        })),

      generateRecurringTransactions: (month) => {
        const { recurringRules } = get()
        const activeRules = recurringRules.filter(
          (r) => r.active && r.lastGeneratedMonth !== month
        )

        if (activeRules.length === 0) return 0

        const newTxs: BudgetTransaction[] = []

        for (const rule of activeRules) {
          const day = rule.dayOfMonth ?? 1
          const date = dayOfMonthDate(month, day)

          newTxs.push({
            id: uid(),
            date,
            amount: rule.amount,
            type: rule.type,
            categoryId: rule.categoryId,
            label: rule.label,
            source: 'recurring',
            recurringRuleId: rule.id,
          })
        }

        if (newTxs.length > 0) {
          set((s) => ({
            transactions: [...s.transactions, ...newTxs],
            recurringRules: s.recurringRules.map((r) =>
              activeRules.some((ar) => ar.id === r.id)
                ? { ...r, lastGeneratedMonth: month }
                : r
            ),
          }))
        }

        return newTxs.length
      },

      setSelectedMonth: (month) => {
        set({ selectedMonth: month })
        // Generate recurring transactions for the new month immediately
        // (not in a useEffect — explicit call in the handler, consistent with repo philosophy)
        get().generateRecurringTransactions(month)
      },
    }),
    {
      name: getStoreName(),
      partialize: (state) => ({
        categories: state.categories,
        envelopes: state.envelopes,
        transactions: state.transactions,
        recurringRules: state.recurringRules,
        savingsGoals: state.savingsGoals,
        // selectedMonth intentionally excluded — reset to current month on each session
      }),
    }
  )
)

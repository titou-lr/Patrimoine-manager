import type { BudgetCategory, BudgetTransaction, CsvColumnMapping } from '../types/budget'
import { matchCategoryByKeyword } from './categoryMatcher'
import { UNCATEGORIZED_ID } from '../data/defaultCategories'

export function detectDelimiter(csvText: string): ';' | ',' {
  const firstLine = csvText.split('\n')[0] ?? ''
  const semicolons = (firstLine.match(/;/g) ?? []).length
  const commas = (firstLine.match(/,/g) ?? []).length
  return semicolons >= commas ? ';' : ','
}

export function parseCsvRaw(csvText: string, delimiter: ';' | ','): string[][] {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const result: string[][] = []

  for (const line of lines) {
    if (line.trim() === '') continue
    result.push(parseCsvLine(line, delimiter))
  }

  return result
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

export function computeImportHash(date: string, amount: number, label: string): string {
  return `${date}|${amount.toFixed(2)}|${label.trim().toLowerCase()}`
}

function parseDate(raw: string, fmt: CsvColumnMapping['dateFormat']): string | null {
  const s = raw.trim()
  if (fmt === 'DD/MM/YYYY') {
    const [d, m, y] = s.split('/')
    if (!d || !m || !y) return null
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

function parseAmount(raw: string): number {
  // Replace French decimal comma and strip spaces (e.g. "1 234,56" → "1234.56")
  const cleaned = raw.trim().replace(/\s/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Core mapping function — source-agnostic (works for both CSV and XLSX rows).
 *
 * mapping.headerRowIndex controls which row is treated as the header:
 *   - All rows at index <= headerRowIndex are skipped (preamble + header)
 *   - Data rows start at headerRowIndex + 1
 *   - Pass headerRowIndex = -1 to treat all provided rows as data (backward compat)
 *
 * Pass categories to enable automatic keyword-based categorization at import time.
 * Without categories, all transactions land in 'var-uncategorized' with categorySource 'default'.
 */
export function mapRowsToTransactions(
  rows: string[][],
  mapping: CsvColumnMapping,
  categories?: BudgetCategory[]
): Omit<BudgetTransaction, 'id'>[] {
  const dataRows = rows.slice(mapping.headerRowIndex + 1)
  const results: Omit<BudgetTransaction, 'id'>[] = []

  for (const row of dataRows) {
    const rawDate = row[mapping.dateColumnIndex] ?? ''
    const rawLabel = row[mapping.labelColumnIndex] ?? ''

    const date = parseDate(rawDate, mapping.dateFormat)
    if (!date) continue

    const label = rawLabel.trim()
    if (!label) continue

    let txAmount: number
    let txType: BudgetTransaction['type']

    if (mapping.amountMode === 'debit_credit_columns') {
      const rawDebit = row[mapping.debitColumnIndex ?? 0] ?? ''
      const rawCredit = row[mapping.creditColumnIndex ?? 0] ?? ''
      const debit = parseAmount(rawDebit)
      const credit = parseAmount(rawCredit)

      if (debit !== 0) {
        txAmount = Math.abs(debit)
        txType = 'expense'
      } else if (credit !== 0) {
        txAmount = Math.abs(credit)
        txType = 'income'
      } else {
        continue // both empty or zero — skip line
      }
    } else {
      const rawAmount = row[mapping.amountColumnIndex] ?? ''
      const amount = parseAmount(rawAmount)

      if (mapping.amountMode === 'signed') {
        txAmount = Math.abs(amount)
        txType = amount < 0 ? 'expense' : 'income'
      } else {
        // absolute
        txAmount = Math.abs(amount)
        if (mapping.typeColumnIndex !== undefined) {
          const rawType = (row[mapping.typeColumnIndex] ?? '').toLowerCase()
          txType =
            rawType.includes('credit') ||
            rawType.includes('crédit') ||
            rawType.includes('revenu')
              ? 'income'
              : 'expense'
        } else {
          txType = 'expense'
        }
      }
    }

    if (txAmount === 0) continue

    const importHash = computeImportHash(date, txAmount, label)

    let categoryId = UNCATEGORIZED_ID
    let categorySource: BudgetTransaction['categorySource'] = 'default'
    if (categories?.length) {
      const match = matchCategoryByKeyword(label, categories)
      if (match) {
        categoryId = match.categoryId
        categorySource = 'keyword_match'
      }
    }

    results.push({
      date,
      amount: txAmount,
      type: txType,
      categoryId,
      categorySource,
      label,
      source: 'csv_import',
      importHash,
    })
  }

  return results
}

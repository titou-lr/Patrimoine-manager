import * as XLSX from 'xlsx'

export interface XlsxParseResult {
  rows: string[][]
  sheetNames: string[]
}

/**
 * Parse an xlsx/xls ArrayBuffer into a string[][] identical in shape to parseCsvRaw() output.
 * Uses cell.w (formatted display text) over cell.v (raw value) so bank number formatting
 * (e.g. "1 234,56" or "01/06/2026") is preserved and fed into the existing parseAmount /
 * parseDate functions without modification.
 */
export function parseXlsxRaw(
  arrayBuffer: ArrayBuffer,
  sheetIndex = 0
): XlsxParseResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetNames = workbook.SheetNames

  const targetIndex = Math.max(0, Math.min(sheetIndex, sheetNames.length - 1))
  const sheetName = sheetNames[targetIndex] ?? ''
  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet || !worksheet['!ref']) return { rows: [], sheetNames }

  const range = XLSX.utils.decode_range(worksheet['!ref'])
  const rows: string[][] = []

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = []
    let hasContent = false

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = worksheet[addr]
      let val = ''
      if (cell != null) {
        // Prefer formatted text (cell.w) to avoid SheetJS numeric coercions
        val = cell.w != null ? cell.w : String(cell.v ?? '')
        if (val !== '') hasContent = true
      }
      row.push(val)
    }

    // Skip fully empty rows (trailing blank rows after data)
    if (hasContent) rows.push(row)
  }

  return { rows, sheetNames }
}

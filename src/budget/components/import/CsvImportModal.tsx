import { useRef, useState } from 'react'
import { useBudgetStore } from '../../store/useBudgetStore'
import {
  detectDelimiter,
  parseCsvRaw,
  mapRowsToTransactions,
  computeImportHash,
} from '../../engine/csvImport'
import { parseXlsxRaw } from '../../engine/xlsxImport'
import type { CsvColumnMapping, BudgetTransaction } from '../../types/budget'

interface Props {
  onClose: () => void
}

// Steps: 1=upload, 2=sheet select (xlsx only, skipped if single sheet), 3=mapping, 4=preview
type Step = 1 | 2 | 3 | 4

const DATE_FORMATS: CsvColumnMapping['dateFormat'][] = ['DD/MM/YYYY', 'YYYY-MM-DD']
const HEADER_PREVIEW_ROWS = 8

const DEFAULT_MAPPING: CsvColumnMapping = {
  dateColumnIndex: 0,
  amountColumnIndex: 1,
  labelColumnIndex: 2,
  typeColumnIndex: undefined,
  amountMode: 'signed',
  debitColumnIndex: undefined,
  creditColumnIndex: undefined,
  dateFormat: 'DD/MM/YYYY',
  headerRowIndex: 0,
}

export default function CsvImportModal({ onClose }: Props) {
  const { importTransactions, transactions: existingTxs, categories } = useBudgetStore()

  const [step, setStep] = useState<Step>(1)
  const [rows, setRows] = useState<string[][]>([])
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState(0)
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null)
  const [fileType, setFileType] = useState<'csv' | 'xlsx'>('csv')
  const [delimiter, setDelimiter] = useState<';' | ','>(';')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [mapping, setMapping] = useState<CsvColumnMapping>(DEFAULT_MAPPING)
  const [preview, setPreview] = useState<Omit<BudgetTransaction, 'id'>[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; duplicatesSkipped: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const existingHashes = new Set<string>(
    existingTxs.map((t) => t.importHash ?? computeImportHash(t.date, t.amount, t.label))
  )

  function detectFileType(file: File): 'csv' | 'xlsx' {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    return ext === 'xlsx' || ext === 'xls' ? 'xlsx' : 'csv'
  }

  function handleFile(file: File) {
    setError(null)
    setImportResult(null)
    setMapping(DEFAULT_MAPPING)
    const type = detectFileType(file)
    setFileType(type)
    setFileName(file.name)

    if (type === 'xlsx') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer
        setRawBuffer(buffer)
        const result = parseXlsxRaw(buffer, 0)
        if (result.rows.length < 2) {
          setError('Fichier vide ou non reconnu.')
          return
        }
        setRows(result.rows)
        setSheetNames(result.sheetNames)
        setSelectedSheet(0)
        // Skip sheet selector if only one sheet
        setStep(result.sheetNames.length > 1 ? 2 : 3)
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = (e.target?.result as string) ?? ''
        const det = detectDelimiter(text)
        setDelimiter(det)
        const parsed = parseCsvRaw(text, det)
        if (parsed.length < 2) {
          setError('Fichier vide ou non reconnu.')
          return
        }
        setRows(parsed)
        setSheetNames([])
        setStep(3)
      }
      reader.readAsText(file, 'UTF-8')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function applySheetSelection() {
    if (!rawBuffer) return
    const result = parseXlsxRaw(rawBuffer, selectedSheet)
    setRows(result.rows)
    setMapping(DEFAULT_MAPPING)
    setStep(3)
  }

  function buildPreview() {
    const parsed = mapRowsToTransactions(rows, mapping, categories)
    setPreview(parsed)
    setStep(4)
  }

  function handleConfirm() {
    const result = importTransactions(preview)
    setImportResult(result)
  }

  // Column options derived from the selected header row
  const headerRow = rows[mapping.headerRowIndex] ?? []
  const colOptions = headerRow.map((h, i) => ({ label: h || `Colonne ${i + 1}`, value: i }))

  const isDuplicate = (tx: Omit<BudgetTransaction, 'id'>) => {
    const hash = tx.importHash ?? computeImportHash(tx.date, tx.amount, tx.label)
    return existingHashes.has(hash)
  }

  const dataRowCount = Math.max(0, rows.length - mapping.headerRowIndex - 1)

  // Which visual steps to show in indicator (sheet step only if multi-sheet xlsx)
  const hasSheetStep = sheetNames.length > 1
  const visualStep = hasSheetStep ? step : step <= 2 ? step : (step - 1) as 1 | 2 | 3
  const totalSteps = hasSheetStep ? 4 : 3

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(1,1,2,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="panel"
        style={{
          width: 600, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
          padding: 0, overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--hairline)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', flex: 1 }}>
            Importer un relevé bancaire
          </span>
          <StepIndicator current={visualStep} total={totalSteps} />
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 16, padding: '2px 8px' }}>×</button>
        </div>

        {/* Content */}
        <div className="scroll" style={{ flex: 1, padding: 20 }}>

          {/* Step 1 — Upload */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--ink-secondary)', margin: 0 }}>
                Importez un relevé bancaire au format <strong>CSV</strong> ou <strong>Excel (.xlsx)</strong>.
                Les exports Boursorama, Fortuneo, LCL et <strong>Crédit Agricole</strong> sont supportés.
                Aucune donnée n'est envoyée sur internet.
              </p>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed var(--hairline)',
                  borderRadius: 8, padding: '40px 20px',
                  textAlign: 'center', cursor: 'pointer',
                  color: 'var(--ink-tertiary)', fontSize: 13,
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
                Glissez un fichier ici, ou cliquez pour sélectionner
                <div style={{ fontSize: 11, color: 'var(--ink-tertiary)', marginTop: 6 }}>
                  .csv · .xlsx · .xls
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              {error && (
                <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>
              )}
            </div>
          )}

          {/* Step 2 — Sheet selector (xlsx multi-sheet only) */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--ink-secondary)', margin: 0 }}>
                Le fichier <strong>{fileName}</strong> contient {sheetNames.length} feuilles.
                Choisissez celle qui contient vos transactions :
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sheetNames.map((name, i) => (
                  <label
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                      background: selectedSheet === i ? 'var(--surface-2)' : 'transparent',
                      border: `1.5px solid ${selectedSheet === i ? 'var(--primary)' : 'var(--hairline)'}`,
                      fontSize: 13, color: 'var(--ink)',
                    }}
                  >
                    <input
                      type="radio"
                      name="sheet"
                      value={i}
                      checked={selectedSheet === i}
                      onChange={() => setSelectedSheet(i)}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    {name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Column mapping + header row selector */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--ink-secondary)', margin: 0 }}>
                Fichier : <strong>{fileName}</strong>
                {fileType === 'csv' && <> — délimiteur « {delimiter} »</>}
                {' '}— <strong>{dataRowCount}</strong> ligne(s) de données
              </p>

              {/* Header row selector */}
              <div>
                <label style={{
                  fontSize: 11, color: 'var(--ink-tertiary)', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6,
                }}>
                  Ligne d'en-tête (cliquez sur la ligne qui contient les titres de colonnes)
                </label>
                <div style={{
                  border: '1px solid var(--hairline)', borderRadius: 6, overflow: 'hidden',
                  fontSize: 11, fontFamily: 'var(--font-mono)',
                }}>
                  {rows.slice(0, HEADER_PREVIEW_ROWS).map((row, ri) => {
                    const isHeader = ri === mapping.headerRowIndex
                    return (
                      <div
                        key={ri}
                        onClick={() => setMapping({ ...mapping, headerRowIndex: ri })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '5px 10px', cursor: 'pointer',
                          background: isHeader ? 'var(--primary)' : ri % 2 === 0 ? 'var(--surface-2)' : 'transparent',
                          color: isHeader ? '#fff' : 'var(--ink-secondary)',
                          borderBottom: ri < Math.min(rows.length, HEADER_PREVIEW_ROWS) - 1 ? '1px solid var(--hairline)' : undefined,
                          transition: 'background 0.1s',
                        }}
                      >
                        <span style={{
                          minWidth: 18, fontSize: 10, fontWeight: 700,
                          color: isHeader ? 'rgba(255,255,255,0.7)' : 'var(--ink-tertiary)',
                        }}>
                          {ri}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {row.slice(0, 6).join(' · ')}
                        </span>
                        {isHeader && (
                          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', opacity: 0.8 }}>
                            EN-TÊTE
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Column selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Colonne date">
                  <ColSelect value={mapping.dateColumnIndex} options={colOptions}
                    onChange={(v) => setMapping({ ...mapping, dateColumnIndex: v })} />
                </Field>

                <Field label="Format de date">
                  <select
                    className="btn btn-ghost btn-sm"
                    value={mapping.dateFormat}
                    onChange={(e) => setMapping({ ...mapping, dateFormat: e.target.value as CsvColumnMapping['dateFormat'] })}
                    style={{ width: '100%', fontFamily: 'inherit' }}
                  >
                    {DATE_FORMATS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Colonne libellé">
                  <ColSelect value={mapping.labelColumnIndex} options={colOptions}
                    onChange={(v) => setMapping({ ...mapping, labelColumnIndex: v })} />
                </Field>
              </div>

              {/* Amount mode selector */}
              <Field label="Format du montant">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([
                    { mode: 'signed', label: 'Signé (±)' },
                    { mode: 'absolute', label: 'Absolu + type' },
                    { mode: 'debit_credit_columns', label: 'Débit / Crédit séparés' },
                  ] as const).map(({ mode, label }) => (
                    <button
                      key={mode}
                      className={`btn btn-sm ${mapping.amountMode === mode ? '' : 'btn-ghost'}`}
                      onClick={() => setMapping({ ...mapping, amountMode: mode })}
                      style={{ fontSize: 12 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Conditional column selectors based on amount mode */}
              {mapping.amountMode === 'signed' && (
                <Field label="Colonne montant (valeur signée)">
                  <ColSelect value={mapping.amountColumnIndex} options={colOptions}
                    onChange={(v) => setMapping({ ...mapping, amountColumnIndex: v })} />
                </Field>
              )}

              {mapping.amountMode === 'absolute' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Colonne montant">
                    <ColSelect value={mapping.amountColumnIndex} options={colOptions}
                      onChange={(v) => setMapping({ ...mapping, amountColumnIndex: v })} />
                  </Field>
                  <Field label="Colonne type (crédit/débit)">
                    <select
                      className="btn btn-ghost btn-sm"
                      value={mapping.typeColumnIndex ?? ''}
                      onChange={(e) => setMapping({
                        ...mapping,
                        typeColumnIndex: e.target.value !== '' ? Number(e.target.value) : undefined,
                      })}
                      style={{ width: '100%', fontFamily: 'inherit' }}
                    >
                      <option value="">— aucune —</option>
                      {colOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {mapping.amountMode === 'debit_credit_columns' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Colonne Débit (dépenses)">
                    <ColSelect
                      value={mapping.debitColumnIndex ?? 0}
                      options={colOptions}
                      onChange={(v) => setMapping({ ...mapping, debitColumnIndex: v })}
                    />
                  </Field>
                  <Field label="Colonne Crédit (revenus)">
                    <ColSelect
                      value={mapping.creditColumnIndex ?? 1}
                      options={colOptions}
                      onChange={(v) => setMapping({ ...mapping, creditColumnIndex: v })}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Preview + confirm */}
          {step === 4 && !importResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--ink-secondary)', margin: 0 }}>
                {preview.length} transaction(s) parsée(s) —{' '}
                <span style={{ color: 'var(--ink-tertiary)' }}>
                  {preview.filter(isDuplicate).length} doublon(s) grisé(s) seront ignorés
                </span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 340, overflowY: 'auto' }}>
                {preview.map((tx, i) => {
                  const dup = isDuplicate(tx)
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex', gap: 10, padding: '6px 10px',
                        borderRadius: 6,
                        background: dup ? 'transparent' : 'var(--surface-2)',
                        opacity: dup ? 0.4 : 1,
                        fontSize: 12, alignItems: 'center',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-tertiary)', minWidth: 86 }}>
                        {tx.date}
                      </span>
                      <span style={{ flex: 1, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.label}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 600, minWidth: 70, textAlign: 'right',
                        color: tx.type === 'income' ? 'var(--success)' : 'var(--ink)',
                      }}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                      </span>
                      {dup && (
                        <span style={{ fontSize: 10, color: 'var(--ink-tertiary)', minWidth: 60 }}>doublon</span>
                      )}
                    </div>
                  )
                })}
                {preview.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', textAlign: 'center', padding: '20px 0' }}>
                    Aucune transaction valide détectée. Vérifiez le mapping de colonnes et la ligne d'en-tête.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import result */}
          {step === 4 && importResult && (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
              <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', margin: '0 0 6px' }}>
                {importResult.imported} transaction(s) importée(s)
              </p>
              {importResult.duplicatesSkipped > 0 && (
                <p style={{ fontSize: 13, color: 'var(--ink-tertiary)', margin: 0 }}>
                  {importResult.duplicatesSkipped} doublon(s) ignoré(s)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--hairline)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          {step === 4 && importResult ? (
            <button className="btn btn-sm" onClick={onClose}>Fermer</button>
          ) : (
            <>
              {step > 1 && !importResult && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (step === 3 && hasSheetStep) setStep(2)
                    else if (step === 4) setStep(3)
                    else setStep((s) => Math.max(1, s - 1) as Step)
                  }}
                >
                  Retour
                </button>
              )}
              {step === 1 && (
                <button className="btn btn-ghost btn-sm" onClick={onClose}>Annuler</button>
              )}
              {step === 2 && (
                <button className="btn btn-sm" onClick={applySheetSelection}>
                  Utiliser cette feuille →
                </button>
              )}
              {step === 3 && (
                <button className="btn btn-sm" onClick={buildPreview}>
                  Aperçu →
                </button>
              )}
              {step === 4 && !importResult && (
                <button
                  className="btn btn-sm"
                  disabled={preview.filter((t) => !isDuplicate(t)).length === 0}
                  onClick={handleConfirm}
                >
                  Importer {preview.filter((t) => !isDuplicate(t)).length} transaction(s)
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
        <div
          key={n}
          style={{
            width: 20, height: 20, borderRadius: '50%',
            background: n === current ? 'var(--primary)' : n < current ? 'var(--success)' : 'var(--surface-2)',
            color: n <= current ? 'white' : 'var(--ink-tertiary)',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {n < current ? '✓' : n}
        </div>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--ink-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function ColSelect({
  value,
  options,
  onChange,
}: {
  value: number
  options: { label: string; value: number }[]
  onChange: (v: number) => void
}) {
  return (
    <select
      className="btn btn-ghost btn-sm"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', fontFamily: 'inherit' }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

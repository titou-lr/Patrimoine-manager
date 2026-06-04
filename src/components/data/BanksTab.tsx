import { useState } from 'react'
import staticBanksRaw from '../../data/banks.json'
import BankCard from './BankCard'
import BankCompareOverlay from './BankCompareOverlay'
import type { Bank, BankType } from '../../types/data'
import type { EnvelopeFees, EnvelopeType } from '../../types'

const allBanks = staticBanksRaw as Bank[]

const TYPE_FILTERS: { value: BankType | 'all'; label: string }[] = [
  { value: 'all',                   label: 'Tous' },
  { value: 'banque-en-ligne',       label: 'En ligne' },
  { value: 'courtier',              label: 'Courtier' },
  { value: 'banque-traditionnelle', label: 'Traditionnel' },
]

type EnvKey = 'pea' | 'cto' | 'assurance_vie' | 'per'

function toEnvKey(type: EnvelopeType): EnvKey | null {
  if (type === 'pea' || type === 'cto' || type === 'assurance_vie' || type === 'per') return type
  return null
}

interface Props {
  feesImport?: { envelopeType: EnvelopeType; envelopeLabel: string }
  onApplyFees?: (fees: EnvelopeFees) => void
}

export default function BanksTab({ feesImport, onApplyFees }: Props) {
  const [filterType, setFilterType] = useState<BankType | 'all'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)

  const targetEnvKey = feesImport ? toEnvKey(feesImport.envelopeType) : null

  const byType = filterType === 'all' ? allBanks : allBanks.filter((b) => b.type === filterType)
  const filtered = targetEnvKey
    ? byType.filter((b) => b.envelopes[targetEnvKey]?.available)
    : byType

  function handleToggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 3
          ? [...prev, id]
          : prev
    )
  }

  return (
    <div className="h-full flex flex-col">

      {/* Bandeau mode import frais */}
      {feesImport && (
        <div className="shrink-0 px-6 py-2 bg-orange/10 border-b border-orange/20 flex items-center gap-2 text-[11px] text-orange">
          <span>Sélectionnez une banque pour importer ses frais dans</span>
          <span className="font-semibold">{feesImport.envelopeLabel}</span>
        </div>
      )}

      {/* Filtres */}
      <div className="shrink-0 px-6 py-3 border-b border-border flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                filterType === f.value
                  ? 'bg-purple/10 text-purple border border-purple/20'
                  : 'bg-card border border-border text-muted hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {!feesImport && (
          <div className="ml-auto flex items-center gap-2">
            {selectedIds.length > 0 && selectedIds.length < 2 && (
              <span className="text-[11px] text-muted/60 hidden sm:inline">
                Sélectionnez encore {2 - selectedIds.length} pour comparer
              </span>
            )}
            {selectedIds.length >= 2 && (
              <button
                onClick={() => setShowCompare(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple/10 text-purple border border-purple/20 hover:bg-purple/20 transition-colors"
              >
                Comparer ({selectedIds.length})
              </button>
            )}
            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
        )}
      </div>

      {/* Grille de cartes */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((bank) => (
            <BankCard
              key={bank.id}
              bank={bank}
              selected={selectedIds.includes(bank.id)}
              canSelect={selectedIds.length < 3 || selectedIds.includes(bank.id)}
              onToggleSelect={() => handleToggle(bank.id)}
              defaultEnvTab={targetEnvKey ?? undefined}
              onApplyFees={targetEnvKey && onApplyFees ? onApplyFees : undefined}
            />
          ))}
        </div>
      </div>

      {showCompare && (
        <BankCompareOverlay
          banks={allBanks.filter((b) => selectedIds.includes(b.id))}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  )
}

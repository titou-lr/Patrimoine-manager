import { useState } from 'react'
import type { Bank, EnvelopeInfo } from '../../types/data'
import type { EnvelopeFees } from '../../types'

interface Props {
  bank: Bank
  selected: boolean
  canSelect: boolean
  onToggleSelect: () => void
  onApplyFees?: (fees: EnvelopeFees) => void
  defaultEnvTab?: EnvKey
  isCustom?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

type EnvKey = 'pea' | 'cto' | 'assurance_vie' | 'per'

const ENV_TABS: { key: EnvKey; label: string }[] = [
  { key: 'pea',           label: 'PEA' },
  { key: 'cto',           label: 'CTO' },
  { key: 'assurance_vie', label: 'AV' },
  { key: 'per',           label: 'PER' },
]

const TYPE_LABELS: Record<string, string> = {
  'banque-en-ligne':       'En ligne',
  'courtier':              'Courtier',
  'banque-traditionnelle': 'Traditionnel',
}

export default function BankCard({ bank, selected, canSelect, onToggleSelect, onApplyFees, defaultEnvTab, isCustom, onEdit, onDelete }: Props) {
  const [activeEnv, setActiveEnv] = useState<EnvKey>(defaultEnvTab ?? 'pea')

  const envData = bank.envelopes[activeEnv]

  return (
    <div
      className={`rounded-2xl border bg-surface p-5 flex flex-col gap-3 transition-all ${
        selected ? 'border-orange/40 ring-1 ring-orange/10' : 'border-border'
      }`}
    >
      {/* En-tête banque */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm text-foreground">{bank.name}</span>
            {isCustom && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-purple/10 text-purple border border-purple/20">
                perso
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted mt-0.5">{TYPE_LABELS[bank.type] ?? bank.type}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <StarRating rating={bank.rating} />
          <span className="text-[10px] text-muted font-mono">{bank.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Mini-tabs enveloppes */}
      <div>
        <div className="flex gap-0.5 mb-2">
          {ENV_TABS.map((tab) => {
            const avail = bank.envelopes[tab.key].available
            return (
              <button
                key={tab.key}
                onClick={() => setActiveEnv(tab.key)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  !avail ? 'opacity-30' : ''
                } ${
                  activeEnv === tab.key
                    ? 'bg-purple/10 text-purple border border-purple/20'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="bg-elevated rounded-xl px-3 py-2 text-[11px] min-h-[56px]">
          <EnvDetails env={envData} />
        </div>
      </div>

      {/* Pros / Cons */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="flex flex-col gap-0.5">
          {bank.pros.slice(0, 2).map((p) => (
            <div key={p} className="flex gap-1 text-success/80">
              <span className="shrink-0">+</span><span className="truncate">{p}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          {bank.cons.slice(0, 2).map((c) => (
            <div key={c} className="flex gap-1 text-danger/80">
              <span className="shrink-0">−</span><span className="truncate">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit / delete pour courtiers personnalisés (hors mode import) */}
      {isCustom && !onApplyFees && (
        <div className="flex gap-1.5">
          <button
            onClick={onEdit}
            className="flex-1 py-1.5 rounded-xl border border-border text-[10px] text-muted hover:text-foreground hover:border-purple/40 transition-colors"
          >
            Modifier
          </button>
          <button
            onClick={onDelete}
            className="flex-1 py-1.5 rounded-xl border border-border text-[10px] text-danger/60 hover:text-danger hover:border-danger/40 transition-colors"
          >
            Supprimer
          </button>
        </div>
      )}

      {onApplyFees ? (
        <button
          onClick={() => {
            const env = bank.envelopes[activeEnv]
            if (!env.available) return
            onApplyFees({
              orderFees:      env.orderFees ?? 0,
              orderFeesMin:   env.minOrder ?? 0,
              custodyFees:    env.custodyFees ?? 0,
              entryFees:      env.entryFees ?? 0,
              managementFees: env.managementFees ?? 0,
              exitFees: 0,
            })
          }}
          disabled={!bank.envelopes[activeEnv].available}
          className="mt-auto w-full py-2 rounded-xl border text-xs font-medium border-orange/40 text-orange hover:bg-orange/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Appliquer ces frais
        </button>
      ) : (
        <button
          onClick={onToggleSelect}
          disabled={!canSelect && !selected}
          className={`mt-auto w-full py-2 rounded-xl border text-xs font-medium transition-colors ${
            selected
              ? 'border-orange text-orange bg-orange/5'
              : 'border-border text-muted hover:border-orange/40 hover:text-foreground'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {selected ? '✓ Sélectionné' : 'Sélectionner pour comparer'}
        </button>
      )}
    </div>
  )
}

function EnvDetails({ env }: { env: EnvelopeInfo }) {
  if (!env.available) {
    return <span className="text-muted/40 italic">Non disponible</span>
  }

  const lines: string[] = []
  if (env.fees !== undefined)           lines.push(`Frais : ${env.fees} %`)
  if (env.orderFees !== undefined)      lines.push(`Courtage : ${env.orderFees} %`)
  if (env.custodyFees !== undefined && env.custodyFees > 0)
                                        lines.push(`Garde : ${env.custodyFees} %/an`)
  if (env.entryFees !== undefined)      lines.push(`Entrée : ${env.entryFees} %`)
  if (env.managementFees !== undefined) lines.push(`Gestion : ${env.managementFees} %/an`)
  if (env.arbitrageFees !== undefined && env.arbitrageFees > 0)
                                        lines.push(`Arbitrage : ${env.arbitrageFees} %`)

  return (
    <div className="flex flex-col gap-0.5">
      {lines.map((line) => (
        <div key={line} className="text-muted/80">{line}</div>
      ))}
      {lines.length === 0 && (
        <div className="text-success">✓ Disponible — 0 frais</div>
      )}
      {env.notes && (
        <div className="text-muted/50 italic mt-0.5 text-[10px]">{env.notes}</div>
      )}
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 1l.9 2.8H8.6L6.2 5.5l.9 2.8L5 6.6l-2.1 1.7.9-2.8L1.4 3.8H4.1L5 1z"
            fill={i < full ? '#2563EB' : 'none'}
            stroke={i < full ? '#2563EB' : '#3A3E48'}
            strokeWidth="0.6"
          />
        </svg>
      ))}
    </div>
  )
}

import { useState } from 'react'
import { useStore } from '../../store/useStore'
import AllocationRow from './AllocationRow'
import NumberInput from '../ui/NumberInput'
import { ZERO_FEES } from '../../engine/simulation'
import type { Asset, Envelope, EnvelopeFees } from '../../types'

const ALLOCATION_EPSILON = 0.01

interface Props {
  envelope: Envelope
  onImportFees?: () => void
}

export default function EnvelopeAssetsFees({ envelope, onImportFees }: Props) {
  const { updateEnvelope } = useStore()
  const [feesOpen, setFeesOpen] = useState(false)

  const fees = envelope.fees ?? ZERO_FEES
  const isLivret = ['livret_a', 'ldds', 'livret_jeune'].includes(envelope.type)
  const isOrderBased = ['pea', 'cto'].includes(envelope.type)
  const isManagedFees = ['assurance_vie', 'per'].includes(envelope.type)

  const allocationSum = envelope.assets.reduce((s, a) => s + a.allocation, 0)
  const allocationValid = Math.abs(allocationSum - 100) < ALLOCATION_EPSILON

  function handleUpdateAsset(assetId: string, patch: Partial<Asset>) {
    updateEnvelope(envelope.id, {
      assets: envelope.assets.map((a) => (a.id === assetId ? { ...a, ...patch } : a)),
    })
  }

  function handleFeePatch(patch: Partial<EnvelopeFees>) {
    updateEnvelope(envelope.id, { fees: { ...fees, ...patch } })
  }

  return (
    <>
      {/* Actifs */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-muted uppercase tracking-widest">Actifs</span>
          {!allocationValid
            ? <span className="text-[10px] text-orange font-mono">⚠ {allocationSum.toFixed(0)} % / 100 %</span>
            : <span className="text-[10px] text-success">✓ 100 %</span>
          }
        </div>
        <div className="flex flex-col gap-1.5">
          {envelope.assets.map((asset) => (
            <AllocationRow
              key={asset.id} asset={asset} totalAllocation={allocationSum}
              onUpdate={(patch) => handleUpdateAsset(asset.id, patch)}
              onRemove={() => updateEnvelope(envelope.id, { assets: envelope.assets.filter((a) => a.id !== asset.id) })}
            />
          ))}
        </div>
        <button
          onClick={() => updateEnvelope(envelope.id, {
            assets: [...envelope.assets, { id: `asset_${Date.now()}`, name: 'Nouvel actif', expectedReturn: 5, allocation: 0 }],
          })}
          className="mt-2 w-full text-[10px] text-muted border border-dashed border-border rounded-lg py-1.5 hover:border-purple/50 hover:text-foreground"
        >
          + Ajouter un actif
        </button>
      </div>

      {/* Frais */}
      <div className="border-t border-border/40 pt-2">
        <button
          onClick={() => setFeesOpen(!feesOpen)}
          className="flex items-center gap-1.5 w-full text-left text-[10px] text-muted hover:text-foreground uppercase tracking-widest py-1"
        >
          <span>Frais</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`ml-auto transition-transform duration-150 ${feesOpen ? 'rotate-180' : ''}`}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        {feesOpen && (
          <div className="mt-2 flex flex-col gap-2">
            {isLivret && <div className="text-[11px] text-success">✓ Aucun frais réglementé</div>}
            {isOrderBased && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted">Frais de courtage</span>
                  <NumberInput value={fees.orderFees} suffix="%" size="md" onChange={(v) => handleFeePatch({ orderFees: v })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted">Minimum par ordre</span>
                  <NumberInput value={fees.orderFeesMin} suffix="€" size="md" onChange={(v) => handleFeePatch({ orderFeesMin: v })} />
                </label>
              </div>
            )}
            {isManagedFees && (
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted">Frais d'entrée</span>
                  <NumberInput value={fees.entryFees} suffix="%" size="md" onChange={(v) => handleFeePatch({ entryFees: v })} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted">Frais de gestion</span>
                  <NumberInput value={fees.managementFees} suffix="%/an" size="md" onChange={(v) => handleFeePatch({ managementFees: v })} />
                </label>
              </div>
            )}
            {!isLivret && onImportFees && (
              <button onClick={onImportFees} className="text-[10px] text-purple/70 hover:text-purple text-left">
                Importer depuis une banque →
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}

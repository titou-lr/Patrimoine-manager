import type { Asset } from '../../types'
import NumberInput from '../ui/NumberInput'

interface Props {
  asset: Asset
  totalAllocation: number
  onUpdate: (patch: Partial<Asset>) => void
  onRemove: () => void
}

/** Tolérance pour valider que la somme des allocations ≈ 100% */
const ALLOCATION_EPSILON = 0.01

export default function AllocationRow({ asset, totalAllocation, onUpdate, onRemove }: Props) {
  const sumWarning = Math.abs(totalAllocation - 100) > ALLOCATION_EPSILON

  return (
    <div className="flex items-center gap-2 bg-elevated rounded-lg py-2 px-3">
      <input
        type="text"
        value={asset.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="flex-1 min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted focus:outline-none"
        placeholder="Nom de l'actif"
      />

      <span className="text-[10px] text-muted shrink-0">Rend.</span>
      <NumberInput
        value={asset.expectedReturn}
        onChange={(v) => onUpdate({ expectedReturn: v })}
        min={0}
        max={20}
        step={0.1}
        suffix="%"
        size="sm"
        className="w-16 shrink-0"
      />

      <NumberInput
        value={asset.allocation}
        onChange={(v) => onUpdate({ allocation: v })}
        min={0}
        max={100}
        suffix="%"
        size="sm"
        isWarning={sumWarning}
        className="w-14 shrink-0"
      />

      <button
        onClick={onRemove}
        className="text-muted hover:text-danger text-xs shrink-0 w-5 text-center"
        title="Supprimer"
      >
        ✕
      </button>
    </div>
  )
}

import { useState } from 'react'
import { useStore } from '../../store/useStore'

export default function SimulationTabs() {
  const {
    simulations,
    activeSimulationId,
    setActiveSimulation,
    duplicateSimulation,
    removeSimulation,
    renameSimulation,
  } = useStore()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState('')

  function handleDoubleClick(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation()
    setEditingId(id)
    setNameDraft(name)
  }

  function handleNameBlur(id: string) {
    const trimmed = nameDraft.trim()
    if (trimmed) renameSimulation(id, trimmed)
    setEditingId(null)
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') setEditingId(null)
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (simulations.length <= 1) return
    if (window.confirm('Supprimer cette simulation ?')) removeSimulation(id)
  }

  return (
    <div
      className="border-b border-border bg-card flex items-center shrink-0 no-print overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}
    >
      {/* Tabs */}
      <div className="flex items-center min-w-0">
        {simulations.map((sim) => {
          const isActive = sim.id === activeSimulationId
          return (
            <div
              key={sim.id}
              onClick={() => setActiveSimulation(sim.id)}
              className={`
                relative flex items-center gap-1.5 px-4 py-2.5 shrink-0 cursor-pointer
                border-b-2 transition-all duration-200 select-none
                ${isActive
                  ? 'border-orange text-foreground bg-base/40'
                  : 'border-transparent text-muted hover:text-foreground hover:bg-base/20'
                }
              `}
            >
              {editingId === sim.id ? (
                <input
                  autoFocus
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={() => handleNameBlur(sim.id)}
                  onKeyDown={handleNameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-b border-purple text-sm focus:outline-none w-32"
                />
              ) : (
                <span
                  className="text-sm font-medium"
                  onDoubleClick={(e) => handleDoubleClick(e, sim.id, sim.name)}
                  title="Double-clic pour renommer"
                >
                  {sim.name}
                </span>
              )}

              {simulations.length > 1 && (
                <button
                  onClick={(e) => handleRemove(e, sim.id)}
                  className="text-muted/30 hover:text-danger transition-colors text-[10px] w-3.5 h-3.5 flex items-center justify-center rounded shrink-0"
                  title="Supprimer cette simulation"
                >
                  ✕
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add button */}
      <button
        onClick={() => duplicateSimulation(activeSimulationId)}
        className="ml-1 shrink-0 px-3 py-2 text-muted hover:text-foreground transition-colors text-base leading-none"
        title="Nouvelle simulation (copie de l'active)"
      >
        ＋
      </button>
    </div>
  )
}

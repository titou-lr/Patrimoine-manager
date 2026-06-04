import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'

export default function SimulationDropdown() {
  const {
    simulations,
    activeSimulationId,
    setActiveSimulation,
    duplicateSimulation,
    removeSimulation,
    renameSimulation,
  } = useStore()

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const activeSim = simulations.find((s) => s.id === activeSimulationId)

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function startEdit(id: string, name: string) {
    setEditingId(id)
    setDraft(name)
  }

  function commitEdit(id: string) {
    const trimmed = draft.trim()
    if (trimmed) renameSimulation(id, trimmed)
    setEditingId(null)
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (simulations.length <= 1) return
    if (window.confirm('Supprimer cette simulation ?')) removeSimulation(id)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-elevated border border-border text-sm font-medium text-foreground hover:border-border-mid"
      >
        <span className="max-w-32 truncate">{activeSim?.name ?? 'Simulation'}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`shrink-0 text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-52 bg-overlay border border-border rounded-xl shadow-xl z-50 py-1 animate-in">
          {simulations.map((sim) => {
            const isActive = sim.id === activeSimulationId
            return (
              <div
                key={sim.id}
                onClick={() => {
                  if (editingId !== sim.id) {
                    setActiveSimulation(sim.id)
                    setOpen(false)
                  }
                }}
                className={`group flex items-center gap-2 px-3 py-2 cursor-pointer ${
                  isActive ? 'bg-elevated text-foreground' : 'text-secondary hover:bg-elevated'
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 bg-orange ${isActive ? 'opacity-100' : 'opacity-0'}`}
                />
                {editingId === sim.id ? (
                  <input
                    autoFocus
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitEdit(sim.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(sim.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 bg-transparent border-b border-orange text-sm focus:outline-none font-mono"
                  />
                ) : (
                  <span
                    className="flex-1 text-sm truncate"
                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(sim.id, sim.name) }}
                    title="Double-clic pour renommer"
                  >
                    {sim.name}
                  </span>
                )}
                {simulations.length > 1 && (
                  <button
                    onClick={(e) => handleRemove(e, sim.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger text-xs shrink-0"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}

          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => { duplicateSimulation(activeSimulationId); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-elevated text-left"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Nouvelle simulation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useStore, selectActiveSim } from '../../store/useStore'

const SCENARIOS = [
  { id: 'pessimiste', label: 'Pessimiste' },
  { id: 'realiste',   label: 'Réaliste' },
  { id: 'optimiste',  label: 'Optimiste' },
]

export default function ScenarioSelector() {
  const { updateGlobalParams } = useStore()
  const activeSim = useStore(selectActiveSim)
  const scenario = (activeSim.globalParams as any).scenario ?? 'realiste'

  return (
    <div className="row gap8">
      <div className="seg">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            className={scenario === s.id ? 'on' : ''}
            onClick={() => updateGlobalParams({ scenario: s.id } as any)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { saveProfile, type Profile } from '../../profiles/profileService'

const COLORS = ['#2563EB', '#64748B', '#22C55E', '#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#EF4444']

interface Props {
  isFirstProfile: boolean
  onCreated: (profile: Profile) => void
  onClose: () => void
}

export default function CreateProfileModal({ isFirstProfile, onCreated, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  function handleNext() {
    if (!name.trim()) return
    setStep(2)
  }

  function handleCreate() {
    const profile: Profile = {
      id: `profile_${Date.now()}`,
      name: name.trim(),
      avatar: name.trim()[0].toUpperCase(),
      color,
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      onboarded: !isFirstProfile,
    }
    saveProfile(profile)
    onCreated(profile)
  }

  return (
    <div className="fixed inset-0 bg-base/90 z-50 flex items-center justify-center p-4">
      <div className="relative bg-surface border border-border rounded-2xl w-full max-w-sm p-8 animate-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-foreground w-8 h-8 flex items-center justify-center"
        >
          ✕
        </button>

        <div className="flex justify-center gap-2 mb-6">
          <div className={`w-6 h-1 rounded-full transition-colors ${step >= 1 ? 'bg-orange' : 'bg-border'}`} />
          <div className={`w-6 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-orange' : 'bg-border'}`} />
        </div>

        {step === 1 ? (
          <>
            <h2 className="text-xl font-semibold text-center mb-2">Comment vous appelez-vous ?</h2>
            <p className="text-muted text-sm text-center mb-6">Votre prénom pour identifier ce profil</p>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              placeholder="Votre prénom"
              className="w-full bg-elevated border border-border rounded-xl px-4 py-3 text-lg text-center text-foreground placeholder:text-muted focus:outline-none focus:border-orange/50"
            />
            <button
              onClick={handleNext}
              disabled={!name.trim()}
              className="mt-4 w-full py-2.5 rounded-xl bg-orange text-base text-sm font-medium disabled:opacity-30 hover:bg-orange/90 transition-colors"
            >
              Continuer →
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-center mb-2">Choisissez une couleur</h2>
            <p className="text-muted text-sm text-center mb-6">Pour personnaliser votre profil</p>

            <div className="flex justify-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white transition-colors"
                style={{ backgroundColor: color }}
              >
                {name[0]?.toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-6">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-full aspect-square rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-offset-surface ring-foreground scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <button
              onClick={handleCreate}
              className="w-full py-2.5 rounded-xl bg-orange text-base text-sm font-medium hover:bg-orange/90 transition-colors"
            >
              Créer et commencer →
            </button>
            <button
              onClick={() => setStep(1)}
              className="mt-2 w-full py-2 text-muted text-sm hover:text-foreground transition-colors"
            >
              ← Retour
            </button>
          </>
        )}
      </div>
    </div>
  )
}

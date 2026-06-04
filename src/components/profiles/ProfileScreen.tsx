import { useState } from 'react'
import { getProfiles, setActiveProfile, type Profile } from '../../profiles/profileService'
import CreateProfileModal from './CreateProfileModal'

interface Props {
  onProfileSelected: () => void
}

export default function ProfileScreen({ onProfileSelected }: Props) {
  const [profiles, setProfiles] = useState(() => getProfiles())
  const [showCreate, setShowCreate] = useState(false)

  function handleSelect(profile: Profile) {
    setActiveProfile(profile.id)
    onProfileSelected()
  }

  function handleCreated(profile: Profile) {
    setActiveProfile(profile.id)
    setProfiles(getProfiles())
    setShowCreate(false)
    onProfileSelected()
  }

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange to-purple shrink-0" />
        <span className="text-2xl font-bold text-foreground">Patrimoine</span>
      </div>

      <h1 className="text-xl font-semibold text-foreground mb-2">Qui utilise cette application ?</h1>
      <p className="text-muted text-sm mb-10 text-center">
        Sélectionnez un profil pour accéder à vos simulations
      </p>

      <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
        {profiles.map((profile, i) => (
          <button
            key={profile.id}
            onClick={() => handleSelect(profile)}
            className={`flex flex-col items-center gap-3 group p-4 rounded-2xl border border-transparent hover:border-orange/30 hover:bg-orange/5 transition-all duration-200 animate-in`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white group-hover:scale-105 transition-transform duration-200"
              style={{ backgroundColor: profile.color }}
            >
              {profile.avatar}
            </div>
            <span className="text-sm text-foreground font-medium">{profile.name}</span>
          </button>
        ))}

        <button
          onClick={() => setShowCreate(true)}
          className="flex flex-col items-center gap-3 group p-4 rounded-2xl border border-transparent hover:border-border-mid hover:bg-elevated transition-all duration-200"
        >
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center text-2xl text-muted group-hover:border-border-mid group-hover:text-foreground transition-all duration-200">
            +
          </div>
          <span className="text-sm text-muted group-hover:text-foreground font-medium transition-colors">
            Ajouter un profil
          </span>
        </button>
      </div>

      {showCreate && (
        <CreateProfileModal
          isFirstProfile={profiles.length === 0}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}

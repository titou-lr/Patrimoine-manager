import { useState, useRef, useEffect } from 'react'
import {
  getProfiles,
  getActiveProfile,
  setActiveProfile,
  deleteProfile,
  clearActiveProfile,
} from '../../profiles/profileService'

export default function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const profile = getActiveProfile()
  const otherProfiles = getProfiles().filter((p) => p.id !== profile?.id)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  if (!profile) return null

  function handleSwitch(id: string) {
    setActiveProfile(id)
    window.location.reload()
  }

  function handleManage() {
    clearActiveProfile()
    window.location.reload()
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    deleteProfile(profile!.id)
    clearActiveProfile()
    window.location.reload()
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-elevated transition-colors"
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: profile.color }}
        >
          {profile.avatar}
        </div>
        <span className="text-sm text-foreground hidden sm:inline">{profile.name}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-muted shrink-0">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-52 bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in">
          {otherProfiles.length > 0 && (
            <>
              <div className="px-3 pt-2.5 pb-1">
                <span className="text-[11px] text-muted font-medium uppercase tracking-wide">Changer de profil</span>
              </div>
              {otherProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSwitch(p.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-elevated transition-colors"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.avatar}
                  </div>
                  {p.name}
                </button>
              ))}
              <div className="border-t border-border my-1" />
            </>
          )}

          <button
            onClick={handleManage}
            className="w-full flex items-center px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-elevated transition-colors"
          >
            Gérer les profils
          </button>

          {!confirmDelete ? (
            <button
              onClick={handleDelete}
              className="w-full flex items-center px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
            >
              Supprimer ce profil
            </button>
          ) : (
            <div className="px-3 py-2 border-t border-border">
              <p className="text-xs text-muted mb-2 leading-relaxed">
                Supprimer <strong className="text-foreground">{profile.name}</strong> ?{' '}
                Toutes les simulations seront perdues.
              </p>
              <button
                onClick={handleDelete}
                className="w-full py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors"
              >
                Supprimer définitivement
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="mt-1 w-full py-1.5 text-muted text-xs hover:text-foreground transition-colors"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

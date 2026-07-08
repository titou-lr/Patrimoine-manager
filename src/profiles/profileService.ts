export interface Profile {
  id: string
  name: string
  avatar: string
  color: string
  createdAt: string
  lastOpenedAt: string
  onboarded: boolean
}

const PROFILES_KEY = 'patrimoine-profiles'
const ACTIVE_KEY = 'patrimoine-active-profile'

export function getProfiles(): Profile[] {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveProfile(profile: Profile): void {
  const profiles = getProfiles()
  const idx = profiles.findIndex((p) => p.id === profile.id)
  if (idx >= 0) profiles[idx] = profile
  else profiles.push(profile)
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function deleteProfile(id: string): void {
  const updated = getProfiles().filter((p) => p.id !== id)
  localStorage.setItem(PROFILES_KEY, JSON.stringify(updated))
  // Purge de toutes les clés localStorage par profil (voir CLAUDE.md — clés par profil)
  localStorage.removeItem(`patrimoine-data-${id}`)
  localStorage.removeItem(`patrimoine-education-${id}`)
  localStorage.removeItem(`patrimoine-tour-${id}`)
  localStorage.removeItem(`patrimoine-custom-banks-${id}`)
  localStorage.removeItem(`patrimoine-budget-${id}`)
  localStorage.removeItem(`patrimoine-actuel-${id}`)
}

export function getActiveProfileId(): string | null {
  return sessionStorage.getItem(ACTIVE_KEY)
}

export function setActiveProfile(id: string): void {
  sessionStorage.setItem(ACTIVE_KEY, id)
  const p = getProfiles().find((pr) => pr.id === id)
  if (p) saveProfile({ ...p, lastOpenedAt: new Date().toISOString() })
}

export function clearActiveProfile(): void {
  sessionStorage.removeItem(ACTIVE_KEY)
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId()
  if (!id) return null
  return getProfiles().find((p) => p.id === id) ?? null
}

export function markProfileOnboarded(id: string): void {
  const p = getProfiles().find((pr) => pr.id === id)
  if (p) saveProfile({ ...p, onboarded: true })
}

export function getStoreKey(): string {
  const id = getActiveProfileId()
  return id ? `patrimoine-data-${id}` : 'patrimoine-sim-v2'
}

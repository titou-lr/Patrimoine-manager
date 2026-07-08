import { create } from 'zustand'
import type { HelpPageKey } from '../types/help'

/**
 * Store minimaliste du système d'aide contextuelle.
 * Aucune persistance : l'overlay s'ouvre, se lit, se ferme — c'est tout.
 */
interface HelpState {
  isOpen: boolean
  page: HelpPageKey | null
  open: (page: HelpPageKey) => void
  close: () => void
}

export const useHelpStore = create<HelpState>()((set) => ({
  isOpen: false,
  page: null,
  open: (page) => set({ isOpen: true, page }),
  close: () => set({ isOpen: false, page: null }),
}))

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getActiveProfileId } from '../../profiles/profileService'

function getTourKey(): string {
  const id = getActiveProfileId()
  return id ? `patrimoine-tour-${id}` : 'patrimoine-tour-default'
}

export interface TourFormData {
  firstName: string
  age: number
}

interface TourState {
  // Welcome form
  formCompleted: boolean
  formData: TourFormData | null

  // Simulation tour (Envelopes → Dashboard → Optimizer)
  simTourActive: boolean
  simTourStep: number   // index into SIMULATION_STEPS
  simTourDone: boolean  // completed or dismissed

  // Deferred page tours (finance | education | brokers | models)
  pageToursStep: Record<string, number>
  pageToursDone: Record<string, boolean>

  // Actions
  completeForm: (data: TourFormData) => void
  skipEverything: () => void
  setSimStep: (step: number) => void
  finishSimTour: () => void
  dismissSimTour: () => void
  restartSimTour: () => void
  setPageStep: (page: string, step: number) => void
  finishPageTour: (page: string) => void
  dismissPageTour: (page: string) => void
  resetAllTours: () => void
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      formCompleted: false,
      formData: null,
      simTourActive: false,
      simTourStep: 0,
      simTourDone: false,
      pageToursStep: {},
      pageToursDone: {},

      completeForm: (data) =>
        set({ formCompleted: true, formData: data, simTourActive: true, simTourStep: 0, simTourDone: false }),

      skipEverything: () =>
        set({ formCompleted: true, simTourDone: true, simTourActive: false }),

      setSimStep: (step) => set({ simTourStep: step }),
      finishSimTour: () => set({ simTourDone: true, simTourActive: false }),
      dismissSimTour: () => set({ simTourDone: true, simTourActive: false }),
      restartSimTour: () => set({ simTourActive: true, simTourStep: 0, simTourDone: false }),

      setPageStep: (page, step) =>
        set((s) => ({ pageToursStep: { ...s.pageToursStep, [page]: step } })),
      finishPageTour: (page) =>
        set((s) => ({ pageToursDone: { ...s.pageToursDone, [page]: true } })),
      dismissPageTour: (page) =>
        set((s) => ({ pageToursDone: { ...s.pageToursDone, [page]: true } })),
      resetAllTours: () =>
        set({ simTourActive: true, simTourStep: 0, simTourDone: false, pageToursStep: {}, pageToursDone: {} }),
    }),
    { name: getTourKey() }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getActiveProfileId } from '../../profiles/profileService'
import { EDUCATION_MODULES } from '../data/modules'

export interface ModuleProgress {
  status: 'locked' | 'in_progress' | 'completed'
  completedLessons: string[]
  completedExercises: string[]
}

interface EducationStore {
  moduleProgress: Record<string, ModuleProgress>
  completeLesson: (moduleId: string, lessonId: string) => void
  completeExercise: (moduleId: string, exerciseId: string) => void
  resetProgress: () => void
}

function buildInitialProgress(): Record<string, ModuleProgress> {
  const progress: Record<string, ModuleProgress> = {}
  EDUCATION_MODULES.forEach((mod, i) => {
    progress[mod.id] = {
      status: i === 0 ? 'in_progress' : 'locked',
      completedLessons: [],
      completedExercises: [],
    }
  })
  return progress
}

function isModuleCompleted(moduleId: string, progress: Record<string, ModuleProgress>): boolean {
  const mod = EDUCATION_MODULES.find(m => m.id === moduleId)
  if (!mod) return false
  const p = progress[moduleId]
  if (!p) return false
  const allLessons = mod.lessons.every(l => p.completedLessons.includes(l.id))
  const allExercises = mod.exercises.every(e => p.completedExercises.includes(e.id))
  return allLessons && allExercises
}

function applyUnlocking(progress: Record<string, ModuleProgress>): Record<string, ModuleProgress> {
  const updated = { ...progress }
  for (let i = 0; i < EDUCATION_MODULES.length - 1; i++) {
    const current = EDUCATION_MODULES[i]
    const next = EDUCATION_MODULES[i + 1]
    if (isModuleCompleted(current.id, updated) && updated[next.id]?.status === 'locked') {
      updated[next.id] = { ...updated[next.id], status: 'in_progress' }
    }
  }
  return updated
}

function getStoreName(): string {
  const id = getActiveProfileId()
  return id ? `patrimoine-education-${id}` : 'patrimoine-education'
}

export const useEducationStore = create<EducationStore>()(
  persist(
    (set) => ({
      moduleProgress: buildInitialProgress(),

      completeLesson: (moduleId, lessonId) =>
        set((s) => {
          const prev = s.moduleProgress[moduleId] ?? { status: 'locked', completedLessons: [], completedExercises: [] }
          if (prev.completedLessons.includes(lessonId)) return s
          const updated: Record<string, ModuleProgress> = {
            ...s.moduleProgress,
            [moduleId]: {
              ...prev,
              completedLessons: [...prev.completedLessons, lessonId],
            },
          }
          if (isModuleCompleted(moduleId, updated)) {
            updated[moduleId] = { ...updated[moduleId], status: 'completed' }
          }
          return { moduleProgress: applyUnlocking(updated) }
        }),

      completeExercise: (moduleId, exerciseId) =>
        set((s) => {
          const prev = s.moduleProgress[moduleId] ?? { status: 'locked', completedLessons: [], completedExercises: [] }
          if (prev.completedExercises.includes(exerciseId)) return s
          const updated: Record<string, ModuleProgress> = {
            ...s.moduleProgress,
            [moduleId]: {
              ...prev,
              completedExercises: [...prev.completedExercises, exerciseId],
            },
          }
          if (isModuleCompleted(moduleId, updated)) {
            updated[moduleId] = { ...updated[moduleId], status: 'completed' }
          }
          return { moduleProgress: applyUnlocking(updated) }
        }),

      resetProgress: () => set({ moduleProgress: buildInitialProgress() }),
    }),
    {
      name: getStoreName(),
    }
  )
)

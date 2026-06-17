import { useEffect } from 'react'
import { useTourStore } from '../store/useTourStore'
import SpotlightOverlay from './SpotlightOverlay'
import { SIMULATION_STEPS } from '../steps/simulationSteps'
import { FINANCE_STEPS } from '../steps/financeSteps'
import { EDUCATION_STEPS } from '../steps/educationSteps'
import { BROKERS_STEPS } from '../steps/brokersSteps'
import { MODELS_STEPS } from '../steps/modelsSteps'
import type { TourStep } from '../steps/simulationSteps'

type AppPage = 'dashboard' | 'envelopes' | 'optimizer' | 'data' | 'finance' | 'education' | 'brokers' | 'models'

const DEFERRED_PAGES: AppPage[] = ['finance', 'education', 'brokers', 'models']

function getPageSteps(page: string): TourStep[] {
  switch (page) {
    case 'finance': return FINANCE_STEPS
    case 'education': return EDUCATION_STEPS
    case 'brokers': return BROKERS_STEPS
    case 'models': return MODELS_STEPS
    default: return []
  }
}

interface Props {
  currentPage: AppPage
  onNavigateTo: (page: AppPage) => void
}

export default function TourController({ currentPage, onNavigateTo }: Props) {
  const tour = useTourStore()

  // Navigate to the correct page when sim tour step changes
  useEffect(() => {
    if (!tour.simTourActive || tour.simTourDone) return
    const step = SIMULATION_STEPS[tour.simTourStep]
    if (!step) return
    if ((step.page as AppPage) !== currentPage) {
      onNavigateTo(step.page as AppPage)
    }
  }, [tour.simTourStep, tour.simTourActive, tour.simTourDone, currentPage, onNavigateTo])

  // Trigger deferred page tour on first visit (after sim tour is done)
  useEffect(() => {
    if (!tour.formCompleted || !tour.simTourDone) return
    if (!DEFERRED_PAGES.includes(currentPage as AppPage)) return
    if (tour.pageToursDone[currentPage]) return
    // Don't re-trigger if already initiated
    if (tour.pageToursStep[currentPage] !== undefined) return

    const t = setTimeout(() => {
      tour.setPageStep(currentPage, 0)
    }, 400)
    return () => clearTimeout(t)
  }, [currentPage, tour.simTourDone, tour.formCompleted, tour.pageToursDone, tour.pageToursStep, tour])

  const firstName = tour.formData?.firstName ?? ''

  // ── Simulation tour ──────────────────────────────────────────────────────────
  if (tour.simTourActive && !tour.simTourDone) {
    const stepIdx = tour.simTourStep
    const step = SIMULATION_STEPS[stepIdx]
    if (!step) return null

    const advance = () => {
      if (stepIdx >= SIMULATION_STEPS.length - 1) {
        tour.finishSimTour()
        return
      }
      const nextStep = SIMULATION_STEPS[stepIdx + 1]
      if ((nextStep.page as AppPage) !== currentPage) {
        onNavigateTo(nextStep.page as AppPage)
      }
      tour.setSimStep(stepIdx + 1)
    }

    const handleActionDetected = () => {
      // E6 is the run-simulation button — extra delay for the simulation to process
      const extraDelay = step.id === 'E6' ? 700 : 0
      setTimeout(advance, extraDelay)
    }

    return (
      <SpotlightOverlay
        key={step.id}
        step={step}
        stepIndex={stepIdx}
        totalSteps={SIMULATION_STEPS.length}
        firstName={firstName}
        onNext={advance}
        onSkip={tour.dismissSimTour}
        onActionDetected={handleActionDetected}
      />
    )
  }

  // ── Deferred page tours ──────────────────────────────────────────────────────
  for (const page of DEFERRED_PAGES) {
    if (currentPage !== page) continue
    if (tour.pageToursDone[page]) continue
    if (tour.pageToursStep[page] === undefined) continue

    const steps = getPageSteps(page)
    const stepIdx = tour.pageToursStep[page]!
    const step = steps[stepIdx]
    if (!step) {
      tour.finishPageTour(page)
      continue
    }

    const advance = () => {
      if (stepIdx >= steps.length - 1) {
        tour.finishPageTour(page)
      } else {
        tour.setPageStep(page, stepIdx + 1)
      }
    }

    return (
      <SpotlightOverlay
        key={step.id}
        step={step}
        stepIndex={stepIdx}
        totalSteps={steps.length}
        firstName={firstName}
        onNext={advance}
        onSkip={() => tour.dismissPageTour(page)}
        onActionDetected={advance}
      />
    )
  }

  return null
}

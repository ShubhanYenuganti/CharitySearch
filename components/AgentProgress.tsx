import { AgentStep } from '@/lib/types'

interface AgentProgressProps {
  step: AgentStep
}

const STEPS: { id: AgentStep; label: string }[] = [
  { id: 'interpreting', label: 'Analyzing crisis data' },
  { id: 'researching', label: 'Finding organizations' },
  { id: 'narrating', label: 'Writing your report' },
]

const STEP_ORDER: AgentStep[] = ['interpreting', 'researching', 'narrating', 'complete']

function stepIndex(step: AgentStep): number {
  return STEP_ORDER.indexOf(step)
}

export default function AgentProgress({ step }: AgentProgressProps) {
  if (step === 'idle') return null

  if (step === 'error') {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        An error occurred. Please try again.
      </div>
    )
  }

  const currentIndex = stepIndex(step)

  return (
    <div className="flex items-center gap-0 w-full max-w-lg">
      {STEPS.map((s, i) => {
        const sIndex = stepIndex(s.id)
        const isComplete = currentIndex > sIndex
        const isActive = currentIndex === sIndex

        return (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold
                  transition-colors duration-300
                  ${isComplete
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                    : isActive
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 step-pulse'
                    : 'bg-surface-subtle text-text-muted'
                  }
                `}
              >
                {isComplete ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`
                  text-xs whitespace-nowrap
                  ${isActive
                    ? 'text-blue-700 dark:text-blue-300 font-medium'
                    : isComplete
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-text-muted'
                  }
                `}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`
                  flex-1 h-px mx-2 mb-4 transition-colors duration-300
                  ${currentIndex > sIndex
                    ? 'bg-emerald-300 dark:bg-emerald-700'
                    : 'bg-border'
                  }
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

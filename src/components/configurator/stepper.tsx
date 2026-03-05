'use client'

import { useConfiguratorStore } from '@/modules/configurator'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const steps = [
  { label: 'Kategorie', step: 0 },
  { label: 'Fahrzeug Konfiguration', step: 1 },
  { label: 'Zurüstung & Zubehör', step: 2 },
]

export function Stepper() {
  const { currentStep, setStep } = useConfiguratorStore()

  return (
    <nav className="mb-8">
      <ol className="flex items-center gap-2">
        {steps.map((s, idx) => {
          const isCompleted = currentStep > s.step
          const isCurrent = currentStep === s.step
          const isClickable = currentStep > s.step

          return (
            <li key={s.step} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className={cn(
                    'h-px w-8 md:w-12',
                    isCompleted ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && setStep(s.step)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isCompleted &&
                    'bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer',
                  !isCurrent && !isCompleted && 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs">
                    {idx + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

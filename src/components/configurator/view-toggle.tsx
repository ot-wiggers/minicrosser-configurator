'use client'

import { Button } from '@/components/ui/button'
import { LayoutGrid, ListOrdered } from 'lucide-react'

interface ViewToggleProps {
  view: 'stepper' | 'studio'
  onViewChange: (view: 'stepper' | 'studio') => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border bg-muted p-0.5">
      <Button
        variant={view === 'stepper' ? 'default' : 'ghost'}
        size="sm"
        className="gap-1.5 rounded-md"
        onClick={() => onViewChange('stepper')}
      >
        <ListOrdered className="h-4 w-4" />
        Schritte
      </Button>
      <Button
        variant={view === 'studio' ? 'default' : 'ghost'}
        size="sm"
        className="gap-1.5 rounded-md"
        onClick={() => onViewChange('studio')}
      >
        <LayoutGrid className="h-4 w-4" />
        Studio
      </Button>
    </div>
  )
}

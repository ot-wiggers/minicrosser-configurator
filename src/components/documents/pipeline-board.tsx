'use client'

import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useAuthStore } from '@/modules/auth/auth-store'
import { PipelineCard } from './pipeline-card'
import { PipelineFailedBanner } from './pipeline-failed-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'

const PIPELINE_COLUMNS = [
  {
    id: 'draft',
    label: 'Entwurf',
    statuses: ['DRAFT', 'FINAL'],
    color: 'bg-slate-100 dark:bg-slate-800/50',
  },
  {
    id: 'sent',
    label: 'Versendet',
    statuses: ['SENT'],
    color: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'followup',
    label: 'Nachfassen',
    statuses: ['FOLLOW_UP'],
    color: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    id: 'done',
    label: 'Erledigt',
    statuses: ['ACCEPTED', 'DECLINED', 'EXPIRED'],
    color: 'bg-green-50 dark:bg-green-900/20',
  },
] as const

export function PipelineBoard() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [showAll, setShowAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [doneExpanded, setDoneExpanded] = useState(false)

  const createdByFilter = isAdmin && showAll
    ? undefined
    : (user?._id as Id<'users'> | undefined)

  const pipelineDocs = useQuery(api.documents.listForPipeline, {
    createdBy: createdByFilter,
  })

  const filteredDocs = useMemo(() => {
    if (!pipelineDocs) return []
    if (!searchQuery.trim()) return pipelineDocs
    const lower = searchQuery.toLowerCase()
    return pipelineDocs.filter(
      (d: any) =>
        d.documentNo?.toLowerCase().includes(lower) ||
        d.customer.company?.toLowerCase().includes(lower) ||
        d.customer.lastName?.toLowerCase().includes(lower),
    )
  }, [pipelineDocs, searchQuery])

  const columns = useMemo(() => {
    return PIPELINE_COLUMNS.map((col) => ({
      ...col,
      docs: filteredDocs.filter((d: any) => col.statuses.includes(d.status)),
    }))
  }, [filteredDocs])

  return (
    <div>
      <PipelineFailedBanner />

      {/* Controls */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suche nach Dokumentnummer, Firma, Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8', !showAll && 'bg-background shadow-sm')}
              onClick={() => setShowAll(false)}
            >
              Meine
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8', showAll && 'bg-background shadow-sm')}
              onClick={() => setShowAll(true)}
            >
              Alle
            </Button>
          </div>
        )}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <div key={col.id} className={cn('rounded-lg p-3', col.color)}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {col.id === 'done' && (
                  <button onClick={() => setDoneExpanded(!doneExpanded)} className="text-muted-foreground">
                    {doneExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                )}
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {col.docs.length}
                </Badge>
              </div>
            </div>
            {col.id === 'done' && !doneExpanded ? (
              <p className="text-xs text-muted-foreground">
                {col.docs.length} Dokument{col.docs.length !== 1 ? 'e' : ''}
              </p>
            ) : (
              <div className="space-y-2">
                {col.docs.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Keine Dokumente</p>
                ) : (
                  col.docs.map((doc: any) => (
                    <PipelineCard key={doc._id} doc={doc} />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

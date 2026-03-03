'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, CheckCircle, Eye, MousePointer, AlertTriangle } from 'lucide-react'

const eventConfig: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  delivered: { icon: CheckCircle, label: 'Zugestellt', color: 'text-green-600' },
  opened: { icon: Eye, label: 'Geöffnet', color: 'text-blue-600' },
  clicked: { icon: MousePointer, label: 'Link geklickt', color: 'text-purple-600' },
  bounced: { icon: AlertTriangle, label: 'Nicht zugestellt', color: 'text-red-600' },
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface EmailTimelineProps {
  documentId: string
}

export function EmailTimeline({ documentId }: EmailTimelineProps) {
  const events = useQuery(api.emailEvents.listByDocumentId, {
    documentId: documentId as Id<'documents'>,
  })
  const outboxEntries = useQuery(api.outbox.listByDocumentId, {
    documentId: documentId as Id<'documents'>,
  })

  if (!events && !outboxEntries) return null
  if ((!events || events.length === 0) && (!outboxEntries || outboxEntries.length === 0)) return null

  // Build timeline items
  const timelineItems: Array<{ type: string; timestamp: number; metadata?: string }> = []

  // Add send events from outbox
  for (const entry of outboxEntries ?? []) {
    if (entry.status === 'SENT') {
      timelineItems.push({
        type: 'sent',
        timestamp: entry._creationTime,
      })
    }
    if (entry.status === 'FAILED') {
      timelineItems.push({
        type: 'failed',
        timestamp: entry._creationTime,
        metadata: entry.lastError ?? undefined,
      })
    }
  }

  // Add tracking events
  for (const event of events ?? []) {
    timelineItems.push({
      type: event.eventType,
      timestamp: event.timestamp,
      metadata: event.metadata ?? undefined,
    })
  }

  // Sort by timestamp
  timelineItems.sort((a, b) => a.timestamp - b.timestamp)

  if (timelineItems.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Email-Aktivität
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {timelineItems.map((item, idx) => {
            const config = item.type === 'sent'
              ? { icon: Mail, label: 'Email gesendet', color: 'text-muted-foreground' }
              : item.type === 'failed'
                ? { icon: AlertTriangle, label: 'Versand fehlgeschlagen', color: 'text-red-600' }
                : eventConfig[item.type] ?? { icon: Mail, label: item.type, color: 'text-muted-foreground' }
            const Icon = config.icon

            return (
              <div key={idx} className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                <div>
                  <p className="text-sm font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(item.timestamp)}
                  </p>
                  {item.metadata && (
                    <p className="text-xs text-muted-foreground">{item.metadata}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

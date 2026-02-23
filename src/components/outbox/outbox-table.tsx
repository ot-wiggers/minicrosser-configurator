'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { RefreshCw, Inbox } from 'lucide-react'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  SENT: 'default',
  FAILED: 'destructive',
}

const statusLabel: Record<string, string> = {
  PENDING: 'Wartend',
  SENT: 'Gesendet',
  FAILED: 'Fehlgeschlagen',
}

export function OutboxTable() {
  const outboxEntries = useQuery(api.outbox.list)

  // TODO: Implement retry via Convex action in Phase 7
  async function handleRetryAll() {
    toast.info('E-Mail-Verarbeitung wird in einem zukünftigen Update implementiert.')
  }

  if (!outboxEntries || outboxEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Inbox className="mb-4 h-12 w-12" />
        <p>Keine E-Mails in der Outbox</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleRetryAll}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Alle erneut senden
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empfänger</TableHead>
            <TableHead>Betreff</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Versuche</TableHead>
            <TableHead>Fehler</TableHead>
            <TableHead>Erstellt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {outboxEntries.map((row) => (
            <TableRow key={row._id}>
              <TableCell>{row.toEmail}</TableCell>
              <TableCell>{row.subject}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[row.status]}>
                  {statusLabel[row.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{row.attempts}</TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {row.lastError ?? '—'}
              </TableCell>
              <TableCell className="text-sm">
                {formatDate(new Date(row._creationTime).toISOString())}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

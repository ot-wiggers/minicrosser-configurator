'use client'

import { useEffect, useState, useCallback } from 'react'
import { outboxRepo, documentRepo } from '@/modules/storage'
import type { OutboxRecord } from '@/modules/storage/types'
import { processOutboxQueue } from '@/modules/email/outbox-worker'
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

interface OutboxRowData extends OutboxRecord {
  documentNo?: string
}

export function OutboxTable() {
  const [rows, setRows] = useState<OutboxRowData[]>([])
  const [retrying, setRetrying] = useState(false)

  const loadData = useCallback(async () => {
    const records = await outboxRepo.getAll()
    const enriched: OutboxRowData[] = await Promise.all(
      records.map(async (record) => {
        const doc = await documentRepo.getById(record.document_id)
        return { ...record, documentNo: doc?.document_no }
      }),
    )
    setRows(enriched)
  }, [])

  useEffect(() => {
    loadData()
    window.addEventListener('online', loadData)
    return () => window.removeEventListener('online', loadData)
  }, [loadData])

  async function handleRetryAll() {
    setRetrying(true)
    try {
      await processOutboxQueue()
      await loadData()
      toast.success('Outbox verarbeitet')
    } catch {
      toast.error('Fehler beim Verarbeiten')
    } finally {
      setRetrying(false)
    }
  }

  if (rows.length === 0) {
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
        <Button variant="outline" size="sm" onClick={handleRetryAll} disabled={retrying}>
          <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
          Alle erneut senden
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dokument-Nr.</TableHead>
            <TableHead>Empfänger</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Versuche</TableHead>
            <TableHead>Fehler</TableHead>
            <TableHead>Erstellt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono">{row.documentNo ?? '—'}</TableCell>
              <TableCell>{row.to_email}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[row.status]}>
                  {statusLabel[row.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{row.attempts}</TableCell>
              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                {row.last_error ?? '—'}
              </TableCell>
              <TableCell className="text-sm">{formatDate(row.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export function PipelineFailedBanner() {
  const failedCount = useQuery(api.outbox.countFailed)
  const retryAll = useMutation(api.outbox.retryAllFailed)
  const [retrying, setRetrying] = useState(false)

  if (!failedCount || failedCount === 0) return null

  async function handleRetry() {
    setRetrying(true)
    try {
      const count = await retryAll()
      toast.success(`${count} E-Mail(s) werden erneut gesendet...`)
    } catch {
      toast.error('Fehler beim erneuten Senden')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span>
          {failedCount} E-Mail{failedCount > 1 ? 's' : ''} fehlgeschlagen
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={handleRetry}
        disabled={retrying}
      >
        <RefreshCw className="mr-1 h-3 w-3" />
        {retrying ? 'Wird gesendet...' : 'Alle erneut senden'}
      </Button>
    </div>
  )
}

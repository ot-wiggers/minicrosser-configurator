'use client'

import { useEffect, useRef } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useOnlineStatus } from '@/hooks/use-online-status'

/**
 * OutboxProcessor — watches pending outbox entries in Convex and
 * triggers the server-side sendEmail action to process them.
 * Replaces the old Dexie-based outbox-worker.
 */
export function OutboxProcessor() {
  const isOnline = useOnlineStatus()
  const pendingEntries = useQuery(api.outbox.listPending)
  const sendEmail = useAction(api.sendEmail.send)
  const processingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isOnline || !pendingEntries || (pendingEntries as any[]).length === 0) return

    // Process each pending entry that we haven't already started
    for (const entry of pendingEntries as any[]) {
      const id = entry._id as string
      if (processingRef.current.has(id)) continue

      processingRef.current.add(id)
      sendEmail({ outboxId: id as any })
        .then(() => {
          processingRef.current.delete(id)
        })
        .catch((err) => {
          console.error('Outbox send error:', err)
          processingRef.current.delete(id)
        })
    }
  }, [isOnline, pendingEntries, sendEmail])

  return null
}

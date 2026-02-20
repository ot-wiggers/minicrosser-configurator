'use client'

import { useEffect } from 'react'
import { processOutboxQueue } from '@/modules/email/outbox-worker'

export function OutboxProcessor() {
  useEffect(() => {
    processOutboxQueue()
    window.addEventListener('online', processOutboxQueue)
    return () => window.removeEventListener('online', processOutboxQueue)
  }, [])

  return null
}

'use client'

import { OutboxTable } from '@/components/outbox/outbox-table'

export default function OutboxPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Outbox</h1>
      <OutboxTable />
    </div>
  )
}

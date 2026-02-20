import { db } from './db'
import type { OutboxRecord, OutboxStatus } from './types'

export const outboxRepo = {
  async getAll(): Promise<OutboxRecord[]> {
    return db.outbox.orderBy('created_at').reverse().toArray()
  },

  async getPending(): Promise<OutboxRecord[]> {
    return db.outbox.where('status').equals('PENDING').toArray()
  },

  async create(record: Omit<OutboxRecord, 'id'>): Promise<number> {
    const id = await db.outbox.add(record as OutboxRecord)
    return id as number
  },

  async updateStatus(id: number, status: OutboxStatus, error?: string): Promise<void> {
    const record = await db.outbox.get(id)
    if (!record) return
    await db.outbox.update(id, {
      status,
      attempts: status === 'SENT' ? record.attempts : record.attempts + 1,
      last_error: error,
    })
  },

  async countPending(): Promise<number> {
    return db.outbox.where('status').equals('PENDING').count()
  },
}

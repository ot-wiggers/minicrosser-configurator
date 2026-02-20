import { db } from './db'

export interface DocumentNumberService {
  getNextNumber(): Promise<string>
}

export const sequenceRepo: DocumentNumberService = {
  async getNextNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const key = `doc-seq-${year}`

    return db.transaction('rw', db.sequences, async () => {
      const existing = await db.sequences.get(key)
      const nextVal = existing ? existing.value + 1 : 1
      await db.sequences.put({ key, value: nextVal })
      const padded = String(nextVal).padStart(6, '0')
      return `MC-${year}-${padded}`
    })
  },
}

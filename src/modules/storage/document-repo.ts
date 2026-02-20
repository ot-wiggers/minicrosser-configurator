import { db } from './db'
import type { DocumentRecord, DocumentStatus } from './types'

export const documentRepo = {
  async getAll(): Promise<DocumentRecord[]> {
    return db.documents.orderBy('created_at').reverse().toArray()
  },

  async getById(id: number): Promise<DocumentRecord | undefined> {
    return db.documents.get(id)
  },

  async create(doc: Omit<DocumentRecord, 'id'>): Promise<number> {
    return db.documents.add(doc as DocumentRecord)
  },

  async updateStatus(id: number, status: DocumentStatus): Promise<void> {
    await db.documents.update(id, { status, updated_at: new Date().toISOString() })
  },

  async search(query: string): Promise<DocumentRecord[]> {
    const lower = query.toLowerCase()
    const all = await db.documents.orderBy('created_at').reverse().toArray()
    return all.filter(
      (d) =>
        d.document_no.toLowerCase().includes(lower) ||
        d.customer.company.toLowerCase().includes(lower) ||
        d.customer.lastName.toLowerCase().includes(lower),
    )
  },
}

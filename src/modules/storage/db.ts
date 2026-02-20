import Dexie, { type EntityTable } from 'dexie'
import type { DocumentRecord, OutboxRecord, SequenceRecord } from './types'

export class McConfiguratorDB extends Dexie {
  documents!: EntityTable<DocumentRecord, 'id'>
  outbox!: EntityTable<OutboxRecord, 'id'>
  sequences!: EntityTable<SequenceRecord, 'key'>

  constructor() {
    super('mc-configurator')
    this.version(1).stores({
      documents: '++id, document_no, document_type, status, created_at',
      outbox: '++id, document_id, status, created_at',
      sequences: 'key',
    })
  }
}

export const db = new McConfiguratorDB()

import Dexie, { type EntityTable } from 'dexie'
import type { DocumentRecord, OutboxRecord, SequenceRecord, SyncOutboxRecord } from './types'
import type {
  CategoryRecord,
  BaseModelRecord,
  OptionGroupRecord,
  OptionRecord,
  UserRecord,
  SettingRecord,
} from '@/modules/catalog/db-types'

export class McConfiguratorDB extends Dexie {
  documents!: EntityTable<DocumentRecord, 'id'>
  outbox!: EntityTable<OutboxRecord, 'id'>
  syncOutbox!: EntityTable<SyncOutboxRecord, 'id'>
  sequences!: EntityTable<SequenceRecord, 'key'>
  categories!: EntityTable<CategoryRecord, 'id'>
  baseModels!: EntityTable<BaseModelRecord, 'id'>
  optionGroups!: EntityTable<OptionGroupRecord, 'id'>
  options!: EntityTable<OptionRecord, 'id'>
  users!: EntityTable<UserRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>

  constructor() {
    super('mc-configurator')

    this.version(1).stores({
      documents: '++id, document_no, document_type, status, created_at',
      outbox: '++id, document_id, status, created_at',
      sequences: 'key',
    })

    this.version(2).stores({
      documents: '++id, document_no, document_type, status, created_at',
      outbox: '++id, document_id, status, created_at',
      sequences: 'key',
      categories: 'id, sortOrder, isActive',
      baseModels: 'id, categoryId, skuCode, sortOrder, isActive',
      optionGroups: 'id, sortOrder, isActive',
      options: 'id, optionGroupId, skuCode, sortOrder, isActive',
      users: 'id, &username',
      settings: 'key',
    })

    this.version(3).stores({
      documents: '++id, document_no, document_type, status, created_at, convexId',
      outbox: '++id, document_id, status, created_at',
      syncOutbox: '++id, type, status, created_at',
      sequences: 'key',
      categories: 'id, sortOrder, isActive',
      baseModels: 'id, categoryId, skuCode, sortOrder, isActive',
      optionGroups: 'id, sortOrder, isActive',
      options: 'id, optionGroupId, skuCode, sortOrder, isActive',
      users: 'id, &username',
      settings: 'key',
    })
  }
}

export const db = new McConfiguratorDB()

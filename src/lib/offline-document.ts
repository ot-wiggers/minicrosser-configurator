import { db } from '@/modules/storage/db'
import type { DocumentRecord, CustomerData, PricingSummary, SelectedOption } from '@/modules/storage/types'

interface CreateDocumentParams {
  documentNo: string
  documentType: 'QUOTE' | 'ORDER'
  customer: CustomerData
  pricing: PricingSummary
  selectedCategory: string
  selectedBaseModelId: string
  selectedOptions: SelectedOption[]
  notes?: string
}

/**
 * Creates a document locally in Dexie and adds a sync outbox entry.
 * Returns the local document ID.
 */
export async function createDocumentOffline(params: CreateDocumentParams): Promise<number> {
  const now = new Date().toISOString()

  // Create local document record
  const docRecord: DocumentRecord = {
    document_no: params.documentNo,
    document_type: params.documentType,
    status: 'DRAFT',
    customer: params.customer,
    pricing: params.pricing,
    selectedCategory: params.selectedCategory,
    selectedBaseModelId: params.selectedBaseModelId,
    selectedOptions: params.selectedOptions,
    notes: params.notes,
    created_at: now,
    updated_at: now,
  }

  const localDocId = await db.documents.add(docRecord)

  // Create sync outbox entry
  await db.syncOutbox.add({
    type: 'DOC_CREATE',
    localDocId: localDocId as number,
    payload: JSON.stringify(params),
    status: 'PENDING',
    attempts: 0,
    created_at: now,
  })

  return localDocId as number
}

/**
 * Generate the next document number from local sequences.
 */
export async function getNextLocalSequence(key: string): Promise<number> {
  const record = await db.sequences.get(key)
  const next = (record?.value ?? 0) + 1
  await db.sequences.put({ key, value: next })
  return next
}

/**
 * Check if a document is local-only (not yet synced to Convex).
 */
export function isLocalDocument(doc: DocumentRecord): boolean {
  return !doc.convexId
}

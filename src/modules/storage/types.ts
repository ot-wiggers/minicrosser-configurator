export type DocumentType = 'QUOTE' | 'ORDER'
export type DocumentStatus = 'DRAFT' | 'FINAL' | 'SENT' | 'FOLLOW_UP' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'ARCHIVED'
export type OutboxStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface SelectedOption {
  optionItemId: string
  skuCode: string
  articleNo: string
  name: string
  priceNet: number
  quantity: number
  priceOnRequest?: boolean
  inputValue?: string
}

export interface CustomLineItem {
  id: string
  name: string
  skuCode?: string
  articleNo?: string
  priceNet: number
  quantity: number
}

export interface CustomerData {
  company: string
  firstName: string
  lastName: string
  street: string
  zip: string
  city: string
  email: string
  phone?: string
  contactPerson?: string
  customerNumber?: string
}

export interface LineItem {
  skuCode: string
  articleNo: string
  name: string
  quantity: number
  unitPriceNet: number
  totalNet: number
  priceOnRequest?: boolean
}

export interface PricingSummary {
  lineItems: LineItem[]
  totalNet: number
  vatRate: number
  vatAmount: number
  totalGross: number
  hasOnRequestItems?: boolean
}

export interface DocumentRecord {
  id?: number
  convexId?: string          // Set after sync to Convex
  document_no: string
  document_type: DocumentType
  status: DocumentStatus
  customer: CustomerData
  pricing: PricingSummary
  selectedCategory: string
  selectedBaseModelId: string
  selectedOptions: SelectedOption[]
  customLineItems?: CustomLineItem[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface OutboxRecord {
  id?: number
  document_id: number
  to_email: string
  subject: string
  html_body: string
  pdf_base64: string
  filename: string
  status: OutboxStatus
  attempts: number
  last_error?: string
  created_at: string
}

/** Local-only outbox for syncing offline-created documents to Convex */
export interface SyncOutboxRecord {
  id?: number
  type: 'DOC_CREATE'
  localDocId: number         // ID in local documents table
  payload: string            // JSON-serialized document data
  status: OutboxStatus
  attempts: number
  last_error?: string
  created_at: string
}

export interface SequenceRecord {
  key: string
  value: number
}

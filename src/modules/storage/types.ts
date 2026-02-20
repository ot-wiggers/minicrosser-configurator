import type { VariantCategory } from '@/modules/catalog/types'

export type DocumentType = 'QUOTE' | 'ORDER'
export type DocumentStatus = 'DRAFT' | 'FINAL' | 'SENT'
export type OutboxStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface SelectedOption {
  optionItemId: string
  skuCode: string
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
}

export interface PricingSummary {
  lineItems: LineItem[]
  totalNet: number
  vatRate: number
  vatAmount: number
  totalGross: number
}

export interface DocumentRecord {
  id?: number
  document_no: string
  document_type: DocumentType
  status: DocumentStatus
  customer: CustomerData
  pricing: PricingSummary
  selectedCategory: VariantCategory
  selectedBaseModelId: string
  selectedOptions: SelectedOption[]
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

export interface SequenceRecord {
  key: string
  value: number
}

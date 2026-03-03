import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ── Catalog ──────────────────────────────────────────────
  categories: defineTable({
    name: v.string(),
    sortOrder: v.number(),
    isActive: v.boolean(),
    imageStorageId: v.optional(v.id('_storage')),
  })
    .index('by_sortOrder', ['sortOrder'])
    .index('by_isActive', ['isActive', 'sortOrder']),

  baseModels: defineTable({
    categoryId: v.id('categories'),
    skuCode: v.string(),
    articleNo: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    priceNet: v.number(),
    priceGross: v.number(),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.number(),
    isActive: v.boolean(),
    priceOnRequest: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    upgradeLabel: v.optional(v.string()),
    specs: v.optional(v.array(v.object({ label: v.string(), value: v.string() }))),
  })
    .index('by_categoryId', ['categoryId', 'sortOrder'])
    .index('by_skuCode', ['skuCode'])
    .index('by_sortOrder', ['sortOrder']),

  optionGroups: defineTable({
    name: v.string(),
    selectionType: v.union(v.literal('SINGLE'), v.literal('MULTI')),
    appliesTo: v.array(v.string()), // category IDs as strings, empty = all
    sortOrder: v.number(),
    isActive: v.boolean(),
  })
    .index('by_sortOrder', ['sortOrder'])
    .index('by_isActive', ['isActive', 'sortOrder']),

  options: defineTable({
    optionGroupId: v.id('optionGroups'),
    skuCode: v.string(),
    articleNo: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    priceNet: v.number(),
    priceGross: v.number(),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.number(),
    isActive: v.boolean(),
    isDefault: v.boolean(),
    priceOnRequest: v.optional(v.boolean()),
    restrictToModels: v.optional(v.array(v.string())),
  })
    .index('by_optionGroupId', ['optionGroupId', 'sortOrder'])
    .index('by_skuCode', ['skuCode'])
    .index('by_sortOrder', ['sortOrder']),

  // ── Color Variant Images ────────────────────────────────
  colorVariantImages: defineTable({
    baseModelId: v.id('baseModels'),
    optionId: v.id('options'),
    imageStorageId: v.id('_storage'),
    sortOrder: v.number(),
  })
    .index('by_model_option', ['baseModelId', 'optionId', 'sortOrder'])
    .index('by_model', ['baseModelId', 'sortOrder']),

  // ── Documents ────────────────────────────────────────────
  documents: defineTable({
    documentNo: v.string(),
    documentType: v.union(v.literal('QUOTE'), v.literal('ORDER')),
    status: v.union(
      v.literal('DRAFT'),
      v.literal('FINAL'),
      v.literal('SENT'),
      v.literal('FOLLOW_UP'),
      v.literal('ACCEPTED'),
      v.literal('DECLINED'),
      v.literal('EXPIRED'),
      v.literal('ARCHIVED'),
    ),
    customerId: v.optional(v.id('customers')),
    customer: v.object({
      company: v.string(),
      firstName: v.string(),
      lastName: v.string(),
      street: v.string(),
      zip: v.string(),
      city: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      contactPerson: v.optional(v.string()),
      customerNumber: v.optional(v.string()),
    }),
    pricing: v.object({
      lineItems: v.array(
        v.object({
          skuCode: v.string(),
          articleNo: v.string(),
          name: v.string(),
          quantity: v.number(),
          unitPriceNet: v.number(),
          totalNet: v.number(),
          priceOnRequest: v.optional(v.boolean()),
        }),
      ),
      totalNet: v.number(),
      vatRate: v.number(),
      vatAmount: v.number(),
      totalGross: v.number(),
      hasOnRequestItems: v.optional(v.boolean()),
    }),
    selectedCategory: v.string(), // VariantCategory or dynamic category name
    selectedBaseModelId: v.string(),
    selectedOptions: v.array(
      v.object({
        optionItemId: v.string(),
        skuCode: v.string(),
        articleNo: v.string(),
        name: v.string(),
        priceNet: v.number(),
        quantity: v.number(),
        priceOnRequest: v.optional(v.boolean()),
      }),
    ),
    notes: v.optional(v.string()),
    signatureStorageId: v.optional(v.id('_storage')),
    createdBy: v.optional(v.id('users')),
    sentAt: v.optional(v.number()),
    followUpAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    pipelineNote: v.optional(v.string()),
  })
    .index('by_documentNo', ['documentNo'])
    .index('by_status', ['status'])
    .index('by_customerId', ['customerId'])
    .index('by_createdBy', ['createdBy']),

  documentVersions: defineTable({
    documentId: v.id('documents'),
    versionNumber: v.number(),
    snapshot: v.string(), // JSON-stringified full document data
    changeNote: v.optional(v.string()),
    createdBy: v.optional(v.id('users')),
  }).index('by_documentId', ['documentId', 'versionNumber']),

  // ── Customers ────────────────────────────────────────────
  customers: defineTable({
    company: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    street: v.optional(v.string()),
    zip: v.optional(v.string()),
    city: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    customerNumber: v.optional(v.string()),
    marketingConsent: v.optional(v.boolean()),
    marketingConsentDate: v.optional(v.number()),
  })
    .index('by_email', ['email'])
    .index('by_customerNumber', ['customerNumber'])
    .index('by_company', ['company']),

  // ── Auth ─────────────────────────────────────────────────
  users: defineTable({
    name: v.string(),
    username: v.optional(v.string()), // only admins have username
    passwordHash: v.optional(v.string()), // only admins
    pin: v.optional(v.string()), // only employees (hashed)
    role: v.union(v.literal('admin'), v.literal('employee')),
    isActive: v.boolean(),
    mustChangePassword: v.boolean(),
  })
    .index('by_username', ['username'])
    .index('by_role', ['role', 'isActive']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(), // timestamp ms
  })
    .index('by_token', ['token'])
    .index('by_userId', ['userId']),

  // ── Settings & System ────────────────────────────────────
  settings: defineTable({
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
  }).index('by_key', ['key']),

  sequences: defineTable({
    key: v.string(),
    value: v.number(),
  }).index('by_key', ['key']),

  // ── Outbox (E-Mail Queue) ────────────────────────────────
  outbox: defineTable({
    documentId: v.id('documents'),
    toEmail: v.string(),
    subject: v.string(),
    pdfBase64: v.string(),
    filename: v.string(),
    status: v.union(v.literal('PENDING'), v.literal('SENT'), v.literal('FAILED')),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    resendMessageId: v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_documentId', ['documentId'])
    .index('by_resendMessageId', ['resendMessageId']),

  // ── Email Events (Tracking) ────────────────────────────
  emailEvents: defineTable({
    outboxId: v.id('outbox'),
    documentId: v.id('documents'),
    resendMessageId: v.string(),
    eventType: v.union(
      v.literal('delivered'),
      v.literal('opened'),
      v.literal('clicked'),
      v.literal('bounced'),
    ),
    timestamp: v.number(),
    metadata: v.optional(v.string()),
  })
    .index('by_documentId', ['documentId', 'timestamp'])
    .index('by_resendMessageId', ['resendMessageId']),
})

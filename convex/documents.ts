import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

const customerValidator = v.object({
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
})

const lineItemValidator = v.object({
  skuCode: v.string(),
  articleNo: v.string(),
  name: v.string(),
  quantity: v.number(),
  unitPriceNet: v.number(),
  totalNet: v.number(),
  priceOnRequest: v.optional(v.boolean()),
})

const pricingValidator = v.object({
  lineItems: v.array(lineItemValidator),
  totalNet: v.number(),
  vatRate: v.number(),
  vatAmount: v.number(),
  totalGross: v.number(),
  hasOnRequestItems: v.optional(v.boolean()),
})

const selectedOptionValidator = v.object({
  optionItemId: v.string(),
  skuCode: v.string(),
  articleNo: v.string(),
  name: v.string(),
  priceNet: v.number(),
  quantity: v.number(),
  priceOnRequest: v.optional(v.boolean()),
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('documents').order('desc').collect()
  },
})

export const listByStatus = query({
  args: {
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
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query('documents')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .collect()
  },
})

export const listByCustomerId = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('documents')
      .withIndex('by_customerId', (q) => q.eq('customerId', args.customerId))
      .collect()
  },
})

export const getById = query({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

export const getByDocumentNo = query({
  args: { documentNo: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('documents')
      .withIndex('by_documentNo', (q) => q.eq('documentNo', args.documentNo))
      .first()
  },
})

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const lower = args.query.toLowerCase()
    const all = await ctx.db.query('documents').order('desc').collect()
    return all.filter(
      (d) =>
        d.documentNo.toLowerCase().includes(lower) ||
        d.customer.company.toLowerCase().includes(lower) ||
        d.customer.lastName.toLowerCase().includes(lower),
    )
  },
})

export const create = mutation({
  args: {
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
    customer: customerValidator,
    pricing: pricingValidator,
    selectedCategory: v.string(),
    selectedBaseModelId: v.string(),
    selectedOptions: v.array(selectedOptionValidator),
    customLineItems: v.optional(v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        skuCode: v.optional(v.string()),
        articleNo: v.optional(v.string()),
        priceNet: v.number(),
        quantity: v.number(),
      }),
    )),
    notes: v.optional(v.string()),
    signatureStorageId: v.optional(v.id('_storage')),
    createdBy: v.optional(v.id('users')),
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('documents', args)
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('documents'),
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
    sentAt: v.optional(v.number()),
    followUpAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    pipelineNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value
    }
    await ctx.db.patch(id, updates)
  },
})

export const updateDocument = mutation({
  args: {
    id: v.id('documents'),
    customer: v.optional(customerValidator),
    pricing: v.optional(pricingValidator),
    selectedCategory: v.optional(v.string()),
    selectedBaseModelId: v.optional(v.string()),
    selectedOptions: v.optional(v.array(selectedOptionValidator)),
    customLineItems: v.optional(v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        skuCode: v.optional(v.string()),
        articleNo: v.optional(v.string()),
        priceNet: v.number(),
        quantity: v.number(),
      }),
    )),
    notes: v.optional(v.string()),
    signatureStorageId: v.optional(v.id('_storage')),
    customerId: v.optional(v.id('customers')),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value
    }
    await ctx.db.patch(id, updates)
  },
})

export const listForPipeline = query({
  args: {
    createdBy: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    let docs
    if (args.createdBy) {
      docs = await ctx.db
        .query('documents')
        .withIndex('by_createdBy', (q) => q.eq('createdBy', args.createdBy))
        .collect()
    } else {
      docs = await ctx.db.query('documents').order('desc').collect()
    }

    const results = []
    for (const doc of docs) {
      const outboxEntries = await ctx.db
        .query('outbox')
        .withIndex('by_documentId', (q) => q.eq('documentId', doc._id))
        .collect()

      const latestOutbox = outboxEntries.length > 0
        ? outboxEntries.sort((a, b) => b._creationTime - a._creationTime)[0]
        : null

      const emailEvents = await ctx.db
        .query('emailEvents')
        .withIndex('by_documentId', (q) => q.eq('documentId', doc._id))
        .collect()
      const latestEvent = emailEvents.length > 0
        ? emailEvents.sort((a, b) => b.timestamp - a.timestamp)[0]
        : null

      results.push({
        ...doc,
        emailStatus: latestOutbox?.status ?? null,
        emailEvent: latestEvent?.eventType ?? null,
        emailError: latestOutbox?.status === 'FAILED' ? latestOutbox.lastError : null,
      })
    }

    return results
  },
})

export const remove = mutation({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

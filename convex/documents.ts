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
})

const pricingValidator = v.object({
  lineItems: v.array(lineItemValidator),
  totalNet: v.number(),
  vatRate: v.number(),
  vatAmount: v.number(),
  totalGross: v.number(),
})

const selectedOptionValidator = v.object({
  optionItemId: v.string(),
  skuCode: v.string(),
  articleNo: v.string(),
  name: v.string(),
  priceNet: v.number(),
  quantity: v.number(),
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('documents').order('desc').collect()
  },
})

export const listByStatus = query({
  args: {
    status: v.union(v.literal('DRAFT'), v.literal('FINAL'), v.literal('SENT')),
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
    status: v.union(v.literal('DRAFT'), v.literal('FINAL'), v.literal('SENT')),
    customerId: v.optional(v.id('customers')),
    customer: customerValidator,
    pricing: pricingValidator,
    selectedCategory: v.string(),
    selectedBaseModelId: v.string(),
    selectedOptions: v.array(selectedOptionValidator),
    notes: v.optional(v.string()),
    signatureStorageId: v.optional(v.id('_storage')),
    createdBy: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('documents', args)
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('documents'),
    status: v.union(v.literal('DRAFT'), v.literal('FINAL'), v.literal('SENT')),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status })
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

export const remove = mutation({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

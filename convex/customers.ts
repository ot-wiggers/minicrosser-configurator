import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('customers').order('desc').collect()
  },
})

export const getById = query({
  args: { id: v.id('customers') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('customers')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()
  },
})

export const getByCustomerNumber = query({
  args: { customerNumber: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('customers')
      .withIndex('by_customerNumber', (q) => q.eq('customerNumber', args.customerNumber))
      .first()
  },
})

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const lower = args.query.toLowerCase()
    const all = await ctx.db.query('customers').collect()
    return all.filter(
      (c) =>
        c.company.toLowerCase().includes(lower) ||
        c.lastName.toLowerCase().includes(lower) ||
        c.firstName.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        (c.customerNumber?.toLowerCase().includes(lower) ?? false),
    )
  },
})

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('customers', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('customers'),
    company: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    street: v.optional(v.string()),
    zip: v.optional(v.string()),
    city: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    customerNumber: v.optional(v.string()),
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
  args: { id: v.id('customers') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

/**
 * Find or create a customer from document customer data.
 * Used during document creation for auto-customer-linking.
 */
export const findOrCreate = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    // Try to find by email first
    if (args.email) {
      const existing = await ctx.db
        .query('customers')
        .withIndex('by_email', (q) => q.eq('email', args.email))
        .first()
      if (existing) return existing._id
    }

    // Try by customer number
    if (args.customerNumber) {
      const existing = await ctx.db
        .query('customers')
        .withIndex('by_customerNumber', (q) =>
          q.eq('customerNumber', args.customerNumber),
        )
        .first()
      if (existing) return existing._id
    }

    // Create new customer
    return ctx.db.insert('customers', args)
  },
})

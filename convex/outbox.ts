import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('outbox').order('desc').collect()
  },
})

export const listPending = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('outbox')
      .withIndex('by_status', (q) => q.eq('status', 'PENDING'))
      .collect()
  },
})

export const listByDocumentId = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, args) => {
    const all = await ctx.db.query('outbox').collect()
    return all.filter((o) => o.documentId === args.documentId)
  },
})

export const create = mutation({
  args: {
    documentId: v.id('documents'),
    toEmail: v.string(),
    subject: v.string(),
    pdfBase64: v.string(),
    filename: v.string(),
    status: v.union(v.literal('PENDING'), v.literal('SENT'), v.literal('FAILED')),
    attempts: v.number(),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('outbox', args)
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('outbox'),
    status: v.union(v.literal('PENDING'), v.literal('SENT'), v.literal('FAILED')),
    lastError: v.optional(v.string()),
    attempts: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { status: args.status }
    if (args.lastError !== undefined) updates.lastError = args.lastError
    if (args.attempts !== undefined) updates.attempts = args.attempts
    await ctx.db.patch(args.id, updates)
  },
})

export const incrementAttempts = mutation({
  args: { id: v.id('outbox') },
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id)
    if (record) {
      await ctx.db.patch(args.id, { attempts: record.attempts + 1 })
    }
  },
})

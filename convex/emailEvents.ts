import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const listByDocumentId = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('emailEvents')
      .withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
      .collect()
  },
})

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('emailEvents', args)
  },
})

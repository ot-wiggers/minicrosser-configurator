import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('customerActions').withIndex('by_sortOrder').collect()
  },
})

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('customerActions').withIndex('by_sortOrder').collect()
    return all.filter((a) => a.isActive)
  },
})

export const create = mutation({
  args: {
    label: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('customerActions', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('customerActions'),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
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
  args: { id: v.id('customerActions') },
  handler: async (ctx, args) => {
    // Also delete all action items referencing this action
    const items = await ctx.db
      .query('customerActionItems')
      .filter((q) => q.eq(q.field('actionId'), args.id))
      .collect()
    for (const item of items) {
      await ctx.db.delete(item._id)
    }
    await ctx.db.delete(args.id)
  },
})

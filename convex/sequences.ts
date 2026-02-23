import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getNext = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('sequences')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()

    if (existing) {
      const nextValue = existing.value + 1
      await ctx.db.patch(existing._id, { value: nextValue })
      return nextValue
    } else {
      await ctx.db.insert('sequences', { key: args.key, value: 1 })
      return 1
    }
  },
})

export const getCurrent = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('sequences')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    return existing?.value ?? 0
  },
})

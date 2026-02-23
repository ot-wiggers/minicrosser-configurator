import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('settings').collect()
  },
})

export const getByKey = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
  },
})

export const getValue = query({
  args: {
    key: v.string(),
    defaultValue: v.union(v.string(), v.number(), v.boolean()),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    return record ? record.value : args.defaultValue
  },
})

export const set = mutation({
  args: {
    key: v.string(),
    value: v.union(v.string(), v.number(), v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value })
    } else {
      await ctx.db.insert('settings', { key: args.key, value: args.value })
    }
  },
})

export const setMany = mutation({
  args: {
    entries: v.array(
      v.object({
        key: v.string(),
        value: v.union(v.string(), v.number(), v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      const existing = await ctx.db
        .query('settings')
        .withIndex('by_key', (q) => q.eq('key', entry.key))
        .first()
      if (existing) {
        await ctx.db.patch(existing._id, { value: entry.value })
      } else {
        await ctx.db.insert('settings', { key: entry.key, value: entry.value })
      }
    }
  },
})

export const remove = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .first()
    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})

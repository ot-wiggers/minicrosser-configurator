import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('optionGroups').withIndex('by_sortOrder').collect()
  },
})

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query('optionGroups')
      .withIndex('by_isActive', (q) => q.eq('isActive', true))
      .collect()
  },
})

export const listForCategory = query({
  args: { categoryId: v.string() },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query('optionGroups')
      .withIndex('by_isActive', (q) => q.eq('isActive', true))
      .collect()
    return groups.filter(
      (g) => g.appliesTo.length === 0 || g.appliesTo.includes(args.categoryId),
    )
  },
})

/**
 * Returns active option groups (with their active options) that apply to a given category.
 * Used by the accessory-picker in the configurator.
 */
export const listWithOptionsForCategory = query({
  args: { categoryId: v.string() },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query('optionGroups')
      .withIndex('by_isActive', (q) => q.eq('isActive', true))
      .collect()
    const applicable = groups
      .filter((g) => g.appliesTo.length === 0 || g.appliesTo.includes(args.categoryId))
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const result = []
    for (const group of applicable) {
      const options = await ctx.db
        .query('options')
        .withIndex('by_optionGroupId', (q) => q.eq('optionGroupId', group._id))
        .collect()
      const activeOptions = options
        .filter((o) => o.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const optionsWithImages = await Promise.all(
        activeOptions.map(async (opt) => ({
          ...opt,
          imageUrl: opt.imageStorageId
            ? await ctx.storage.getUrl(opt.imageStorageId)
            : null,
        })),
      )
      result.push({ group, items: optionsWithImages })
    }
    return result
  },
})

export const getById = query({
  args: { id: v.id('optionGroups') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    selectionType: v.union(v.literal('SINGLE'), v.literal('MULTI')),
    appliesTo: v.array(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('optionGroups', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('optionGroups'),
    name: v.optional(v.string()),
    selectionType: v.optional(v.union(v.literal('SINGLE'), v.literal('MULTI'))),
    appliesTo: v.optional(v.array(v.string())),
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
  args: { id: v.id('optionGroups') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

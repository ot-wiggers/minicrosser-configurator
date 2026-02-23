import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query('categories').withIndex('by_sortOrder').collect()
    return Promise.all(
      categories.map(async (cat) => ({
        ...cat,
        imageUrl: cat.imageStorageId
          ? await ctx.storage.getUrl(cat.imageStorageId)
          : null,
      })),
    )
  },
})

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query('categories')
      .withIndex('by_isActive', (q) => q.eq('isActive', true))
      .collect()
    return Promise.all(
      categories.map(async (cat) => ({
        ...cat,
        imageUrl: cat.imageStorageId
          ? await ctx.storage.getUrl(cat.imageStorageId)
          : null,
      })),
    )
  },
})

export const getById = query({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    const cat = await ctx.db.get(args.id)
    if (!cat) return null
    return {
      ...cat,
      imageUrl: cat.imageStorageId
        ? await ctx.storage.getUrl(cat.imageStorageId)
        : null,
    }
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    sortOrder: v.number(),
    isActive: v.boolean(),
    imageStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('categories', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('categories'),
    name: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id('_storage')),
    removeImage: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, removeImage, ...fields } = args
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value
    }
    if (removeImage) {
      updates.imageStorageId = undefined
    }
    await ctx.db.patch(id, updates)
  },
})

export const remove = mutation({
  args: { id: v.id('categories') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

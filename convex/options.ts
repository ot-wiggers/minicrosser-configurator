import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const options = await ctx.db.query('options').withIndex('by_sortOrder').collect()
    return Promise.all(
      options.map(async (opt) => ({
        ...opt,
        imageUrl: opt.imageStorageId
          ? await ctx.storage.getUrl(opt.imageStorageId)
          : null,
      })),
    )
  },
})

export const listByGroupId = query({
  args: { optionGroupId: v.id('optionGroups') },
  handler: async (ctx, args) => {
    const options = await ctx.db
      .query('options')
      .withIndex('by_optionGroupId', (q) => q.eq('optionGroupId', args.optionGroupId))
      .collect()
    return Promise.all(
      options.map(async (opt) => ({
        ...opt,
        imageUrl: opt.imageStorageId
          ? await ctx.storage.getUrl(opt.imageStorageId)
          : null,
      })),
    )
  },
})

export const listActiveByGroupId = query({
  args: { optionGroupId: v.id('optionGroups') },
  handler: async (ctx, args) => {
    const options = await ctx.db
      .query('options')
      .withIndex('by_optionGroupId', (q) => q.eq('optionGroupId', args.optionGroupId))
      .collect()
    const active = options.filter((o) => o.isActive)
    return Promise.all(
      active.map(async (opt) => ({
        ...opt,
        imageUrl: opt.imageStorageId
          ? await ctx.storage.getUrl(opt.imageStorageId)
          : null,
      })),
    )
  },
})

export const getById = query({
  args: { id: v.id('options') },
  handler: async (ctx, args) => {
    const opt = await ctx.db.get(args.id)
    if (!opt) return null
    return {
      ...opt,
      imageUrl: opt.imageStorageId
        ? await ctx.storage.getUrl(opt.imageStorageId)
        : null,
    }
  },
})

export const getBySkuCode = query({
  args: { skuCode: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('options')
      .withIndex('by_skuCode', (q) => q.eq('skuCode', args.skuCode))
      .first()
  },
})

export const create = mutation({
  args: {
    optionGroupId: v.id('optionGroups'),
    skuCode: v.string(),
    articleNo: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    priceNet: v.number(),
    priceGross: v.number(),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.number(),
    isActive: v.boolean(),
    isDefault: v.boolean(),
    priceOnRequest: v.optional(v.boolean()),
    restrictToModels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('options', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('options'),
    optionGroupId: v.optional(v.id('optionGroups')),
    skuCode: v.optional(v.string()),
    articleNo: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    priceNet: v.optional(v.number()),
    priceGross: v.optional(v.number()),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    priceOnRequest: v.optional(v.boolean()),
    restrictToModels: v.optional(v.array(v.string())),
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
  args: { id: v.id('options') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const models = await ctx.db.query('baseModels').withIndex('by_sortOrder').collect()
    return Promise.all(
      models.map(async (m) => ({
        ...m,
        imageUrl: m.imageStorageId
          ? await ctx.storage.getUrl(m.imageStorageId)
          : null,
      })),
    )
  },
})

export const listByCategory = query({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, args) => {
    const models = await ctx.db
      .query('baseModels')
      .withIndex('by_categoryId', (q) => q.eq('categoryId', args.categoryId))
      .collect()
    return Promise.all(
      models.map(async (m) => ({
        ...m,
        imageUrl: m.imageStorageId
          ? await ctx.storage.getUrl(m.imageStorageId)
          : null,
      })),
    )
  },
})

export const listActiveByCategory = query({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, args) => {
    const models = await ctx.db
      .query('baseModels')
      .withIndex('by_categoryId', (q) => q.eq('categoryId', args.categoryId))
      .collect()
    const active = models.filter((m) => m.isActive)
    return Promise.all(
      active.map(async (m) => ({
        ...m,
        imageUrl: m.imageStorageId
          ? await ctx.storage.getUrl(m.imageStorageId)
          : null,
      })),
    )
  },
})

export const getById = query({
  args: { id: v.id('baseModels') },
  handler: async (ctx, args) => {
    const m = await ctx.db.get(args.id)
    if (!m) return null
    return {
      ...m,
      imageUrl: m.imageStorageId
        ? await ctx.storage.getUrl(m.imageStorageId)
        : null,
    }
  },
})

export const getBySkuCode = query({
  args: { skuCode: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('baseModels')
      .withIndex('by_skuCode', (q) => q.eq('skuCode', args.skuCode))
      .first()
  },
})

export const create = mutation({
  args: {
    categoryId: v.id('categories'),
    skuCode: v.string(),
    articleNo: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    priceNet: v.number(),
    priceGross: v.number(),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.number(),
    isActive: v.boolean(),
    priceOnRequest: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    upgradeLabel: v.optional(v.string()),
    specs: v.optional(v.array(v.object({ label: v.string(), value: v.string() }))),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('baseModels', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('baseModels'),
    categoryId: v.optional(v.id('categories')),
    skuCode: v.optional(v.string()),
    articleNo: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    priceNet: v.optional(v.number()),
    priceGross: v.optional(v.number()),
    imageStorageId: v.optional(v.id('_storage')),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    priceOnRequest: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    upgradeLabel: v.optional(v.string()),
    specs: v.optional(v.array(v.object({ label: v.string(), value: v.string() }))),
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

export const getDefaultByCategory = query({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, args) => {
    const models = await ctx.db
      .query('baseModels')
      .withIndex('by_categoryId', (q) => q.eq('categoryId', args.categoryId))
      .collect()
    const defaultModel = models.find((m) => m.isDefault && m.isActive)
    if (!defaultModel) return null
    return {
      ...defaultModel,
      imageUrl: defaultModel.imageStorageId
        ? await ctx.storage.getUrl(defaultModel.imageStorageId)
        : null,
    }
  },
})

export const remove = mutation({
  args: { id: v.id('baseModels') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})

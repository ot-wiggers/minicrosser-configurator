import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

/**
 * List all color variant images for a specific model + color option.
 */
export const listByModelAndOption = query({
  args: {
    baseModelId: v.id('baseModels'),
    optionId: v.id('options'),
  },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query('colorVariantImages')
      .withIndex('by_model_option', (q) =>
        q.eq('baseModelId', args.baseModelId).eq('optionId', args.optionId),
      )
      .collect()

    return Promise.all(
      images.map(async (img) => ({
        ...img,
        imageUrl: await ctx.storage.getUrl(img.imageStorageId),
      })),
    )
  },
})

/**
 * List all color variant images for a model (across all colors).
 */
export const listByModel = query({
  args: { baseModelId: v.id('baseModels') },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query('colorVariantImages')
      .withIndex('by_model', (q) => q.eq('baseModelId', args.baseModelId))
      .collect()

    return Promise.all(
      images.map(async (img) => ({
        ...img,
        imageUrl: await ctx.storage.getUrl(img.imageStorageId),
      })),
    )
  },
})

/**
 * Create a new color variant image entry.
 */
export const create = mutation({
  args: {
    baseModelId: v.id('baseModels'),
    optionId: v.id('options'),
    imageStorageId: v.id('_storage'),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('colorVariantImages', args)
  },
})

/**
 * Remove a color variant image and delete the stored file.
 */
export const remove = mutation({
  args: { id: v.id('colorVariantImages') },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id)
    if (image) {
      await ctx.storage.delete(image.imageStorageId)
      await ctx.db.delete(args.id)
    }
  },
})

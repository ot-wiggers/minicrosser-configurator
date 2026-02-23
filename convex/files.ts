import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Generate a short-lived upload URL for the client to upload a file.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return ctx.storage.generateUploadUrl()
  },
})

/**
 * Get a URL for a stored file by its storage ID.
 */
export const getUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    return ctx.storage.getUrl(args.storageId)
  },
})

/**
 * Delete a stored file by its storage ID.
 */
export const deleteFile = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId)
  },
})

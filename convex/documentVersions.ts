import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const listByDocument = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('documentVersions')
      .withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
      .collect()
  },
})

export const create = mutation({
  args: {
    documentId: v.id('documents'),
    versionNumber: v.number(),
    snapshot: v.string(),
    changeNote: v.optional(v.string()),
    createdBy: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('documentVersions', args)
  },
})

export const getLatestVersion = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query('documentVersions')
      .withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
      .collect()
    if (versions.length === 0) return null
    return versions.reduce((max, v) => (v.versionNumber > max.versionNumber ? v : max))
  },
})

import { v } from 'convex/values'
import { query, mutation, internalMutation } from './_generated/server'

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()
    if (!session) return null
    if (session.expiresAt < Date.now()) {
      // Session expired
      return null
    }
    return session
  },
})

export const create = mutation({
  args: {
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('sessions', args)
  },
})

export const deleteByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()
    if (session) {
      await ctx.db.delete(session._id)
    }
  },
})

export const deleteByUserId = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .collect()
    for (const session of sessions) {
      await ctx.db.delete(session._id)
    }
  },
})

/** Cleanup expired sessions — call via scheduled function or cron */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const allSessions = await ctx.db.query('sessions').collect()
    let cleaned = 0
    for (const session of allSessions) {
      if (session.expiresAt < now) {
        await ctx.db.delete(session._id)
        cleaned++
      }
    }
    return { cleaned }
  },
})

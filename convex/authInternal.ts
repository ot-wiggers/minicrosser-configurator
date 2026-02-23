import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'

// ── Internal helpers (run in V8 isolate, no bcrypt) ──

/** Find user by username (internal only) */
export const getUserByUsername = internalQuery({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first()
  },
})

/** Get user by ID (internal only) */
export const getUserById = internalQuery({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

/** Create a session (internal only) */
export const createSession = internalMutation({
  args: {
    userId: v.id('users'),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('sessions', {
      userId: args.userId,
      token: args.token,
      expiresAt: args.expiresAt,
    })
  },
})

/** Update a user's password hash (internal only) */
export const updatePasswordHash = internalMutation({
  args: {
    userId: v.id('users'),
    passwordHash: v.string(),
    mustChangePassword: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      mustChangePassword: args.mustChangePassword,
    })
  },
})

/** Update a user's PIN hash (internal only) */
export const updatePinHash = internalMutation({
  args: {
    userId: v.id('users'),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { pin: args.pin })
  },
})

/** Find session by token (internal) */
export const getSessionByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()
  },
})

/** Delete a session (internal) */
export const deleteSession = internalMutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId)
  },
})

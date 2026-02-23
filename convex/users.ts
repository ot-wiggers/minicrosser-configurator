import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    // Never expose password hashes or PIN hashes in queries
    return users.map(({ passwordHash: _pw, pin: _pin, ...rest }) => rest)
  },
})

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()
    return users.map(({ passwordHash: _pw, pin: _pin, ...rest }) => rest)
  },
})

export const listActiveEmployees = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query('users')
      .withIndex('by_role', (q) => q.eq('role', 'employee').eq('isActive', true))
      .collect()
    return users.map(({ passwordHash: _pw, pin: _pin, ...rest }) => rest)
  },
})

export const getById = query({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id)
    if (!user) return null
    const { passwordHash: _pw, pin: _pin, ...rest } = user
    return rest
  },
})

export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first()
  },
})

/** Internal: get full user with hashes (for auth only) */
export const getByUsernameInternal = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first()
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    username: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    pin: v.optional(v.string()),
    role: v.union(v.literal('admin'), v.literal('employee')),
    isActive: v.boolean(),
    mustChangePassword: v.boolean(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('users', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('users'),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    role: v.optional(v.union(v.literal('admin'), v.literal('employee'))),
    isActive: v.optional(v.boolean()),
    mustChangePassword: v.optional(v.boolean()),
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

export const updatePassword = mutation({
  args: {
    id: v.id('users'),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      passwordHash: args.passwordHash,
      mustChangePassword: false,
    })
  },
})

export const updatePin = mutation({
  args: {
    id: v.id('users'),
    pin: v.string(), // hashed PIN
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { pin: args.pin })
  },
})

export const remove = mutation({
  args: { id: v.id('users') },
  handler: async (ctx, args) => {
    // Also delete all sessions for this user
    const sessions = await ctx.db
      .query('sessions')
      .withIndex('by_userId', (q) => q.eq('userId', args.id))
      .collect()
    for (const session of sessions) {
      await ctx.db.delete(session._id)
    }
    await ctx.db.delete(args.id)
  },
})

export const count = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect()
    return users.length
  },
})

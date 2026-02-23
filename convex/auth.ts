import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * Login an admin user with username and password.
 * Password verification uses bcryptjs on the server side.
 */
export const loginAdmin = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .first()

    if (!user || !user.passwordHash || user.role !== 'admin') {
      throw new Error('Ungültige Anmeldedaten')
    }

    if (!user.isActive) {
      throw new Error('Benutzer ist deaktiviert')
    }

    // Dynamic import bcryptjs for server-side password verification
    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(args.password, user.passwordHash)
    if (!isValid) {
      throw new Error('Ungültige Anmeldedaten')
    }

    // Generate session token
    const token = generateToken()
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

    await ctx.db.insert('sessions', {
      userId: user._id,
      token,
      expiresAt,
    })

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    }
  },
})

/**
 * Login an employee with their user ID and PIN.
 */
export const loginEmployee = mutation({
  args: {
    userId: v.id('users'),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId)

    if (!user || !user.pin || user.role !== 'employee') {
      throw new Error('Ungültige Anmeldedaten')
    }

    if (!user.isActive) {
      throw new Error('Benutzer ist deaktiviert')
    }

    // Verify PIN using bcryptjs
    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(args.pin, user.pin)
    if (!isValid) {
      throw new Error('Ungültige PIN')
    }

    // Generate session token
    const token = generateToken()
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000 // 12 hours for employees

    await ctx.db.insert('sessions', {
      userId: user._id,
      token,
      expiresAt,
    })

    return {
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        mustChangePassword: false,
      },
    }
  },
})

/**
 * Validate an existing session token.
 */
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!session || session.expiresAt < Date.now()) {
      return null
    }

    const user = await ctx.db.get(session.userId)
    if (!user || !user.isActive) {
      return null
    }

    return {
      id: user._id,
      name: user.name,
      username: user.username,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    }
  },
})

/**
 * Logout by deleting the session.
 */
export const logout = mutation({
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

/**
 * Change password for the currently authenticated user.
 */
export const changePassword = mutation({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Nicht authentifiziert')
    }

    const user = await ctx.db.get(session.userId)
    if (!user || !user.passwordHash) {
      throw new Error('Benutzer nicht gefunden')
    }

    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(args.currentPassword, user.passwordHash)
    if (!isValid) {
      throw new Error('Aktuelles Passwort ist falsch')
    }

    const newHash = await bcrypt.hash(args.newPassword, 10)
    await ctx.db.patch(user._id, {
      passwordHash: newHash,
      mustChangePassword: false,
    })
  },
})

/**
 * Change PIN for the currently authenticated user.
 */
export const changePin = mutation({
  args: {
    token: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Nicht authentifiziert')
    }

    const user = await ctx.db.get(session.userId)
    if (!user) {
      throw new Error('Benutzer nicht gefunden')
    }

    const bcrypt = await import('bcryptjs')
    const hashedPin = await bcrypt.hash(args.newPin, 10)
    await ctx.db.patch(user._id, { pin: hashedPin })
  },
})

// Simple token generator
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `mc_${Date.now()}_${token}`
}

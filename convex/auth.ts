"use node"

import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'

// ── Type definitions for return values ──

interface AdminLoginResult {
  token: string
  user: {
    id: string
    name: string
    username: string | undefined
    role: string
    mustChangePassword: boolean
  }
}

interface EmployeeLoginResult {
  token: string
  user: {
    id: string
    name: string
    role: string
    mustChangePassword: boolean
  }
}

interface SessionUser {
  id: string
  name: string
  username: string | undefined
  role: string
  mustChangePassword: boolean
}

// ── Public Actions (run in Node.js, bcrypt available) ──

/**
 * Login an admin user with username and password.
 */
export const loginAdmin = action({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<AdminLoginResult> => {
    const user = await ctx.runQuery(internal.authInternal.getUserByUsername, {
      username: args.username,
    })

    if (!user || !user.passwordHash || user.role !== 'admin') {
      throw new Error('Ungültige Anmeldedaten')
    }

    if (!user.isActive) {
      throw new Error('Benutzer ist deaktiviert')
    }

    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(args.password, user.passwordHash)
    if (!isValid) {
      throw new Error('Ungültige Anmeldedaten')
    }

    // Generate session token
    const token = generateToken()
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

    await ctx.runMutation(internal.authInternal.createSession, {
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
export const loginEmployee = action({
  args: {
    userId: v.id('users'),
    pin: v.string(),
  },
  handler: async (ctx, args): Promise<EmployeeLoginResult> => {
    const user = await ctx.runQuery(internal.authInternal.getUserById, {
      id: args.userId,
    })

    if (!user || !user.pin) {
      throw new Error('Ungültige Anmeldedaten')
    }

    if (!user.isActive) {
      throw new Error('Benutzer ist deaktiviert')
    }

    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(args.pin, user.pin)
    if (!isValid) {
      throw new Error('Ungültige PIN')
    }

    const token = generateToken()
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000 // 12 hours

    await ctx.runMutation(internal.authInternal.createSession, {
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
 * Change password for the currently authenticated user.
 */
export const changePassword = action({
  args: {
    token: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.runQuery(
      internal.authInternal.getSessionByToken,
      { token: args.token },
    )

    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Nicht authentifiziert')
    }

    const user = await ctx.runQuery(internal.authInternal.getUserById, {
      id: session.userId,
    })
    if (!user || !user.passwordHash) {
      throw new Error('Benutzer nicht gefunden')
    }

    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(args.currentPassword, user.passwordHash)
    if (!isValid) {
      throw new Error('Aktuelles Passwort ist falsch')
    }

    const newHash = await bcrypt.hash(args.newPassword, 10)
    await ctx.runMutation(internal.authInternal.updatePasswordHash, {
      userId: user._id,
      passwordHash: newHash,
      mustChangePassword: false,
    })
  },
})

/**
 * Change PIN for the currently authenticated user.
 */
export const changePin = action({
  args: {
    token: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.runQuery(
      internal.authInternal.getSessionByToken,
      { token: args.token },
    )

    if (!session || session.expiresAt < Date.now()) {
      throw new Error('Nicht authentifiziert')
    }

    const user = await ctx.runQuery(internal.authInternal.getUserById, {
      id: session.userId,
    })
    if (!user) {
      throw new Error('Benutzer nicht gefunden')
    }

    const bcrypt = await import('bcryptjs')
    const hashedPin = await bcrypt.hash(args.newPin, 10)
    await ctx.runMutation(internal.authInternal.updatePinHash, {
      userId: user._id,
      pin: hashedPin,
    })
  },
})

/**
 * Validate an existing session token.
 */
export const validateSession = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<SessionUser | null> => {
    const session = await ctx.runQuery(
      internal.authInternal.getSessionByToken,
      { token: args.token },
    )

    if (!session || session.expiresAt < Date.now()) {
      return null
    }

    const user = await ctx.runQuery(internal.authInternal.getUserById, {
      id: session.userId,
    })
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
export const logout = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const session = await ctx.runQuery(
      internal.authInternal.getSessionByToken,
      { token: args.token },
    )
    if (session) {
      await ctx.runMutation(internal.authInternal.deleteSession, {
        sessionId: session._id,
      })
    }
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

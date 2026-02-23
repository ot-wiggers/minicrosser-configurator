import type { QueryCtx, MutationCtx } from '../_generated/server'

/**
 * Validate a session token and return the user info.
 * Throws if the session is invalid or expired.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined,
): Promise<{ userId: string; role: 'admin' | 'employee'; name: string }> {
  if (!token) {
    throw new Error('Not authenticated')
  }

  const session = await ctx.db
    .query('sessions')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .withIndex('by_token', (q: any) => q.eq('token', token))
    .first()

  if (!session) {
    throw new Error('Invalid session')
  }

  if (session.expiresAt < Date.now()) {
    throw new Error('Session expired')
  }

  const user = await ctx.db.get(session.userId)
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive')
  }

  return {
    userId: user._id,
    role: user.role,
    name: user.name,
  }
}

/**
 * Validate session and require admin role.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined,
) {
  const auth = await requireAuth(ctx, token)
  if (auth.role !== 'admin') {
    throw new Error('Admin access required')
  }
  return auth
}

/**
 * Optionally validate a session. Returns null if no token is provided.
 */
export async function optionalAuth(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined,
): Promise<{ userId: string; role: 'admin' | 'employee'; name: string } | null> {
  if (!token) return null
  try {
    return await requireAuth(ctx, token)
  } catch {
    return null
  }
}

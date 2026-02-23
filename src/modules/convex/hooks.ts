'use client'

import { useQuery as useConvexQuery } from 'convex/react'
import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server'

/**
 * Hook that uses Convex as primary data source.
 * When Convex is unavailable (offline), data falls back to undefined.
 *
 * In Phase 7 we'll add Dexie cache fallback.
 * For now, this is a simple wrapper around useQuery.
 */
export function useConvexWithCache<
  Query extends FunctionReference<'query'>,
>(
  query: Query,
  args: FunctionArgs<Query>,
): FunctionReturnType<Query> | undefined {
  return useConvexQuery(query, args)
}

/**
 * Alias for direct Convex query usage.
 * Components should import this instead of directly from 'convex/react'
 * to make future offline-cache integration easier.
 */
export { useQuery, useMutation, useAction } from 'convex/react'

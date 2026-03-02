'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { useOnlineStatus } from './use-online-status'

type ConvexQueryRef = { [key: string]: any }

/**
 * Wraps Convex useQuery with an offline fallback to Dexie/IndexedDB.
 *
 * - Online: returns Convex data (real-time subscriptions)
 * - Offline: executes dexieFallback() and returns cached data
 * - Loading (online but no data yet): returns undefined
 *
 * @param queryRef - Convex api reference, e.g. api.categories.listActive
 * @param args - Query arguments, or 'skip' to skip the query
 * @param dexieFallback - Async function returning cached data from Dexie
 */
export function useOfflineQuery<TData>(
  queryRef: ConvexQueryRef,
  args: Record<string, unknown> | 'skip',
  dexieFallback: () => Promise<TData>,
): TData | undefined {
  const isOnline = useOnlineStatus()
  const convexData = useQuery(queryRef as any, args as any)
  const [offlineData, setOfflineData] = useState<TData | undefined>(undefined)
  const fallbackRef = useRef(dexieFallback)
  fallbackRef.current = dexieFallback

  useEffect(() => {
    // Only use Dexie fallback when offline AND convex has no data
    if (!isOnline && convexData === undefined && args !== 'skip') {
      let cancelled = false
      fallbackRef.current()
        .then((data) => {
          if (!cancelled) setOfflineData(data)
        })
        .catch((err) => {
          console.warn('useOfflineQuery: Dexie fallback failed', err)
        })
      return () => { cancelled = true }
    }
    // When back online, clear offline data so Convex takes over
    if (isOnline) {
      setOfflineData(undefined)
    }
  }, [isOnline, convexData, args])

  // Online: prefer Convex data
  if (convexData !== undefined) return convexData

  // Offline: use Dexie data
  if (!isOnline && offlineData !== undefined) return offlineData

  // Loading state
  return undefined
}

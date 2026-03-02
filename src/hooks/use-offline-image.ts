'use client'

import { useState, useEffect } from 'react'
import { useOnlineStatus } from './use-online-status'
import { db } from '@/modules/storage/db'

type TableName = 'categories' | 'baseModels' | 'options'

/**
 * Returns an image URL that works both online and offline.
 *
 * - Online: returns the Convex imageUrl directly
 * - Offline: loads the imageBlob from Dexie and creates a blob URL
 *
 * @param imageUrl - Convex signed image URL (may be null/undefined)
 * @param recordId - The Dexie record ID to look up the blob
 * @param table - Which Dexie table to query
 */
export function useOfflineImage(
  imageUrl: string | null | undefined,
  recordId: string,
  table: TableName,
): string | null {
  const isOnline = useOnlineStatus()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    // Online and have a URL — use it directly, no blob needed
    if (isOnline && imageUrl) {
      setBlobUrl(null)
      return
    }

    // Offline (or no imageUrl) — try to load blob from Dexie
    if (!isOnline) {
      let cancelled = false
      let objectUrl: string | null = null

      const loadBlob = async () => {
        try {
          const record = await (db[table] as any).get(recordId)
          if (cancelled || !record?.imageBlob) return
          objectUrl = URL.createObjectURL(record.imageBlob)
          setBlobUrl(objectUrl)
        } catch (err) {
          console.warn('useOfflineImage: failed to load blob', err)
        }
      }
      loadBlob()

      return () => {
        cancelled = true
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    }
  }, [isOnline, imageUrl, recordId, table])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  // Online: use Convex URL
  if (isOnline && imageUrl) return imageUrl

  // Offline: use blob URL
  if (!isOnline && blobUrl) return blobUrl

  // No image available
  return null
}

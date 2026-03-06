'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { db } from '@/modules/storage/db'

/**
 * CacheSync — subscribes to key Convex queries and writes data to
 * Dexie/IndexedDB for offline read access. Also fetches and caches
 * image blobs for offline display.
 */
export function CacheSync() {
  const categories = useQuery(api.categories.list)
  const baseModels = useQuery(api.baseModels.list)
  const optionGroups = useQuery(api.optionGroups.list)
  const options = useQuery(api.options.list)
  const settings = useQuery(api.settings.list)

  const lastSyncRef = useRef<Record<string, string>>({})

  // Sync categories
  useEffect(() => {
    if (!categories) return
    const hash = JSON.stringify(categories.map((c: any) => `${c._id}-${c.imageStorageId}`))
    if (lastSyncRef.current.categories === hash) return
    lastSyncRef.current.categories = hash
    syncCategories(categories).catch(console.error)
  }, [categories])

  // Sync baseModels
  useEffect(() => {
    if (!baseModels) return
    const hash = JSON.stringify(baseModels.map((m: any) => `${m._id}-${m.imageStorageId}`))
    if (lastSyncRef.current.baseModels === hash) return
    lastSyncRef.current.baseModels = hash
    syncBaseModels(baseModels).catch(console.error)
  }, [baseModels])

  // Sync optionGroups
  useEffect(() => {
    if (!optionGroups) return
    const hash = JSON.stringify(optionGroups.map((g: any) => g._id))
    if (lastSyncRef.current.optionGroups === hash) return
    lastSyncRef.current.optionGroups = hash
    syncOptionGroups(optionGroups).catch(console.error)
  }, [optionGroups])

  // Sync options
  useEffect(() => {
    if (!options) return
    const hash = JSON.stringify(options.map((o: any) => `${o._id}-${o.imageStorageId}`))
    if (lastSyncRef.current.options === hash) return
    lastSyncRef.current.options = hash
    syncOptions(options).catch(console.error)
  }, [options])

  // Sync settings
  useEffect(() => {
    if (!settings) return
    const hash = JSON.stringify(settings.map((s: any) => s.key))
    if (lastSyncRef.current.settings === hash) return
    lastSyncRef.current.settings = hash
    syncSettings(settings).catch(console.error)
  }, [settings])

  return null
}

// ── Image blob helper ───────────────────────────────────────────

async function fetchImageBlob(imageUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null
    return await response.blob()
  } catch {
    return null
  }
}

/**
 * After syncing data rows, check which items need image blob updates.
 * Only fetches images where imageStorageId differs from what's cached.
 */
async function syncImageBlobs(
  table: 'categories' | 'baseModels' | 'options',
  items: Array<{ id: string; imageStorageId?: string | null; imageUrl?: string | null }>,
) {
  for (const item of items) {
    if (!item.imageUrl || !item.imageStorageId) continue

    try {
      const existing = await (db[table] as any).get(item.id)
      // Skip if blob already cached for this imageStorageId
      if (existing?.imageStorageId === item.imageStorageId && existing?.imageBlob) {
        continue
      }
      const blob = await fetchImageBlob(item.imageUrl)
      if (blob) {
        await (db[table] as any).update(item.id, { imageBlob: blob })
      }
    } catch (err) {
      console.warn(`CacheSync: failed to cache image for ${table}/${item.id}`, err)
    }
  }
}

// ── Per-table sync functions ────────────────────────────────────

async function syncCategories(items: any[]) {
  try {
    const mapped = items.map((item: any) => ({
      id: item._id,
      name: item.name,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
      imageStorageId: item.imageStorageId ?? null,
    }))
    await db.transaction('rw', db.categories, async () => {
      // Preserve existing imageBlob during sync
      const existing = await db.categories.toArray()
      const blobMap = new Map(existing.map((e) => [e.id, e.imageBlob]))
      const withBlobs = mapped.map((m) => ({
        ...m,
        imageBlob: blobMap.get(m.id),
      }))
      await db.categories.clear()
      await db.categories.bulkPut(withBlobs)
    })
    // Fetch image blobs in background (non-blocking)
    syncImageBlobs('categories', items.map((i: any) => ({
      id: i._id,
      imageStorageId: i.imageStorageId,
      imageUrl: i.imageUrl,
    }))).catch(console.error)
  } catch (err) {
    console.error('CacheSync: failed to sync categories', err)
  }
}

async function syncBaseModels(items: any[]) {
  try {
    const mapped = items.map((item: any) => ({
      id: item._id,
      categoryId: item.categoryId,
      skuCode: item.skuCode,
      articleNo: item.articleNo,
      name: item.name,
      description: item.description ?? undefined,
      priceNet: item.priceNet,
      priceGross: item.priceGross,
      specs: item.specs ?? undefined,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
      imageStorageId: item.imageStorageId ?? null,
    }))
    await db.transaction('rw', db.baseModels, async () => {
      const existing = await db.baseModels.toArray()
      const blobMap = new Map(existing.map((e) => [e.id, e.imageBlob]))
      const withBlobs = mapped.map((m) => ({
        ...m,
        imageBlob: blobMap.get(m.id),
      }))
      await db.baseModels.clear()
      await db.baseModels.bulkPut(withBlobs)
    })
    syncImageBlobs('baseModels', items.map((i: any) => ({
      id: i._id,
      imageStorageId: i.imageStorageId,
      imageUrl: i.imageUrl,
    }))).catch(console.error)
  } catch (err) {
    console.error('CacheSync: failed to sync baseModels', err)
  }
}

async function syncOptionGroups(items: any[]) {
  try {
    const mapped = items.map((item: any) => ({
      id: item._id,
      name: item.name,
      selectionType: item.selectionType,
      appliesTo: item.appliesTo ?? [],
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
    }))
    await db.transaction('rw', db.optionGroups, async () => {
      await db.optionGroups.clear()
      await db.optionGroups.bulkPut(mapped)
    })
  } catch (err) {
    console.error('CacheSync: failed to sync optionGroups', err)
  }
}

async function syncOptions(items: any[]) {
  try {
    const mapped = items.map((item: any) => ({
      id: item._id,
      optionGroupId: item.optionGroupId,
      skuCode: item.skuCode,
      articleNo: item.articleNo,
      name: item.name,
      description: item.description ?? undefined,
      priceNet: item.priceNet,
      priceGross: item.priceGross,
      isDefault: item.isDefault ?? false,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
      imageStorageId: item.imageStorageId ?? null,
      requiresInput: item.requiresInput ?? undefined,
    }))
    await db.transaction('rw', db.options, async () => {
      const existing = await db.options.toArray()
      const blobMap = new Map(existing.map((e) => [e.id, e.imageBlob]))
      const withBlobs = mapped.map((m) => ({
        ...m,
        imageBlob: blobMap.get(m.id),
      }))
      await db.options.clear()
      await db.options.bulkPut(withBlobs)
    })
    syncImageBlobs('options', items.map((i: any) => ({
      id: i._id,
      imageStorageId: i.imageStorageId,
      imageUrl: i.imageUrl,
    }))).catch(console.error)
  } catch (err) {
    console.error('CacheSync: failed to sync options', err)
  }
}

async function syncSettings(items: any[]) {
  try {
    const mapped = items.map((s: any) => ({
      key: s.key,
      value: s.value,
    }))
    await db.transaction('rw', db.settings, async () => {
      await db.settings.clear()
      await db.settings.bulkPut(mapped)
    })
  } catch (err) {
    console.error('CacheSync: failed to sync settings', err)
  }
}

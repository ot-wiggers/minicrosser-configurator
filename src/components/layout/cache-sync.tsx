'use client'

import { useEffect, useRef } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { db } from '@/modules/storage/db'

/**
 * CacheSync — subscribes to key Convex queries and writes data to
 * Dexie/IndexedDB for offline read access. This keeps the local cache
 * up to date whenever the user is online and Convex data changes.
 *
 * Cached tables: categories, baseModels, optionGroups, options, settings.
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
    const hash = JSON.stringify((categories as any[]).map((c: any) => c._id))
    if (lastSyncRef.current.categories === hash) return
    lastSyncRef.current.categories = hash

    syncCategories(categories as any[]).catch(console.error)
  }, [categories])

  // Sync baseModels
  useEffect(() => {
    if (!baseModels) return
    const hash = JSON.stringify((baseModels as any[]).map((m: any) => m._id))
    if (lastSyncRef.current.baseModels === hash) return
    lastSyncRef.current.baseModels = hash

    syncBaseModels(baseModels as any[]).catch(console.error)
  }, [baseModels])

  // Sync optionGroups
  useEffect(() => {
    if (!optionGroups) return
    const hash = JSON.stringify((optionGroups as any[]).map((g: any) => g._id))
    if (lastSyncRef.current.optionGroups === hash) return
    lastSyncRef.current.optionGroups = hash

    syncOptionGroups(optionGroups as any[]).catch(console.error)
  }, [optionGroups])

  // Sync options
  useEffect(() => {
    if (!options) return
    const hash = JSON.stringify((options as any[]).map((o: any) => o._id))
    if (lastSyncRef.current.options === hash) return
    lastSyncRef.current.options = hash

    syncOptions(options as any[]).catch(console.error)
  }, [options])

  // Sync settings
  useEffect(() => {
    if (!settings) return
    const hash = JSON.stringify((settings as any[]).map((s: any) => s.key))
    if (lastSyncRef.current.settings === hash) return
    lastSyncRef.current.settings = hash

    syncSettings(settings as any[]).catch(console.error)
  }, [settings])

  return null
}

// ---- Per-table sync functions (typed individually to avoid union issues) ----

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
      await db.categories.clear()
      await db.categories.bulkPut(mapped)
    })
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
      priceNet: item.priceNet,
      priceGross: item.priceGross,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
      imageStorageId: item.imageStorageId ?? null,
    }))
    await db.transaction('rw', db.baseModels, async () => {
      await db.baseModels.clear()
      await db.baseModels.bulkPut(mapped)
    })
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
      priceNet: item.priceNet,
      priceGross: item.priceGross,
      isDefault: item.isDefault ?? false,
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
      imageStorageId: item.imageStorageId ?? null,
    }))
    await db.transaction('rw', db.options, async () => {
      await db.options.clear()
      await db.options.bulkPut(mapped)
    })
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

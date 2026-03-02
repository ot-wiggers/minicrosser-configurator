# Offline-PWA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the entire public-facing app (configurator, dashboard, documents) work offline using Dexie/IndexedDB fallback, with image blob caching and local-first document creation that syncs on reconnect.

**Architecture:** Custom `useOfflineQuery` hook wraps Convex `useQuery` — returns Convex data when online, falls back to Dexie when offline. CacheSync is extended to also fetch and cache image blobs. Documents created offline are saved locally and synced via the existing OutboxProcessor pattern.

**Tech Stack:** Next.js 16, Convex, Dexie 4 (IndexedDB), existing `useOnlineStatus` hook, existing CacheSync infrastructure.

**Design Doc:** `docs/plans/2026-03-02-offline-pwa-design.md`

---

### Task 1: Extend Dexie db-types with `imageStorageId`

CacheSync currently stores `imageStorageId` for categories but not for models/options. The types need `imageStorageId` so we can detect when an image changes and re-fetch the blob.

**Files:**
- Modify: `src/modules/catalog/db-types.ts`

**Step 1: Add `imageStorageId` to all records that have images**

In `src/modules/catalog/db-types.ts`, add `imageStorageId?: string | null` to `CategoryRecord`, `BaseModelRecord`, and `OptionRecord`. Also add missing fields like `description` and `specs` to `BaseModelRecord`.

```typescript
export interface CategoryRecord {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  imageStorageId?: string | null
  imageBlob?: Blob
}

export interface BaseModelRecord {
  id: string
  categoryId: string
  skuCode: string
  articleNo: string
  name: string
  description?: string
  priceNet: number
  priceGross: number
  specs?: Array<{ label: string; value: string }>
  imageStorageId?: string | null
  imageBlob?: Blob
  sortOrder: number
  isActive: boolean
}

export interface OptionGroupRecord {
  id: string
  name: string
  selectionType: 'SINGLE' | 'MULTI'
  appliesTo: string[] // category IDs, empty = all
  sortOrder: number
  isActive: boolean
}

export interface OptionRecord {
  id: string
  optionGroupId: string
  skuCode: string
  articleNo: string
  name: string
  description?: string
  priceNet: number
  priceGross: number
  imageStorageId?: string | null
  imageBlob?: Blob
  sortOrder: number
  isActive: boolean
  isDefault: boolean
}

export interface UserRecord {
  id: string
  username: string
  passwordHash: string
  role: 'admin'
  mustChangePassword: boolean
  createdAt: string
}

export interface SettingRecord {
  key: string
  value: string | number | boolean
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/modules/catalog/db-types.ts
git commit -m "feat(offline): extend db-types with imageStorageId and missing fields"
```

---

### Task 2: Create `useOfflineQuery` hook

**Files:**
- Create: `src/hooks/use-offline-query.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/use-offline-query.ts
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep use-offline-query || echo "No errors"`

**Step 3: Commit**

```bash
git add src/hooks/use-offline-query.ts
git commit -m "feat(offline): add useOfflineQuery hook with Dexie fallback"
```

---

### Task 3: Create `useOfflineImage` hook

**Files:**
- Create: `src/hooks/use-offline-image.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/use-offline-image.ts
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep use-offline-image || echo "No errors"`

**Step 3: Commit**

```bash
git add src/hooks/use-offline-image.ts
git commit -m "feat(offline): add useOfflineImage hook for blob URL fallback"
```

---

### Task 4: Extend CacheSync to fetch image blobs

**Files:**
- Modify: `src/components/layout/cache-sync.tsx`

**Step 1: Rewrite CacheSync with image blob caching**

Replace the entire file. Key changes:
- Sync functions now store `description`, `specs`, `imageStorageId`
- After syncing data, a background job fetches images whose `imageStorageId` changed
- Image fetches are non-blocking (don't delay data sync)

```typescript
// src/components/layout/cache-sync.tsx
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
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/layout/cache-sync.tsx
git commit -m "feat(offline): extend CacheSync with image blob caching and missing fields"
```

---

### Task 5: Migrate CategoryPicker to offline hooks

**Files:**
- Modify: `src/components/configurator/category-picker.tsx`

**Step 1: Replace `useQuery` with `useOfflineQuery` and add `useOfflineImage`**

Replace the imports and the query call. Add a sub-component wrapper for the image.

Change import from:
```typescript
import { useQuery } from 'convex/react'
```
To:
```typescript
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { useOfflineImage } from '@/hooks/use-offline-image'
```

Change the query from:
```typescript
const categories = useQuery(api.categories.listActive)
```
To:
```typescript
const categories = useOfflineQuery(
  api.categories.listActive,
  {},
  async () => {
    const all = await db.categories.where('isActive').equals(1).sortBy('sortOrder')
    return all.map((c) => ({ ...c, _id: c.id, imageUrl: null }))
  },
)
```

Add import:
```typescript
import { db } from '@/modules/storage/db'
```

For the image in each category card, replace:
```typescript
{cat.imageUrl ? (
  <img src={cat.imageUrl} alt={cat.name} className="h-10 w-10 rounded object-cover" />
) : (
  <Icon className="h-10 w-10 text-primary" />
)}
```
With:
```typescript
<CategoryImage cat={cat} fallbackIcon={<Icon className="h-10 w-10 text-primary" />} />
```

Add a new component inside the file:
```typescript
function CategoryImage({ cat, fallbackIcon }: { cat: any; fallbackIcon: React.ReactNode }) {
  const imgSrc = useOfflineImage(cat.imageUrl, cat._id, 'categories')
  if (imgSrc) {
    return <img src={imgSrc} alt={cat.name} className="h-10 w-10 rounded object-cover" />
  }
  return <>{fallbackIcon}</>
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/configurator/category-picker.tsx
git commit -m "feat(offline): migrate CategoryPicker to useOfflineQuery + useOfflineImage"
```

---

### Task 6: Migrate ModelPicker to offline hooks

**Files:**
- Modify: `src/components/configurator/model-picker.tsx`

**Step 1: Replace `useQuery` with `useOfflineQuery` and add `useOfflineImage`**

Replace import:
```typescript
import { useQuery } from 'convex/react'
```
With:
```typescript
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { useOfflineImage } from '@/hooks/use-offline-image'
import { db } from '@/modules/storage/db'
```

Replace the query:
```typescript
const models = useQuery(
  api.baseModels.listActiveByCategory,
  selectedCategory ? { categoryId: selectedCategory as Id<"categories"> } : 'skip',
)
```
With:
```typescript
const models = useOfflineQuery(
  api.baseModels.listActiveByCategory,
  selectedCategory ? { categoryId: selectedCategory as Id<"categories"> } : 'skip',
  async () => {
    if (!selectedCategory) return []
    const all = await db.baseModels
      .where('categoryId').equals(selectedCategory)
      .and((m) => m.isActive)
      .sortBy('sortOrder')
    return all.map((m) => ({ ...m, _id: m.id, imageUrl: null }))
  },
)
```

For images, extract a sub-component:
```typescript
function ModelImage({ model }: { model: any }) {
  const imgSrc = useOfflineImage(model.imageUrl, model._id, 'baseModels')
  if (imgSrc) {
    return <img src={imgSrc} alt={model.name} className="h-full w-full object-contain" />
  }
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Car className="h-12 w-12 text-muted-foreground/40" />
    </div>
  )
}
```

Replace the inline image JSX:
```typescript
{model.imageUrl ? (
  <img src={model.imageUrl} alt={model.name} className="h-full w-full object-contain" />
) : (
  <div className="flex h-full w-full items-center justify-center">
    <Car className="h-12 w-12 text-muted-foreground/40" />
  </div>
)}
```
With:
```typescript
<ModelImage model={model} />
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/configurator/model-picker.tsx
git commit -m "feat(offline): migrate ModelPicker to useOfflineQuery + useOfflineImage"
```

---

### Task 7: Migrate AccessoryPicker to offline hooks

**Files:**
- Modify: `src/components/configurator/accessory-picker.tsx`

**Step 1: Replace `useQuery` with `useOfflineQuery` and add `useOfflineImage`**

Replace import:
```typescript
import { useQuery } from 'convex/react'
```
With:
```typescript
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { useOfflineImage } from '@/hooks/use-offline-image'
import { db } from '@/modules/storage/db'
```

Replace the query in `AccessoryPicker`:
```typescript
const groupsWithOptions = useQuery(
  api.optionGroups.listWithOptionsForCategory,
  selectedCategory ? { categoryId: selectedCategory, baseModelId: selectedBaseModelId ?? undefined } : 'skip',
)
```
With:
```typescript
const groupsWithOptions = useOfflineQuery(
  api.optionGroups.listWithOptionsForCategory,
  selectedCategory ? { categoryId: selectedCategory, baseModelId: selectedBaseModelId ?? undefined } : 'skip',
  async () => {
    if (!selectedCategory) return []
    const groups = await db.optionGroups
      .where('isActive').equals(1)
      .sortBy('sortOrder')
    const applicable = groups.filter(
      (g) => g.appliesTo.length === 0 || g.appliesTo.includes(selectedCategory),
    )
    const result = []
    for (const group of applicable) {
      const items = await db.options
        .where('optionGroupId').equals(group.id)
        .and((o) => o.isActive)
        .sortBy('sortOrder')
      result.push({
        group: { ...group, _id: group.id },
        items: items.map((o) => ({ ...o, _id: o.id, imageUrl: null })),
      })
    }
    return result
  },
)
```

Replace the `OptionThumbnail` component to use the offline image hook:
```typescript
function OptionThumbnail({ url, optionId }: { url?: string | null; optionId: string }) {
  const imgSrc = useOfflineImage(url ?? null, optionId, 'options')
  if (!imgSrc) return null
  return (
    <img
      src={imgSrc}
      alt=""
      className="h-12 w-12 shrink-0 rounded-md border object-cover"
    />
  )
}
```

Update all `<OptionThumbnail>` usages in `SingleGroup` and `MultiGroup` to pass `optionId`:
```typescript
<OptionThumbnail url={item.imageUrl} optionId={item._id} />
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/configurator/accessory-picker.tsx
git commit -m "feat(offline): migrate AccessoryPicker to useOfflineQuery + useOfflineImage"
```

---

### Task 8: Migrate CartSidebar to offline hook

**Files:**
- Modify: `src/components/configurator/cart-sidebar.tsx`

**Step 1: Replace `useQuery` with `useOfflineQuery`**

Replace import:
```typescript
import { useQuery } from 'convex/react'
```
With:
```typescript
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { db } from '@/modules/storage/db'
```

Replace the query:
```typescript
const baseModel = useQuery(
  api.baseModels.getById,
  selectedBaseModelId ? { id: selectedBaseModelId as Id<"baseModels"> } : 'skip',
)
```
With:
```typescript
const baseModel = useOfflineQuery(
  api.baseModels.getById,
  selectedBaseModelId ? { id: selectedBaseModelId as Id<"baseModels"> } : 'skip',
  async () => {
    if (!selectedBaseModelId) return null
    const m = await db.baseModels.get(selectedBaseModelId)
    if (!m) return null
    return { ...m, _id: m.id, imageUrl: null }
  },
)
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/configurator/cart-sidebar.tsx
git commit -m "feat(offline): migrate CartSidebar to useOfflineQuery"
```

---

### Task 9: Extend Outbox for offline document creation

**Files:**
- Modify: `src/modules/storage/types.ts`
- Modify: `src/modules/storage/db.ts`

**Step 1: Extend `OutboxRecord` type**

In `src/modules/storage/types.ts`, change `OutboxRecord` to support multiple types. Add a new `LocalOutboxRecord` interface for offline document sync entries:

```typescript
export interface OutboxRecord {
  id?: number
  document_id: number
  to_email: string
  subject: string
  html_body: string
  pdf_base64: string
  filename: string
  status: OutboxStatus
  attempts: number
  last_error?: string
  created_at: string
}

/** Local-only outbox for syncing offline-created documents to Convex */
export interface SyncOutboxRecord {
  id?: number
  type: 'DOC_CREATE'
  localDocId: number         // ID in local documents table
  payload: string            // JSON-serialized document data
  status: OutboxStatus
  attempts: number
  last_error?: string
  created_at: string
}
```

**Step 2: Add `syncOutbox` table to Dexie**

In `src/modules/storage/db.ts`, add a new table and bump to version 3:

```typescript
import Dexie, { type EntityTable } from 'dexie'
import type { DocumentRecord, OutboxRecord, SequenceRecord, SyncOutboxRecord } from './types'
import type {
  CategoryRecord,
  BaseModelRecord,
  OptionGroupRecord,
  OptionRecord,
  UserRecord,
  SettingRecord,
} from '@/modules/catalog/db-types'

export class McConfiguratorDB extends Dexie {
  documents!: EntityTable<DocumentRecord, 'id'>
  outbox!: EntityTable<OutboxRecord, 'id'>
  syncOutbox!: EntityTable<SyncOutboxRecord, 'id'>
  sequences!: EntityTable<SequenceRecord, 'key'>
  categories!: EntityTable<CategoryRecord, 'id'>
  baseModels!: EntityTable<BaseModelRecord, 'id'>
  optionGroups!: EntityTable<OptionGroupRecord, 'id'>
  options!: EntityTable<OptionRecord, 'id'>
  users!: EntityTable<UserRecord, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>

  constructor() {
    super('mc-configurator')

    this.version(1).stores({
      documents: '++id, document_no, document_type, status, created_at',
      outbox: '++id, document_id, status, created_at',
      sequences: 'key',
    })

    this.version(2).stores({
      documents: '++id, document_no, document_type, status, created_at',
      outbox: '++id, document_id, status, created_at',
      sequences: 'key',
      categories: 'id, sortOrder, isActive',
      baseModels: 'id, categoryId, skuCode, sortOrder, isActive',
      optionGroups: 'id, sortOrder, isActive',
      options: 'id, optionGroupId, skuCode, sortOrder, isActive',
      users: 'id, &username',
      settings: 'key',
    })

    this.version(3).stores({
      documents: '++id, document_no, document_type, status, created_at, convexId',
      outbox: '++id, document_id, status, created_at',
      syncOutbox: '++id, type, status, created_at',
      sequences: 'key',
      categories: 'id, sortOrder, isActive',
      baseModels: 'id, categoryId, skuCode, sortOrder, isActive',
      optionGroups: 'id, sortOrder, isActive',
      options: 'id, optionGroupId, skuCode, sortOrder, isActive',
      users: 'id, &username',
      settings: 'key',
    })
  }
}

export const db = new McConfiguratorDB()
```

**Step 3: Add `convexId` to `DocumentRecord`**

In `src/modules/storage/types.ts`, add `convexId` field:

```typescript
export interface DocumentRecord {
  id?: number
  convexId?: string          // Set after sync to Convex
  document_no: string
  document_type: DocumentType
  status: DocumentStatus
  customer: CustomerData
  pricing: PricingSummary
  selectedCategory: string
  selectedBaseModelId: string
  selectedOptions: SelectedOption[]
  notes?: string
  created_at: string
  updated_at: string
}
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 5: Commit**

```bash
git add src/modules/storage/types.ts src/modules/storage/db.ts
git commit -m "feat(offline): extend Dexie schema v3 with syncOutbox and convexId"
```

---

### Task 10: Create offline document helper

**Files:**
- Create: `src/lib/offline-document.ts`

**Step 1: Create the helper module**

This module handles creating documents locally when offline and queuing them for sync.

```typescript
// src/lib/offline-document.ts
import { db } from '@/modules/storage/db'
import type { DocumentRecord, CustomerData, PricingSummary, SelectedOption } from '@/modules/storage/types'

interface CreateDocumentParams {
  documentNo: string
  documentType: 'QUOTE' | 'ORDER'
  customer: CustomerData
  pricing: PricingSummary
  selectedCategory: string
  selectedBaseModelId: string
  selectedOptions: SelectedOption[]
  notes?: string
}

/**
 * Creates a document locally in Dexie and adds a sync outbox entry.
 * Returns the local document ID.
 */
export async function createDocumentOffline(params: CreateDocumentParams): Promise<number> {
  const now = new Date().toISOString()

  // Create local document record
  const docRecord: DocumentRecord = {
    document_no: params.documentNo,
    document_type: params.documentType,
    status: 'DRAFT',
    customer: params.customer,
    pricing: params.pricing,
    selectedCategory: params.selectedCategory,
    selectedBaseModelId: params.selectedBaseModelId,
    selectedOptions: params.selectedOptions,
    notes: params.notes,
    created_at: now,
    updated_at: now,
  }

  const localDocId = await db.documents.add(docRecord)

  // Create sync outbox entry
  await db.syncOutbox.add({
    type: 'DOC_CREATE',
    localDocId: localDocId as number,
    payload: JSON.stringify(params),
    status: 'PENDING',
    attempts: 0,
    created_at: now,
  })

  return localDocId as number
}

/**
 * Generate the next document number from local sequences.
 */
export async function getNextLocalSequence(key: string): Promise<number> {
  const record = await db.sequences.get(key)
  const next = (record?.value ?? 0) + 1
  await db.sequences.put({ key, value: next })
  return next
}

/**
 * Check if a document is local-only (not yet synced to Convex).
 */
export function isLocalDocument(doc: DocumentRecord): boolean {
  return !doc.convexId
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/lib/offline-document.ts
git commit -m "feat(offline): add offline document creation helper with sync outbox"
```

---

### Task 11: Extend OutboxProcessor to sync documents

**Files:**
- Modify: `src/components/layout/outbox-processor.tsx`

**Step 1: Add document sync processing**

Extend the component to also watch the `syncOutbox` table in Dexie and push documents to Convex when back online.

```typescript
// src/components/layout/outbox-processor.tsx
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { db } from '@/modules/storage/db'

/**
 * OutboxProcessor — processes two outbox queues:
 * 1. Convex outbox (email sending) — existing behavior
 * 2. Local syncOutbox (offline-created documents) — new behavior
 */
export function OutboxProcessor() {
  const isOnline = useOnlineStatus()
  const pendingEntries = useQuery(api.outbox.listPending)
  const sendEmail = useAction(api.sendEmail.send)
  const processingRef = useRef<Set<string>>(new Set())

  // Convex mutations for document sync
  const getNextSequence = useMutation(api.sequences.getNext)
  const createDocument = useMutation(api.documents.create)
  const findOrCreateCustomer = useMutation(api.customers.findOrCreate)

  // ── Email outbox (existing) ─────────────────────────────────

  useEffect(() => {
    if (!isOnline || !pendingEntries || pendingEntries.length === 0) return

    for (const entry of pendingEntries) {
      const id = entry._id as string
      if (processingRef.current.has(id)) continue

      processingRef.current.add(id)
      sendEmail({ outboxId: id as Id<"outbox"> })
        .then(() => {
          processingRef.current.delete(id)
        })
        .catch((err) => {
          console.error('Outbox send error:', err)
          processingRef.current.delete(id)
        })
    }
  }, [isOnline, pendingEntries, sendEmail])

  // ── Document sync outbox (new) ──────────────────────────────

  const syncDocuments = useCallback(async () => {
    const pendingDocs = await db.syncOutbox
      .where('status').equals('PENDING')
      .toArray()

    for (const entry of pendingDocs) {
      const syncId = `sync-${entry.id}`
      if (processingRef.current.has(syncId)) continue
      processingRef.current.add(syncId)

      try {
        const params = JSON.parse(entry.payload)

        // Get a server-side sequence number (local one may conflict)
        const year = new Date().getFullYear()
        const seqNum = await getNextSequence({ key: `doc-seq-${year}` })
        const documentNo = `MC-${year}-${String(seqNum).padStart(6, '0')}`

        // Find or create customer in Convex
        const customerId = await findOrCreateCustomer({
          company: params.customer.company,
          firstName: params.customer.firstName,
          lastName: params.customer.lastName,
          street: params.customer.street || undefined,
          zip: params.customer.zip || undefined,
          city: params.customer.city || undefined,
          email: params.customer.email,
          phone: params.customer.phone || undefined,
          contactPerson: params.customer.contactPerson || undefined,
          customerNumber: params.customer.customerNumber || undefined,
        })

        // Create document in Convex
        const convexDocId = await createDocument({
          documentNo,
          documentType: params.documentType,
          status: 'DRAFT',
          customerId: customerId as Id<"customers">,
          customer: params.customer,
          pricing: params.pricing,
          selectedCategory: params.selectedCategory,
          selectedBaseModelId: params.selectedBaseModelId,
          selectedOptions: params.selectedOptions,
          notes: params.notes || undefined,
        })

        // Update local document with Convex ID and synced doc number
        await db.documents.update(entry.localDocId, {
          convexId: convexDocId as string,
          document_no: documentNo,
        })

        // Mark sync entry as done
        await db.syncOutbox.update(entry.id!, { status: 'SENT' })
        processingRef.current.delete(syncId)
      } catch (err) {
        console.error('Document sync error:', err)
        await db.syncOutbox.update(entry.id!, {
          status: 'FAILED',
          attempts: (entry.attempts || 0) + 1,
          last_error: String(err),
        })
        processingRef.current.delete(syncId)
      }
    }
  }, [getNextSequence, createDocument, findOrCreateCustomer])

  useEffect(() => {
    if (!isOnline) return
    // Run sync check on mount and when coming back online
    syncDocuments().catch(console.error)
    // Also set up an interval while online
    const interval = setInterval(() => {
      syncDocuments().catch(console.error)
    }, 10_000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [isOnline, syncDocuments])

  return null
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/layout/outbox-processor.tsx
git commit -m "feat(offline): extend OutboxProcessor to sync offline-created documents"
```

---

### Task 12: Migrate CustomerFormDialog for offline creation

**Files:**
- Modify: `src/components/configurator/customer-form-dialog.tsx`

**Step 1: Add offline creation path**

Import the offline helpers and the online status hook at the top:

```typescript
import { useOnlineStatus } from '@/hooks/use-online-status'
import { createDocumentOffline, getNextLocalSequence } from '@/lib/offline-document'
```

Inside the `CustomerFormDialog` component, add:
```typescript
const isOnline = useOnlineStatus()
```

In the `handleCreate` function, add an offline branch **before** the existing online logic. Wrap the existing body in an `if (isOnline)` check and add an else branch:

After `setSaving(true)` and the `try {` block, add the offline path:

```typescript
// Inside handleCreate, after the try { opening:

if (!isOnline) {
  // ── OFFLINE PATH ──────────────────────────────────
  const year = new Date().getFullYear()
  const seqNum = await getNextLocalSequence(`doc-seq-${year}`)
  const documentNo = `MC-${year}-${String(seqNum).padStart(6, '0')}`

  const optionItems = Object.values(selectedOptions).map((opt) => ({
    skuCode: opt.skuCode,
    articleNo: opt.articleNo,
    name: opt.name,
    priceNet: opt.priceNet,
    quantity: opt.quantity || 1,
  }))
  const pricing = calculatePricingFromItems(baseModel, optionItems)

  const localId = await createDocumentOffline({
    documentNo,
    documentType,
    customer: {
      company: customer.company.trim(),
      firstName: customer.firstName.trim(),
      lastName: customer.lastName.trim(),
      street: customer.street.trim(),
      zip: customer.zip.trim(),
      city: customer.city.trim(),
      email: customer.email.trim(),
      phone: customer.phone?.trim(),
      contactPerson: customer.contactPerson?.trim(),
      customerNumber: customer.customerNumber?.trim(),
    },
    pricing,
    selectedCategory,
    selectedBaseModelId,
    selectedOptions: Object.values(selectedOptions),
    notes: notes.trim() || undefined,
  })

  reset()
  onOpenChange(false)
  toast.success(
    `${documentType === 'QUOTE' ? 'Angebot' : 'Bestellung'} ${documentNo} lokal gespeichert (wird bei Verbindung synchronisiert)`,
  )
  // Navigate to local document — no Convex ID yet
  router.push(`/`)
  return
}

// ── ONLINE PATH (existing code below) ─────────────
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/configurator/customer-form-dialog.tsx
git commit -m "feat(offline): add offline document creation path to CustomerFormDialog"
```

---

### Task 13: Migrate DocumentList for offline display

**Files:**
- Modify: `src/components/documents/document-list.tsx`

**Step 1: Add offline document display**

The document list should show both Convex documents (online) and local Dexie documents (offline or not-yet-synced).

Replace the imports:
```typescript
import { useQuery } from 'convex/react'
```
With:
```typescript
import { useQuery } from 'convex/react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { db } from '@/modules/storage/db'
import { isLocalDocument } from '@/lib/offline-document'
```

Add inside the component after `const [searchQuery, setSearchQuery] = useState('')`:
```typescript
const isOnline = useOnlineStatus()
const [localDocs, setLocalDocs] = useState<any[]>([])
```

Add useEffect to load local documents:
```typescript
useEffect(() => {
  db.documents
    .orderBy('created_at')
    .reverse()
    .toArray()
    .then(setLocalDocs)
    .catch(console.error)
}, [])
```

Modify the `documents` memo to merge online and offline data:
```typescript
const documents = useMemo(() => {
  // Online: use Convex results
  if (isOnline) {
    const convexDocs = searchQuery.trim() && searchResults ? searchResults : (!searchQuery.trim() && allDocuments ? allDocuments : [])
    // Add unsync'd local documents at the top
    const unsyncedLocal = localDocs
      .filter((d) => !d.convexId)
      .map((d) => ({
        _id: `local-${d.id}`,
        documentNo: d.document_no,
        documentType: d.document_type,
        status: d.status,
        customer: d.customer,
        pricing: d.pricing,
        _creationTime: new Date(d.created_at).getTime(),
        _isLocal: true,
      }))
    return [...unsyncedLocal, ...convexDocs]
  }

  // Offline: use local documents only
  return localDocs.map((d) => ({
    _id: d.convexId || `local-${d.id}`,
    documentNo: d.document_no,
    documentType: d.document_type,
    status: d.status,
    customer: d.customer,
    pricing: d.pricing,
    _creationTime: new Date(d.created_at).getTime(),
    _isLocal: !d.convexId,
  }))
}, [isOnline, searchQuery, searchResults, allDocuments, localDocs])
```

Add a visual indicator for unsynced documents. In the document card, after the `<Badge>` for status:
```typescript
{(doc as any)._isLocal && (
  <Badge variant="outline" className="border-orange-500 text-orange-500">
    Offline
  </Badge>
)}
```

For the `Link` wrapper, make local documents non-clickable (no Convex detail page):
```typescript
{(doc as any)._isLocal ? (
  <div key={doc._id}>
    {/* Same Card content but without Link wrapper */}
  </div>
) : (
  <Link key={doc._id} href={`/documents/${doc._id}`}>
    {/* Existing Card content */}
  </Link>
)}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -5`

**Step 3: Commit**

```bash
git add src/components/documents/document-list.tsx
git commit -m "feat(offline): show local documents in DocumentList with offline badge"
```

---

### Task 14: End-to-end verification

**Step 1: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors related to offline features

**Step 2: Verify Convex push**

Run: `npx convex dev --once 2>&1 | tail -5`
Expected: Successful push

**Step 3: Verify Next.js build**

Run: `npm run build 2>&1 | tail -15`
Expected: Successful build

**Step 4: Manual smoke test — online**

1. Start dev server: `npm run dev`
2. Navigate through configurator: select category → model → options
3. Verify CacheSync logs in console show data being cached
4. Check IndexedDB in DevTools → `mc-configurator` → verify tables have data and image blobs

**Step 5: Manual smoke test — offline**

1. Open DevTools → Network → toggle "Offline"
2. Refresh page
3. Navigate to `/new` — verify categories load from IndexedDB
4. Select a category — verify models load
5. Verify images display from blob cache
6. Create a document offline — verify toast says "lokal gespeichert"
7. Go back to dashboard — verify document shows with "Offline" badge

**Step 6: Manual smoke test — reconnect**

1. Toggle "Offline" off in DevTools
2. Wait ~10 seconds for OutboxProcessor interval
3. Verify offline document gets synced (Offline badge disappears)
4. Check Convex dashboard to confirm document was created

**Step 7: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(offline): address issues found during verification"
```

---

## File Summary

| File | Action | Task |
|------|--------|------|
| `src/modules/catalog/db-types.ts` | Modify | Task 1 |
| `src/hooks/use-offline-query.ts` | Create | Task 2 |
| `src/hooks/use-offline-image.ts` | Create | Task 3 |
| `src/components/layout/cache-sync.tsx` | Modify | Task 4 |
| `src/components/configurator/category-picker.tsx` | Modify | Task 5 |
| `src/components/configurator/model-picker.tsx` | Modify | Task 6 |
| `src/components/configurator/accessory-picker.tsx` | Modify | Task 7 |
| `src/components/configurator/cart-sidebar.tsx` | Modify | Task 8 |
| `src/modules/storage/types.ts` | Modify | Task 9 |
| `src/modules/storage/db.ts` | Modify | Task 9 |
| `src/lib/offline-document.ts` | Create | Task 10 |
| `src/components/layout/outbox-processor.tsx` | Modify | Task 11 |
| `src/components/configurator/customer-form-dialog.tsx` | Modify | Task 12 |
| `src/components/documents/document-list.tsx` | Modify | Task 13 |

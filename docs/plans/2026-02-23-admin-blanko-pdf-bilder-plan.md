# Admin, Blanko-PDF, Bilder & Corporate Design — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin catalog management, Blanko-PDF generation, corporate PDF branding, and image support to the Mini Crosser Configurator.

**Architecture:** Monolithic extension of the existing Next.js 16 app. New Dexie tables for catalog data (migrated from static JSON), NextAuth.js credentials auth for admin routes, pdf-lib corporate templates, and Blob-based image storage in IndexedDB.

**Tech Stack:** Next.js 16 (App Router), Dexie 4 (IndexedDB), NextAuth.js (Credentials), bcryptjs, pdf-lib, Zustand, shadcn/ui, Tailwind CSS 4

**Design Doc:** `docs/plans/2026-02-23-admin-blanko-pdf-bilder-design.md`

**Base Path:** `src/` (all paths relative unless noted)

---

## Phase 1: Database Schema & Migration

### Task 1: Add catalog type definitions

**Files:**
- Create: `src/modules/catalog/db-types.ts`

**Step 1: Create the new catalog DB types file**

This file defines the IndexedDB record types for the catalog tables. These are distinct from the existing `catalog/types.ts` which defines the static JSON shape.

```typescript
// src/modules/catalog/db-types.ts

export interface CategoryRecord {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
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

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/modules/catalog/db-types.ts`

**Step 3: Commit**

```bash
git add src/modules/catalog/db-types.ts
git commit -m "feat: add IndexedDB catalog type definitions"
```

---

### Task 2: Extend Dexie database schema (v2)

**Files:**
- Modify: `src/modules/storage/db.ts`

**Step 1: Update the Dexie database class**

Add 6 new tables. Use `version(2)` migration so existing v1 data (documents, outbox, sequences) is preserved.

```typescript
// src/modules/storage/db.ts
import Dexie, { type EntityTable } from 'dexie'
import type { DocumentRecord, OutboxRecord, SequenceRecord } from './types'
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
  }
}

export const db = new McConfiguratorDB()
```

**Step 2: Verify the app still starts**

Run: `npm run dev` — navigate to `/` in browser, check console for Dexie errors. Existing documents should still load.

**Step 3: Commit**

```bash
git add src/modules/storage/db.ts
git commit -m "feat: add catalog tables to Dexie v2 schema"
```

---

### Task 3: Create catalog repositories

**Files:**
- Create: `src/modules/storage/catalog-repo.ts`

**Step 1: Write the catalog repository**

This mirrors the existing pattern from `document-repo.ts` and `outbox-repo.ts`.

```typescript
// src/modules/storage/catalog-repo.ts
import { db } from './db'
import type {
  CategoryRecord,
  BaseModelRecord,
  OptionGroupRecord,
  OptionRecord,
  SettingRecord,
} from '@/modules/catalog/db-types'

export const categoryRepo = {
  async getAll(): Promise<CategoryRecord[]> {
    return db.categories.orderBy('sortOrder').toArray()
  },
  async getActive(): Promise<CategoryRecord[]> {
    return db.categories.where('isActive').equals(1).sortBy('sortOrder')
  },
  async getById(id: string): Promise<CategoryRecord | undefined> {
    return db.categories.get(id)
  },
  async upsert(record: CategoryRecord): Promise<void> {
    await db.categories.put(record)
  },
  async delete(id: string): Promise<void> {
    await db.categories.delete(id)
  },
}

export const baseModelRepo = {
  async getAll(): Promise<BaseModelRecord[]> {
    return db.baseModels.orderBy('sortOrder').toArray()
  },
  async getByCategory(categoryId: string): Promise<BaseModelRecord[]> {
    return db.baseModels.where('categoryId').equals(categoryId).sortBy('sortOrder')
  },
  async getActiveByCategoryId(categoryId: string): Promise<BaseModelRecord[]> {
    const all = await db.baseModels.where('categoryId').equals(categoryId).sortBy('sortOrder')
    return all.filter((m) => m.isActive)
  },
  async getById(id: string): Promise<BaseModelRecord | undefined> {
    return db.baseModels.get(id)
  },
  async upsert(record: BaseModelRecord): Promise<void> {
    await db.baseModels.put(record)
  },
  async delete(id: string): Promise<void> {
    await db.baseModels.delete(id)
  },
}

export const optionGroupRepo = {
  async getAll(): Promise<OptionGroupRecord[]> {
    return db.optionGroups.orderBy('sortOrder').toArray()
  },
  async getForCategory(categoryId: string): Promise<OptionGroupRecord[]> {
    const all = await db.optionGroups.orderBy('sortOrder').toArray()
    return all.filter(
      (g) => g.isActive && (g.appliesTo.length === 0 || g.appliesTo.includes(categoryId)),
    )
  },
  async getById(id: string): Promise<OptionGroupRecord | undefined> {
    return db.optionGroups.get(id)
  },
  async upsert(record: OptionGroupRecord): Promise<void> {
    await db.optionGroups.put(record)
  },
  async delete(id: string): Promise<void> {
    await db.optionGroups.delete(id)
  },
}

export const optionRepo = {
  async getAll(): Promise<OptionRecord[]> {
    return db.options.orderBy('sortOrder').toArray()
  },
  async getByGroupId(groupId: string): Promise<OptionRecord[]> {
    return db.options.where('optionGroupId').equals(groupId).sortBy('sortOrder')
  },
  async getActiveByGroupId(groupId: string): Promise<OptionRecord[]> {
    const all = await db.options.where('optionGroupId').equals(groupId).sortBy('sortOrder')
    return all.filter((o) => o.isActive)
  },
  async getById(id: string): Promise<OptionRecord | undefined> {
    return db.options.get(id)
  },
  async getBySkuCode(skuCode: string): Promise<OptionRecord | undefined> {
    return db.options.where('skuCode').equals(skuCode).first()
  },
  async upsert(record: OptionRecord): Promise<void> {
    await db.options.put(record)
  },
  async delete(id: string): Promise<void> {
    await db.options.delete(id)
  },
}

export const settingsRepo = {
  async get(key: string): Promise<SettingRecord | undefined> {
    return db.settings.get(key)
  },
  async getValue<T = string | number | boolean>(key: string, defaultValue: T): Promise<T> {
    const record = await db.settings.get(key)
    return record ? (record.value as T) : defaultValue
  },
  async set(key: string, value: string | number | boolean): Promise<void> {
    await db.settings.put({ key, value })
  },
  async getAll(): Promise<SettingRecord[]> {
    return db.settings.toArray()
  },
}
```

**Step 2: Export from storage index**

Add to `src/modules/storage/index.ts`:
```typescript
export { categoryRepo, baseModelRepo, optionGroupRepo, optionRepo, settingsRepo } from './catalog-repo'
```

**Step 3: Commit**

```bash
git add src/modules/storage/catalog-repo.ts src/modules/storage/index.ts
git commit -m "feat: add catalog CRUD repositories for IndexedDB"
```

---

### Task 4: Build migration from catalog.json → IndexedDB

**Files:**
- Create: `src/modules/catalog/migration.ts`

**Step 1: Write the migration function**

This reads the existing `catalog.json` structure and populates the new Dexie tables. It runs once — on first load when `categories` table is empty.

```typescript
// src/modules/catalog/migration.ts
import { db } from '@/modules/storage/db'
import type { Catalog } from './types'
import type {
  CategoryRecord,
  BaseModelRecord,
  OptionGroupRecord,
  OptionRecord,
} from './db-types'
import catalogData from '@/data/catalog.json'

const CATEGORY_NAMES: Record<string, string> = {
  TRIKE: '3-Rad Scooter',
  QUAD: '4-Rad Scooter',
  HD: 'Heavy-Duty Scooter',
  CABIN: 'Kabinen-Scooter',
}

export async function migrateCatalogToDb(): Promise<void> {
  const existingCount = await db.categories.count()
  if (existingCount > 0) return // already migrated

  const catalog = catalogData as Catalog

  // 1. Create categories from unique base_model categories
  const categorySet = new Set(catalog.base_models.map((m) => m.category))
  const categories: CategoryRecord[] = Array.from(categorySet).map((cat, i) => ({
    id: cat.toLowerCase(),
    name: CATEGORY_NAMES[cat] || cat,
    sortOrder: i,
    isActive: true,
  }))

  // 2. Create base models
  const baseModels: BaseModelRecord[] = catalog.base_models.map((m, i) => {
    const skuMapping = catalog.base_model_skus.find((bms) => bms.base_model_id === m.id)
    const sku = skuMapping
      ? catalog.skus.find((s) => s.sku_code === skuMapping.sku_code)
      : undefined

    return {
      id: m.id,
      categoryId: m.category.toLowerCase(),
      skuCode: sku?.sku_code || '',
      articleNo: sku?.article_no || '',
      name: m.name,
      description: m.description,
      priceNet: sku?.price_net || 0,
      priceGross: sku?.price_gross || 0,
      sortOrder: i,
      isActive: sku?.is_active ?? true,
    }
  })

  // 3. Create option groups
  const optionGroups: OptionGroupRecord[] = catalog.option_groups.map((g) => ({
    id: g.id,
    name: g.name,
    selectionType: g.selection_type === 'QTY' ? 'MULTI' : g.selection_type as 'SINGLE' | 'MULTI',
    appliesTo: g.applicable_categories.map((c) => c.toLowerCase()),
    sortOrder: g.sort_order,
    isActive: true,
  }))

  // 4. Create options
  const options: OptionRecord[] = catalog.option_items.map((item) => {
    const sku = catalog.skus.find((s) => s.sku_code === item.sku_code)
    return {
      id: item.id,
      optionGroupId: item.option_group_id,
      skuCode: item.sku_code,
      articleNo: sku?.article_no || '',
      name: sku?.name || '',
      description: sku?.description,
      priceNet: sku?.price_net || 0,
      priceGross: sku?.price_gross || 0,
      sortOrder: item.sort_order,
      isActive: sku?.is_active ?? true,
      isDefault: item.is_default,
    }
  })

  // 5. Set default settings
  const defaultSettings = [
    { key: 'vatRate', value: 0.19 },
    { key: 'companyName', value: 'Wiggers GmbH & Co. KG' },
    { key: 'companyStreet', value: 'Gerhard-Stalling-Straße 42' },
    { key: 'companyZip', value: '26135' },
    { key: 'companyCity', value: 'Oldenburg' },
    { key: 'companyPhone', value: '04 41 / 3 61 11 3 09' },
    { key: 'companyFax', value: '04 41 / 3 61 11 3 09' },
    { key: 'companyEmail', value: 'info@minicrosser.info' },
    { key: 'companyWeb', value: 'www.minicrosser.info' },
    { key: 'pdfColorPrimary', value: '#3A4250' },
    { key: 'pdfColorAccent', value: '#D4A843' },
    { key: 'bankName1', value: 'Oldenburgische Landesbank' },
    { key: 'bankIban1', value: '' },
    { key: 'bankBic1', value: '' },
  ]

  // Run all inserts in a single transaction
  await db.transaction(
    'rw',
    [db.categories, db.baseModels, db.optionGroups, db.options, db.settings],
    async () => {
      await db.categories.bulkPut(categories)
      await db.baseModels.bulkPut(baseModels)
      await db.optionGroups.bulkPut(optionGroups)
      await db.options.bulkPut(options)
      await db.settings.bulkPut(defaultSettings)
    },
  )
}
```

**Step 2: Create initialization hook**

```typescript
// src/modules/catalog/use-catalog-init.ts
'use client'

import { useEffect, useState } from 'react'
import { migrateCatalogToDb } from './migration'

export function useCatalogInit() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    migrateCatalogToDb()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Catalog migration failed:', err)
        setError(err.message)
      })
  }, [])

  return { isReady, error }
}
```

**Step 3: Integrate init hook into root layout**

Create a client wrapper component:

```typescript
// src/components/layout/catalog-provider.tsx
'use client'

import { useCatalogInit } from '@/modules/catalog/use-catalog-init'

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const { isReady, error } = useCatalogInit()

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Fehler beim Laden des Katalogs: {error}</p>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Katalog wird geladen...</p>
      </div>
    )
  }

  return <>{children}</>
}
```

Then wrap `{children}` in `src/app/layout.tsx` with `<CatalogProvider>`.

**Step 4: Verify migration runs**

Run: `npm run dev` — open browser, check IndexedDB via DevTools → Application → IndexedDB → `mc-configurator`. Verify `categories`, `baseModels`, `optionGroups`, `options`, `settings` tables are populated.

**Step 5: Commit**

```bash
git add src/modules/catalog/migration.ts src/modules/catalog/use-catalog-init.ts src/components/layout/catalog-provider.tsx src/app/layout.tsx
git commit -m "feat: add catalog migration from JSON to IndexedDB with CatalogProvider"
```

---

### Task 5: Switch configurator to read from IndexedDB

**Files:**
- Create: `src/modules/catalog/db-selectors.ts`
- Modify: `src/components/configurator/category-picker.tsx`
- Modify: `src/components/configurator/model-picker.tsx`
- Modify: `src/components/configurator/accessory-picker.tsx`
- Modify: `src/modules/pricing/calc.ts`

**Step 1: Create async DB selectors**

The existing selectors are synchronous (read from JSON). We need async versions that read from IndexedDB:

```typescript
// src/modules/catalog/db-selectors.ts
import { categoryRepo, baseModelRepo, optionGroupRepo, optionRepo } from '@/modules/storage'
import type { CategoryRecord, BaseModelRecord, OptionGroupRecord, OptionRecord } from './db-types'

export async function getActiveCategories(): Promise<CategoryRecord[]> {
  return categoryRepo.getActive()
}

export async function getBaseModelsForCategory(categoryId: string): Promise<BaseModelRecord[]> {
  return baseModelRepo.getActiveByCategoryId(categoryId)
}

export async function getOptionGroupsForCategory(categoryId: string): Promise<OptionGroupRecord[]> {
  return optionGroupRepo.getForCategory(categoryId)
}

export async function getOptionsForGroup(groupId: string): Promise<OptionRecord[]> {
  return optionRepo.getActiveByGroupId(groupId)
}

export async function getBaseModelById(id: string): Promise<BaseModelRecord | undefined> {
  return baseModelRepo.getById(id)
}

export async function getOptionBySkuCode(skuCode: string): Promise<OptionRecord | undefined> {
  return optionRepo.getBySkuCode(skuCode)
}
```

**Step 2: Update each configurator component**

Replace synchronous `loadCatalog()` + selector calls with async DB reads using `useEffect` + `useState` or `useLiveQuery` from Dexie. Each component follows this pattern:

```typescript
// Example pattern for category-picker.tsx
'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/modules/storage/db'

// Inside component:
const categories = useLiveQuery(
  () => db.categories.where('isActive').equals(1).sortBy('sortOrder'),
  []
)
```

Install `dexie-react-hooks` first: `npm install dexie-react-hooks`

Each picker component needs to be updated to:
1. Use `useLiveQuery` for reactive IndexedDB reads
2. Remove imports of `loadCatalog` and synchronous selectors
3. Handle the `undefined` state while query loads

**Step 3: Update pricing module**

`src/modules/pricing/calc.ts` currently takes a `Catalog` object. Update it to accept `BaseModelRecord` and `OptionRecord[]` directly instead:

```typescript
// Updated signature
export function calculatePricing(
  baseModel: { skuCode: string; articleNo: string; name: string; priceNet: number },
  selectedOptions: Array<{
    skuCode: string
    articleNo: string
    name: string
    priceNet: number
    quantity: number
  }>,
  vatRate: number,
): PricingSummary {
  // ... same logic but using passed-in data directly
}
```

**Step 4: Verify the entire configurator flow still works**

Run: `npm run dev` — go through full flow: select category → model → accessories → see pricing in sidebar. Verify all prices match the original JSON data.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: switch configurator from static JSON to IndexedDB reads"
```

---

## Phase 2: Authentication

### Task 6: Install auth dependencies

**Step 1: Install packages**

```bash
npm install next-auth@latest bcryptjs
npm install -D @types/bcryptjs
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add next-auth and bcryptjs dependencies"
```

---

### Task 7: Set up NextAuth.js with Credentials provider

**Files:**
- Create: `src/modules/auth/options.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/modules/storage/user-repo.ts`
- Create: `src/middleware.ts`

**Step 1: Create user repository**

```typescript
// src/modules/storage/user-repo.ts
import { db } from './db'
import type { UserRecord } from '@/modules/catalog/db-types'

export const userRepo = {
  async getByUsername(username: string): Promise<UserRecord | undefined> {
    return db.users.where('username').equals(username).first()
  },
  async getById(id: string): Promise<UserRecord | undefined> {
    return db.users.get(id)
  },
  async create(record: UserRecord): Promise<void> {
    await db.users.put(record)
  },
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await db.users.update(id, { passwordHash, mustChangePassword: false })
  },
  async count(): Promise<number> {
    return db.users.count()
  },
}
```

**Step 2: Create auth seed function**

```typescript
// src/modules/auth/seed.ts
import { userRepo } from '@/modules/storage/user-repo'
import bcrypt from 'bcryptjs'

export async function seedAdminUser(): Promise<void> {
  const count = await userRepo.count()
  if (count > 0) return

  const hash = await bcrypt.hash('admin', 10)
  await userRepo.create({
    id: 'admin-seed',
    username: 'admin',
    passwordHash: hash,
    role: 'admin',
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  })
}
```

**Step 3: Create NextAuth config**

Note: Since auth validation needs to query IndexedDB (which is browser-only), the Credentials provider `authorize` function needs to run as an API route. For the MVP, we'll use a simple API-based auth check:

```typescript
// src/app/api/auth/verify/route.ts
// POST endpoint that checks username/password against IndexedDB
// This is called from the client-side login form
```

For NextAuth with Dexie (client-only DB), use a JWT-only approach where the login form validates credentials client-side, then creates a JWT session.

**Alternative approach:** Since Dexie is client-side only, implement auth as a client-side check:
- Login page validates credentials against Dexie
- Stores auth token in localStorage/sessionStorage
- Admin layout checks for valid token
- No NextAuth needed (simplifies offline use)

**Decision:** Use a simpler client-side auth approach since the DB is client-only. This avoids the server/client mismatch with Dexie.

```typescript
// src/modules/auth/auth-store.ts
'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import bcrypt from 'bcryptjs'
import { userRepo } from '@/modules/storage/user-repo'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  mustChangePassword: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  changePassword: (newPassword: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      username: null,
      mustChangePassword: false,

      login: async (username: string, password: string) => {
        const user = await userRepo.getByUsername(username)
        if (!user) return false
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return false
        set({
          isAuthenticated: true,
          username: user.username,
          mustChangePassword: user.mustChangePassword,
        })
        return true
      },

      logout: () => {
        set({ isAuthenticated: false, username: null, mustChangePassword: false })
      },

      changePassword: async (newPassword: string) => {
        const { username } = get()
        if (!username) return false
        const user = await userRepo.getByUsername(username)
        if (!user) return false
        const hash = await bcrypt.hash(newPassword, 10)
        await userRepo.updatePassword(user.id, hash)
        set({ mustChangePassword: false })
        return true
      },
    }),
    { name: 'mc-auth' },
  ),
)
```

**Step 4: Create auth guard component**

```typescript
// src/components/admin/auth-guard.tsx
'use client'
import { useAuthStore } from '@/modules/auth/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/admin/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) return null
  return <>{children}</>
}
```

**Step 5: Add admin seed to CatalogProvider**

Update `src/modules/catalog/migration.ts` to also call `seedAdminUser()` after catalog migration.

**Step 6: Verify auth store works**

Run: `npm run dev` — check that `useAuthStore` persists to localStorage under key `mc-auth`.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add client-side auth system with Zustand persist"
```

---

### Task 8: Create admin login page

**Files:**
- Create: `src/app/admin/login/page.tsx`

**Step 1: Build the login form**

Simple card with username/password inputs, error message, and submit button. Uses shadcn components (Card, Input, Button, Label). Calls `useAuthStore().login()`. On success, redirects to `/admin`. On `mustChangePassword`, shows password change form.

**Step 2: Test login with seed credentials**

Run: `npm run dev` → navigate to `/admin/login` → login with `admin` / `admin` → should redirect to `/admin` and show password change prompt.

**Step 3: Commit**

```bash
git add src/app/admin/login/page.tsx
git commit -m "feat: add admin login page"
```

---

## Phase 3: Admin Layout & Dashboard

### Task 9: Create admin layout with sidebar

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/admin-sidebar.tsx`
- Create: `src/app/admin/page.tsx`

**Step 1: Build admin layout**

```typescript
// src/app/admin/layout.tsx
import { AuthGuard } from '@/components/admin/auth-guard'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <AdminSidebar />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </AuthGuard>
  )
}
```

**Step 2: Build sidebar**

Sidebar with nav links: Dashboard, Kategorien, Modelle, Optionsgruppen, Optionen, Einstellungen, Logout. Use `lucide-react` icons. Active state highlighted.

**Step 3: Build admin dashboard**

Show summary cards: total categories, total models, total option groups, total options. Use `useLiveQuery` to count from each table.

**Step 4: Verify admin section works**

Run: `npm run dev` → login → see admin dashboard with counts → sidebar navigation works.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin layout with sidebar and dashboard"
```

---

## Phase 4: Admin CRUD Pages

### Task 10: Categories admin page

**Files:**
- Create: `src/app/admin/categories/page.tsx`
- Create: `src/components/admin/category-form.tsx`
- Create: `src/components/admin/image-upload.tsx`

**Step 1: Build reusable image upload component**

Drag & drop zone that accepts images, shows preview, stores as Blob. Uses native `<input type="file">` with drag events.

```typescript
// src/components/admin/image-upload.tsx
// Props: value?: Blob, onChange: (blob: Blob | undefined) => void, label: string
// Shows current image preview if value exists
// Drop zone with "Bild hochladen" text
// Click or drag to upload
// "Entfernen" button to clear
```

**Step 2: Build category form (Sheet)**

A `Sheet` (shadcn) component with fields: Name, Sort Order, Active toggle, Image upload. Used for both create and edit.

**Step 3: Build categories list page**

Table with columns: Image (thumbnail), Name, Sort Order, Active (badge), Actions (Edit, Delete). "Neue Kategorie" button opens the form Sheet.

**Step 4: Verify CRUD operations**

Run: `npm run dev` → `/admin/categories` → create a category → edit it → toggle active → delete it. Check IndexedDB.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add categories admin page with CRUD and image upload"
```

---

### Task 11: Base Models admin page

**Files:**
- Create: `src/app/admin/models/page.tsx`
- Create: `src/components/admin/model-form.tsx`

**Step 1: Build model form (Sheet)**

Fields: Category (select dropdown from categories), SKU Code, Article No, Name, Description, Price Net, Price Gross, Sort Order, Active toggle, Image upload (required).

Price Gross should auto-calculate from Price Net × (1 + vatRate) but be overridable.

**Step 2: Build models list page**

Table: Image, Name, Category, Article No, Price Net, Active, Actions. Filter by category dropdown.

**Step 3: Verify CRUD**

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add base models admin page with CRUD"
```

---

### Task 12: Option Groups admin page

**Files:**
- Create: `src/app/admin/option-groups/page.tsx`
- Create: `src/components/admin/option-group-form.tsx`

**Step 1: Build option group form**

Fields: Name, Selection Type (SINGLE/MULTI radio), Applies To (multi-select checkboxes of categories), Sort Order, Active toggle.

**Step 2: Build list page**

Table: Name, Selection Type (badge), Applies To (category names), # Options, Active, Actions.

**Step 3: Verify and commit**

```bash
git add -A
git commit -m "feat: add option groups admin page with CRUD"
```

---

### Task 13: Options admin page

**Files:**
- Create: `src/app/admin/options/page.tsx`
- Create: `src/components/admin/option-form.tsx`

**Step 1: Build option form**

Fields: Option Group (select), SKU Code, Article No, Name, Description, Price Net, Price Gross (auto-calc), Sort Order, Active toggle, Is Default toggle, Image upload (optional).

**Step 2: Build list page**

Table: Image (if exists), Name, Group, Article No, Price Net, Default (◆), Active, Actions. Filter by group dropdown.

**Step 3: Verify and commit**

```bash
git add -A
git commit -m "feat: add options admin page with CRUD"
```

---

### Task 14: Settings admin page

**Files:**
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/components/admin/settings-form.tsx`

**Step 1: Build settings form**

Sections:
1. **Firma** — Firmenname, Straße, PLZ, Ort, Telefon, Fax, E-Mail, Website
2. **Steuern** — MwSt.-Satz (number input, default 19%)
3. **PDF-Design** — Primärfarbe (color picker or hex input), Akzentfarbe (color picker), Logo upload (Blob)
4. **Bank** — Bankname, IBAN, BIC (repeat for 2 banks)

All values read from and written to `settings` table.

**Step 2: Verify and commit**

```bash
git add -A
git commit -m "feat: add settings admin page"
```

---

## Phase 5: Configurator Image Integration

### Task 15: Update Model Picker with images

**Files:**
- Modify: `src/components/configurator/model-picker.tsx`

**Step 1: Add image display to model cards**

Read `imageBlob` from `BaseModelRecord`. Convert Blob to object URL via `URL.createObjectURL()`. Show in card above model name. Placeholder icon (from lucide-react, e.g. `Car`) when no image.

Card layout:
```
┌─────────────────────┐
│  [Image 16:9]       │
│  Model Name         │
│  Description        │
│  ab €X.XXX netto    │
│          [Wählen]   │
└─────────────────────┘
```

Use `aspect-video` Tailwind class for 16:9 ratio. `object-cover` for image fit.

**Step 2: Clean up object URLs**

Use `useEffect` cleanup to revoke object URLs when component unmounts.

**Step 3: Verify and commit**

```bash
git add src/components/configurator/model-picker.tsx
git commit -m "feat: show vehicle images in model picker cards"
```

---

### Task 16: Update Accessory Picker with optional images

**Files:**
- Modify: `src/components/configurator/accessory-picker.tsx`

**Step 1: Add optional thumbnail**

When `OptionRecord.imageBlob` exists, show 48×48 rounded thumbnail to the left of the option name. When no image, just show text (no placeholder).

**Step 2: Verify and commit**

```bash
git add src/components/configurator/accessory-picker.tsx
git commit -m "feat: show optional thumbnails in accessory picker"
```

---

## Phase 6: Corporate PDF Design

### Task 17: Create shared PDF corporate template helpers

**Files:**
- Create: `src/modules/pdf/corporate.ts`

**Step 1: Build corporate header/footer drawing functions**

```typescript
// src/modules/pdf/corporate.ts
import { rgb, type PDFDocument, type PDFPage, type PDFFont } from 'pdf-lib'
import { settingsRepo } from '@/modules/storage'

export interface CorporateSettings {
  companyName: string
  companyStreet: string
  companyZip: string
  companyCity: string
  companyPhone: string
  companyEmail: string
  companyWeb: string
  bankName1: string
  bankIban1: string
  bankBic1: string
  pdfColorPrimary: string // hex
  pdfColorAccent: string // hex
  logoBlob?: Blob
}

export async function loadCorporateSettings(): Promise<CorporateSettings> {
  // Read all needed settings from DB
  // Return with defaults for any missing values
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 }
    : { r: 0.23, g: 0.26, b: 0.31 } // default anthracite
}

export function drawCorporateHeader(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  settings: CorporateSettings,
  docTitle: string,
): number {
  // Draw anthracite header bar
  // Draw gold accent stripe on left
  // Draw company text in white
  // Draw doc title
  // Return new Y position after header
}

export function drawCorporateFooter(
  page: PDFPage,
  fonts: { regular: PDFFont },
  settings: CorporateSettings,
): void {
  // Draw footer with company address, bank details
  // Position at bottom of page
}

export function drawAccentStripe(page: PDFPage, accentColor: string): void {
  // Draw vertical gold stripe on left edge (8pt wide, full height)
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/modules/pdf/corporate.ts
git commit -m "feat: add corporate PDF template helpers (header, footer, colors)"
```

---

### Task 18: Update existing document PDF to use corporate design

**Files:**
- Modify: `src/modules/pdf/generator.ts`

**Step 1: Refactor `generateDocumentPdf`**

Replace the simple header with `drawCorporateHeader()`. Add `drawCorporateFooter()` on each page. Use `drawAccentStripe()` on each page. Keep line items table and pricing summary as-is.

Update data source: read from IndexedDB instead of `loadCatalog()` where needed.

**Step 2: Test PDF output**

Run: `npm run dev` → create a new quote → download PDF → verify header, footer, accent stripe, and colors match design.

**Step 3: Commit**

```bash
git add src/modules/pdf/generator.ts
git commit -m "feat: apply corporate design to document PDF"
```

---

## Phase 7: Blanko-PDF Generator

### Task 19: Build Blanko-PDF generator (Invacare-style)

**Files:**
- Create: `src/modules/pdf/blank-generator.ts`

**Step 1: Write the blank form generator**

```typescript
// src/modules/pdf/blank-generator.ts

export async function generateBlankFormPdf(categoryId: string): Promise<Uint8Array> {
  // 1. Load corporate settings
  // 2. Load all base models for this category
  // 3. Load all option groups applicable to this category
  // 4. Load all active options per group
  //
  // PDF Structure:
  // - Corporate header with "BESTELLFORMULAR"
  // - Accent stripe on left
  // - Customer fields (blank lines): Kunden-Nr, Ansprechpartner, Firma, Straße, PLZ/Ort
  //
  // - Table with columns: ☐ | Art.-Nr. | Beschreibung | Netto | Brutto
  //
  // - Section: BASISMODELLE
  //   - Row per base model with checkbox, article no, name, prices
  //
  // - Section per option group:
  //   - Group name as section header
  //   - Row per option with checkbox
  //   - If MULTI: add "Menge: ___" column instead of individual price
  //   - If isDefault: append ◆ to name
  //
  // - Summary section (blank lines): Netto, MwSt, Brutto
  // - Notes section (blank lines)
  // - Date + Signature line
  // - Corporate footer
  //
  // Handle page breaks: check Y position before each section/row
}
```

Key details:
- Checkbox: draw a small rectangle (8×8pt) with no fill
- ◆ symbol for default options: use `\u25C6` character
- Alternating row backgrounds: white / light gray
- Section headers: bold, anthracite background, white text
- Blank input fields: draw underline (thin gray line)
- For MULTI groups: "Menge" column with blank underline instead of per-item total

**Step 2: Test with a single category**

Run: `npm run dev` → temporarily add a test button that calls `generateBlankFormPdf('trike')` and triggers download. Verify PDF looks correct.

**Step 3: Commit**

```bash
git add src/modules/pdf/blank-generator.ts
git commit -m "feat: add Invacare-style blank form PDF generator"
```

---

### Task 20: Add Blanko-PDF buttons to dashboard

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/dashboard/blank-pdf-buttons.tsx`

**Step 1: Build BlankPdfButtons component**

```typescript
// src/components/dashboard/blank-pdf-buttons.tsx
'use client'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/modules/storage/db'
import { generateBlankFormPdf } from '@/modules/pdf/blank-generator'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

export function BlankPdfButtons() {
  const categories = useLiveQuery(
    () => db.categories.where('isActive').equals(1).sortBy('sortOrder'),
    [],
  )

  const handleDownload = async (categoryId: string, categoryName: string) => {
    const pdfBytes = await generateBlankFormPdf(categoryId)
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Blanko-${categoryName}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!categories) return null

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant="outline"
          onClick={() => handleDownload(cat.id, cat.name)}
        >
          <FileText className="mr-2 h-4 w-4" />
          Blanko: {cat.name}
        </Button>
      ))}
    </div>
  )
}
```

**Step 2: Add to dashboard page**

In `src/app/page.tsx`, add a section "Blanko-Formulare" with the `<BlankPdfButtons />` component between the action buttons and the document list.

**Step 3: Test end-to-end**

Run: `npm run dev` → dashboard shows Blanko buttons per category → click one → PDF downloads → verify content matches the design.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Blanko-PDF download buttons to dashboard"
```

---

## Phase 8: Final Integration & Cleanup

### Task 21: Update blank form in document detail page

**Files:**
- Modify: `src/app/documents/[id]/page.tsx`

**Step 1: Update the "Blanko herunterladen" button**

The existing document detail page has a blank form download. Update it to use the new `generateBlankFormPdf()` with the document's selected category.

**Step 2: Commit**

```bash
git add src/app/documents/[id]/page.tsx
git commit -m "feat: use new blank form generator in document detail page"
```

---

### Task 22: Full integration test

**Step 1: Test complete flow**

1. Fresh start (clear IndexedDB) → migration runs → catalog populates
2. Dashboard → Blanko buttons appear → download each → verify PDFs
3. Configurator → images shown on model cards → accessories have optional thumbnails
4. Create quote → download PDF → verify corporate design
5. Admin login → CRUD categories, models, options → changes reflect in configurator
6. Admin settings → change colors → re-download PDF → colors updated
7. Admin → upload images → configurator shows them

**Step 2: Fix any issues found**

**Step 3: Commit**

```bash
git add -A
git commit -m "fix: integration test fixes"
```

---

### Task 23: Clean up and remove legacy code

**Files:**
- Optionally remove direct usages of `loadCatalog()` from JSON
- Keep `catalog.json` as migration source (don't delete)
- Remove unused imports

**Step 1: Audit imports**

Search for remaining `loadCatalog` usage. Replace with IndexedDB reads.

**Step 2: Run linter and type check**

```bash
npx tsc --noEmit
npm run lint
```

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: clean up legacy catalog JSON imports"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1. Database | 1-5 | New types, Dexie v2, repos, migration, switch reads |
| 2. Auth | 6-8 | Dependencies, auth store, login page |
| 3. Admin Layout | 9 | Layout, sidebar, dashboard |
| 4. Admin CRUD | 10-14 | Categories, models, option groups, options, settings |
| 5. Images | 15-16 | Model picker images, accessory thumbnails |
| 6. Corporate PDF | 17-18 | Template helpers, update existing PDF |
| 7. Blanko-PDF | 19-20 | Invacare-style generator, dashboard buttons |
| 8. Integration | 21-23 | Document detail update, testing, cleanup |

**Total: 23 tasks across 8 phases**

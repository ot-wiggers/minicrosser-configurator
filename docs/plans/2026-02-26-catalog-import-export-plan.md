# Catalog Import/Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add JSON + XLSX import/export for the entire product catalog (categories, option groups, models, options) on a new `/admin/import-export` page.

**Architecture:** Client-side export (data already in `useQuery` cache, generate JSON/XLSX in browser, trigger download). Server-side import (client parses file + validates, then calls a single Convex mutation that upserts in dependency order: categories -> option groups -> models -> options).

**Tech Stack:** Next.js 16 + Convex, SheetJS (`xlsx` package) for XLSX read/write via dynamic import, existing shadcn/ui components.

**Design Doc:** `docs/plans/2026-02-26-catalog-import-export-design.md`

---

### Task 1: Install `xlsx` dependency

**Files:**
- Modify: `package.json`

**Step 1: Install SheetJS**

Run: `npm install xlsx`

**Step 2: Verify installation**

Run: `node -e "require('xlsx'); console.log('xlsx OK')"`
Expected: `xlsx OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add xlsx (SheetJS) for catalog import/export"
```

---

### Task 2: Create shared types for import/export

**Files:**
- Create: `src/lib/catalog-io-types.ts`

**Step 1: Create the types file**

```typescript
// src/lib/catalog-io-types.ts

/** Shape of a category in export/import JSON (no Convex IDs). */
export interface ExportCategory {
  name: string
  sortOrder: number
  isActive: boolean
}

/** Shape of an option group in export/import JSON. */
export interface ExportOptionGroup {
  name: string
  selectionType: 'SINGLE' | 'MULTI'
  appliesTo: string[] // category names
  sortOrder: number
  isActive: boolean
}

/** Shape of a base model in export/import JSON. */
export interface ExportBaseModel {
  categoryRef: string // category name
  skuCode: string
  articleNo: string
  name: string
  description: string | null
  priceNet: number
  priceGross: number
  sortOrder: number
  isActive: boolean
}

/** Shape of an option in export/import JSON. */
export interface ExportOption {
  optionGroupRef: string // option group name
  skuCode: string
  articleNo: string
  name: string
  description: string | null
  priceNet: number
  priceGross: number
  sortOrder: number
  isActive: boolean
  isDefault: boolean
}

/** Root shape of the exported JSON file. */
export interface CatalogExportJson {
  version: 1
  exportedAt: string
  categories: ExportCategory[]
  optionGroups: ExportOptionGroup[]
  baseModels: ExportBaseModel[]
  options: ExportOption[]
}

/** Error from parsing a single row. */
export interface ParseRowError {
  entity: 'category' | 'optionGroup' | 'baseModel' | 'option'
  row: number
  field: string
  message: string
}

/** Result of parsing an import file. */
export interface ParseResult {
  categories: ExportCategory[]
  optionGroups: ExportOptionGroup[]
  baseModels: ExportBaseModel[]
  options: ExportOption[]
  errors: ParseRowError[]
  warnings: string[]
}

/** Preview of what an import will do, per entity. */
export interface EntityPreview {
  new: number
  updated: number
  errors: ParseRowError[]
}

export interface ImportPreview {
  categories: EntityPreview
  optionGroups: EntityPreview
  baseModels: EntityPreview
  options: EntityPreview
}

/** Result returned from the server after import. */
export interface ImportResult {
  categories: { created: number; updated: number }
  optionGroups: { created: number; updated: number }
  baseModels: { created: number; updated: number }
  options: { created: number; updated: number }
  errors: Array<{ entity: string; name: string; message: string }>
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit src/lib/catalog-io-types.ts 2>&1 | head -5`
Expected: No errors (or only unrelated ones from other files)

**Step 3: Commit**

```bash
git add src/lib/catalog-io-types.ts
git commit -m "feat(import-export): add shared TypeScript types"
```

---

### Task 3: Create catalog export module

**Files:**
- Create: `src/lib/catalog-export.ts`

**Step 1: Create the export module**

This module takes catalog data (from Convex `useQuery`) and produces JSON string or XLSX ArrayBuffer. It replaces Convex IDs with human-readable name references.

```typescript
// src/lib/catalog-export.ts
import type {
  CatalogExportJson,
  ExportCategory,
  ExportOptionGroup,
  ExportBaseModel,
  ExportOption,
} from './catalog-io-types'

// ── Input types (what useQuery returns, with Convex _id fields) ─────

interface DbCategory {
  _id: string
  name: string
  sortOrder: number
  isActive: boolean
  [key: string]: unknown
}

interface DbOptionGroup {
  _id: string
  name: string
  selectionType: 'SINGLE' | 'MULTI'
  appliesTo: string[] // category IDs
  sortOrder: number
  isActive: boolean
  [key: string]: unknown
}

interface DbBaseModel {
  _id: string
  categoryId: string
  skuCode: string
  articleNo: string
  name: string
  description?: string
  priceNet: number
  priceGross: number
  sortOrder: number
  isActive: boolean
  [key: string]: unknown
}

interface DbOption {
  _id: string
  optionGroupId: string
  skuCode: string
  articleNo: string
  name: string
  description?: string
  priceNet: number
  priceGross: number
  sortOrder: number
  isActive: boolean
  isDefault: boolean
  [key: string]: unknown
}

export interface CatalogData {
  categories: DbCategory[]
  baseModels: DbBaseModel[]
  optionGroups: DbOptionGroup[]
  options: DbOption[]
}

// ── Helpers ─────────────────────────────────────────────────────────

function buildIdToNameMap(items: { _id: string; name: string }[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of items) {
    map.set(item._id, item.name)
  }
  return map
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Export to JSON ──────────────────────────────────────────────────

export function buildExportPayload(data: CatalogData): CatalogExportJson {
  const categoryIdToName = buildIdToNameMap(data.categories)
  const groupIdToName = buildIdToNameMap(data.optionGroups)

  const categories: ExportCategory[] = data.categories.map((c) => ({
    name: c.name,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  }))

  const optionGroups: ExportOptionGroup[] = data.optionGroups.map((g) => ({
    name: g.name,
    selectionType: g.selectionType,
    appliesTo: g.appliesTo
      .map((id) => categoryIdToName.get(id) ?? id)
      .filter(Boolean),
    sortOrder: g.sortOrder,
    isActive: g.isActive,
  }))

  const baseModels: ExportBaseModel[] = data.baseModels.map((m) => ({
    categoryRef: categoryIdToName.get(m.categoryId) ?? m.categoryId,
    skuCode: m.skuCode,
    articleNo: m.articleNo,
    name: m.name,
    description: m.description ?? null,
    priceNet: m.priceNet,
    priceGross: m.priceGross,
    sortOrder: m.sortOrder,
    isActive: m.isActive,
  }))

  const options: ExportOption[] = data.options.map((o) => ({
    optionGroupRef: groupIdToName.get(o.optionGroupId) ?? o.optionGroupId,
    skuCode: o.skuCode,
    articleNo: o.articleNo,
    name: o.name,
    description: o.description ?? null,
    priceNet: o.priceNet,
    priceGross: o.priceGross,
    sortOrder: o.sortOrder,
    isActive: o.isActive,
    isDefault: o.isDefault,
  }))

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    categories,
    optionGroups,
    baseModels,
    options,
  }
}

export function exportCatalogToJson(data: CatalogData): string {
  const payload = buildExportPayload(data)
  return JSON.stringify(payload, null, 2)
}

// ── Export to XLSX ──────────────────────────────────────────────────

export async function exportCatalogToXlsx(data: CatalogData): Promise<Uint8Array> {
  const XLSX = await import('xlsx')
  const payload = buildExportPayload(data)

  const wb = XLSX.utils.book_new()

  // Sheet 1: Kategorien
  const catSheet = XLSX.utils.json_to_sheet(payload.categories)
  XLSX.utils.book_append_sheet(wb, catSheet, 'Kategorien')

  // Sheet 2: Optionsgruppen — flatten appliesTo to comma-separated string
  const ogRows = payload.optionGroups.map((g) => ({
    ...g,
    appliesTo: g.appliesTo.join(', '),
  }))
  const ogSheet = XLSX.utils.json_to_sheet(ogRows)
  XLSX.utils.book_append_sheet(wb, ogSheet, 'Optionsgruppen')

  // Sheet 3: Modelle
  const modelSheet = XLSX.utils.json_to_sheet(payload.baseModels)
  XLSX.utils.book_append_sheet(wb, modelSheet, 'Modelle')

  // Sheet 4: Optionen
  const optSheet = XLSX.utils.json_to_sheet(payload.options)
  XLSX.utils.book_append_sheet(wb, optSheet, 'Optionen')

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array
}

// ── Download helper ────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadJsonExport(data: CatalogData) {
  const json = exportCatalogToJson(data)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, `katalog-export-${todayString()}.json`)
}

export async function downloadXlsxExport(data: CatalogData) {
  const buffer = await exportCatalogToXlsx(data)
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `katalog-export-${todayString()}.xlsx`)
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep catalog-export || echo "No errors in catalog-export"`

**Step 3: Commit**

```bash
git add src/lib/catalog-export.ts
git commit -m "feat(import-export): add client-side catalog export (JSON + XLSX)"
```

---

### Task 4: Create catalog import parsing module

**Files:**
- Create: `src/lib/catalog-import.ts`

**Step 1: Create the import parsing module**

This module parses JSON or XLSX files and validates the data. It does NOT write to Convex — that's the server mutation's job.

```typescript
// src/lib/catalog-import.ts
import type {
  CatalogExportJson,
  ExportCategory,
  ExportOptionGroup,
  ExportBaseModel,
  ExportOption,
  ParseResult,
  ParseRowError,
  ImportPreview,
  EntityPreview,
} from './catalog-io-types'

// ── JSON Parsing ────────────────────────────────────────────────────

export function parseCatalogJson(content: string): ParseResult {
  const errors: ParseRowError[] = []
  const warnings: string[] = []

  let parsed: CatalogExportJson
  try {
    parsed = JSON.parse(content)
  } catch {
    return {
      categories: [],
      optionGroups: [],
      baseModels: [],
      options: [],
      errors: [{ entity: 'category', row: 0, field: '', message: 'Ungultiges JSON-Format' }],
      warnings: [],
    }
  }

  if (parsed.version !== 1) {
    warnings.push(`Unbekannte Version: ${parsed.version}. Versuche trotzdem zu importieren.`)
  }

  const categories = validateCategories(parsed.categories ?? [], errors)
  const optionGroups = validateOptionGroups(parsed.optionGroups ?? [], errors)
  const baseModels = validateBaseModels(parsed.baseModels ?? [], errors)
  const options = validateOptions(parsed.options ?? [], errors)

  return { categories, optionGroups, baseModels, options, errors, warnings }
}

// ── XLSX Parsing ────────────────────────────────────────────────────

export async function parseCatalogXlsx(buffer: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import('xlsx')
  const errors: ParseRowError[] = []
  const warnings: string[] = []

  const wb = XLSX.read(buffer, { type: 'array' })

  // Read sheets by name (German names as defined in export)
  const catRows = readSheet<Record<string, unknown>>(wb, 'Kategorien', warnings)
  const ogRows = readSheet<Record<string, unknown>>(wb, 'Optionsgruppen', warnings)
  const modelRows = readSheet<Record<string, unknown>>(wb, 'Modelle', warnings)
  const optRows = readSheet<Record<string, unknown>>(wb, 'Optionen', warnings)

  const categories = validateCategories(
    catRows.map((r) => ({
      name: String(r.name ?? ''),
      sortOrder: Number(r.sortOrder ?? 0),
      isActive: parseBool(r.isActive),
    })),
    errors,
  )

  const optionGroups = validateOptionGroups(
    ogRows.map((r) => ({
      name: String(r.name ?? ''),
      selectionType: String(r.selectionType ?? 'SINGLE') as 'SINGLE' | 'MULTI',
      appliesTo: typeof r.appliesTo === 'string'
        ? r.appliesTo.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      sortOrder: Number(r.sortOrder ?? 0),
      isActive: parseBool(r.isActive),
    })),
    errors,
  )

  const baseModels = validateBaseModels(
    modelRows.map((r) => ({
      categoryRef: String(r.categoryRef ?? ''),
      skuCode: String(r.skuCode ?? ''),
      articleNo: String(r.articleNo ?? ''),
      name: String(r.name ?? ''),
      description: r.description ? String(r.description) : null,
      priceNet: Number(r.priceNet ?? 0),
      priceGross: Number(r.priceGross ?? 0),
      sortOrder: Number(r.sortOrder ?? 0),
      isActive: parseBool(r.isActive),
    })),
    errors,
  )

  const options = validateOptions(
    optRows.map((r) => ({
      optionGroupRef: String(r.optionGroupRef ?? ''),
      skuCode: String(r.skuCode ?? ''),
      articleNo: String(r.articleNo ?? ''),
      name: String(r.name ?? ''),
      description: r.description ? String(r.description) : null,
      priceNet: Number(r.priceNet ?? 0),
      priceGross: Number(r.priceGross ?? 0),
      sortOrder: Number(r.sortOrder ?? 0),
      isActive: parseBool(r.isActive),
      isDefault: parseBool(r.isDefault),
    })),
    errors,
  )

  return { categories, optionGroups, baseModels, options, errors, warnings }
}

// ── Helpers ─────────────────────────────────────────────────────────

function readSheet<T>(wb: { Sheets: Record<string, unknown>; SheetNames: string[] }, sheetName: string, warnings: string[]): T[] {
  // Dynamic import already happened in caller, so we access XLSX via the wb object
  // We need to use the xlsx utils here - import synchronously since caller already loaded it
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx')
    const sheet = wb.Sheets[sheetName]
    if (!sheet) {
      warnings.push(`Arbeitsblatt "${sheetName}" nicht gefunden. Ubersprungen.`)
      return []
    }
    return XLSX.utils.sheet_to_json(sheet) as T[]
  } catch {
    warnings.push(`Fehler beim Lesen von "${sheetName}".`)
    return []
  }
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true'
  if (typeof value === 'number') return value !== 0
  return true // default to active
}

// ── Validation ──────────────────────────────────────────────────────

function validateCategories(items: ExportCategory[], errors: ParseRowError[]): ExportCategory[] {
  const valid: ExportCategory[] = []
  items.forEach((item, i) => {
    if (!item.name?.trim()) {
      errors.push({ entity: 'category', row: i + 1, field: 'name', message: 'Name ist erforderlich' })
      return
    }
    valid.push({
      name: item.name.trim(),
      sortOrder: Number(item.sortOrder) || 0,
      isActive: item.isActive ?? true,
    })
  })
  return valid
}

function validateOptionGroups(items: ExportOptionGroup[], errors: ParseRowError[]): ExportOptionGroup[] {
  const valid: ExportOptionGroup[] = []
  items.forEach((item, i) => {
    if (!item.name?.trim()) {
      errors.push({ entity: 'optionGroup', row: i + 1, field: 'name', message: 'Name ist erforderlich' })
      return
    }
    const st = item.selectionType
    if (st !== 'SINGLE' && st !== 'MULTI') {
      errors.push({ entity: 'optionGroup', row: i + 1, field: 'selectionType', message: `Ungultiger selectionType: "${st}". Erlaubt: SINGLE, MULTI` })
      return
    }
    valid.push({
      name: item.name.trim(),
      selectionType: st,
      appliesTo: Array.isArray(item.appliesTo) ? item.appliesTo.map((s) => s.trim()).filter(Boolean) : [],
      sortOrder: Number(item.sortOrder) || 0,
      isActive: item.isActive ?? true,
    })
  })
  return valid
}

function validateBaseModels(items: ExportBaseModel[], errors: ParseRowError[]): ExportBaseModel[] {
  const valid: ExportBaseModel[] = []
  items.forEach((item, i) => {
    const row = i + 1
    if (!item.skuCode?.trim()) {
      errors.push({ entity: 'baseModel', row, field: 'skuCode', message: 'SKU-Code ist erforderlich' })
      return
    }
    if (!item.name?.trim()) {
      errors.push({ entity: 'baseModel', row, field: 'name', message: 'Name ist erforderlich' })
      return
    }
    if (!item.categoryRef?.trim()) {
      errors.push({ entity: 'baseModel', row, field: 'categoryRef', message: 'Kategorie-Referenz ist erforderlich' })
      return
    }
    valid.push({
      categoryRef: item.categoryRef.trim(),
      skuCode: item.skuCode.trim(),
      articleNo: String(item.articleNo ?? '').trim(),
      name: item.name.trim(),
      description: item.description || null,
      priceNet: Number(item.priceNet) || 0,
      priceGross: Number(item.priceGross) || 0,
      sortOrder: Number(item.sortOrder) || 0,
      isActive: item.isActive ?? true,
    })
  })
  return valid
}

function validateOptions(items: ExportOption[], errors: ParseRowError[]): ExportOption[] {
  const valid: ExportOption[] = []
  items.forEach((item, i) => {
    const row = i + 1
    if (!item.skuCode?.trim()) {
      errors.push({ entity: 'option', row, field: 'skuCode', message: 'SKU-Code ist erforderlich' })
      return
    }
    if (!item.name?.trim()) {
      errors.push({ entity: 'option', row, field: 'name', message: 'Name ist erforderlich' })
      return
    }
    if (!item.optionGroupRef?.trim()) {
      errors.push({ entity: 'option', row, field: 'optionGroupRef', message: 'Optionsgruppen-Referenz ist erforderlich' })
      return
    }
    valid.push({
      optionGroupRef: item.optionGroupRef.trim(),
      skuCode: item.skuCode.trim(),
      articleNo: String(item.articleNo ?? '').trim(),
      name: item.name.trim(),
      description: item.description || null,
      priceNet: Number(item.priceNet) || 0,
      priceGross: Number(item.priceGross) || 0,
      sortOrder: Number(item.sortOrder) || 0,
      isActive: item.isActive ?? true,
      isDefault: item.isDefault ?? false,
    })
  })
  return valid
}

// ── Preview Generation ──────────────────────────────────────────────

/**
 * Compares parsed import data against existing DB data to produce a preview.
 * `existing*` params are the current records from Convex useQuery.
 */
export function generateImportPreview(
  parsed: ParseResult,
  existingCategories: { name: string }[],
  existingOptionGroups: { name: string }[],
  existingBaseModels: { skuCode: string }[],
  existingOptions: { skuCode: string }[],
): ImportPreview {
  const existingCatNames = new Set(existingCategories.map((c) => c.name))
  const existingOgNames = new Set(existingOptionGroups.map((g) => g.name))
  const existingModelSkus = new Set(existingBaseModels.map((m) => m.skuCode))
  const existingOptionSkus = new Set(existingOptions.map((o) => o.skuCode))

  function preview(
    items: { name?: string; skuCode?: string }[],
    existingSet: Set<string>,
    keyFn: (item: any) => string,
    entityErrors: ParseRowError[],
  ): EntityPreview {
    let newCount = 0
    let updatedCount = 0
    for (const item of items) {
      if (existingSet.has(keyFn(item))) {
        updatedCount++
      } else {
        newCount++
      }
    }
    return { new: newCount, updated: updatedCount, errors: entityErrors }
  }

  const catErrors = parsed.errors.filter((e) => e.entity === 'category')
  const ogErrors = parsed.errors.filter((e) => e.entity === 'optionGroup')
  const modelErrors = parsed.errors.filter((e) => e.entity === 'baseModel')
  const optErrors = parsed.errors.filter((e) => e.entity === 'option')

  return {
    categories: preview(parsed.categories, existingCatNames, (c) => c.name, catErrors),
    optionGroups: preview(parsed.optionGroups, existingOgNames, (g) => g.name, ogErrors),
    baseModels: preview(parsed.baseModels, existingModelSkus, (m) => m.skuCode, modelErrors),
    options: preview(parsed.options, existingOptionSkus, (o) => o.skuCode, optErrors),
  }
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep catalog-import || echo "No errors in catalog-import"`

**Step 3: Commit**

```bash
git add src/lib/catalog-import.ts
git commit -m "feat(import-export): add client-side catalog import parser and validator"
```

---

### Task 5: Create Convex server-side import mutation

**Files:**
- Create: `convex/catalogImport.ts`

**Step 1: Create the Convex mutation**

This single mutation receives validated import data and performs upserts in dependency order.

```typescript
// convex/catalogImport.ts
import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const importCatalog = mutation({
  args: {
    categories: v.array(
      v.object({
        name: v.string(),
        sortOrder: v.number(),
        isActive: v.boolean(),
      }),
    ),
    optionGroups: v.array(
      v.object({
        name: v.string(),
        selectionType: v.union(v.literal('SINGLE'), v.literal('MULTI')),
        appliesTo: v.array(v.string()), // category names
        sortOrder: v.number(),
        isActive: v.boolean(),
      }),
    ),
    baseModels: v.array(
      v.object({
        categoryRef: v.string(), // category name
        skuCode: v.string(),
        articleNo: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        priceNet: v.number(),
        priceGross: v.number(),
        sortOrder: v.number(),
        isActive: v.boolean(),
      }),
    ),
    options: v.array(
      v.object({
        optionGroupRef: v.string(), // option group name
        skuCode: v.string(),
        articleNo: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        priceNet: v.number(),
        priceGross: v.number(),
        sortOrder: v.number(),
        isActive: v.boolean(),
        isDefault: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const result = {
      categories: { created: 0, updated: 0 },
      optionGroups: { created: 0, updated: 0 },
      baseModels: { created: 0, updated: 0 },
      options: { created: 0, updated: 0 },
      errors: [] as Array<{ entity: string; name: string; message: string }>,
    }

    // ── 1. Upsert Categories ──────────────────────────────────────
    // Build a name → ID map for resolving references later
    const categoryNameToId = new Map<string, string>()

    // Pre-load existing categories
    const existingCategories = await ctx.db.query('categories').collect()
    for (const cat of existingCategories) {
      categoryNameToId.set(cat.name, cat._id)
    }

    for (const cat of args.categories) {
      try {
        const existingId = categoryNameToId.get(cat.name)
        if (existingId) {
          await ctx.db.patch(existingId as any, {
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          })
          result.categories.updated++
        } else {
          const newId = await ctx.db.insert('categories', {
            name: cat.name,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          })
          categoryNameToId.set(cat.name, newId)
          result.categories.created++
        }
      } catch (e) {
        result.errors.push({ entity: 'category', name: cat.name, message: String(e) })
      }
    }

    // ── 2. Upsert Option Groups ───────────────────────────────────
    const groupNameToId = new Map<string, string>()

    const existingGroups = await ctx.db.query('optionGroups').collect()
    for (const g of existingGroups) {
      groupNameToId.set(g.name, g._id)
    }

    for (const og of args.optionGroups) {
      try {
        // Resolve appliesTo category names → IDs
        const appliesToIds: string[] = []
        for (const catName of og.appliesTo) {
          const catId = categoryNameToId.get(catName)
          if (catId) {
            appliesToIds.push(catId)
          } else {
            result.errors.push({
              entity: 'optionGroup',
              name: og.name,
              message: `Kategorie "${catName}" in appliesTo nicht gefunden`,
            })
          }
        }

        const existingId = groupNameToId.get(og.name)
        if (existingId) {
          await ctx.db.patch(existingId as any, {
            selectionType: og.selectionType,
            appliesTo: appliesToIds,
            sortOrder: og.sortOrder,
            isActive: og.isActive,
          })
          result.optionGroups.updated++
        } else {
          const newId = await ctx.db.insert('optionGroups', {
            name: og.name,
            selectionType: og.selectionType,
            appliesTo: appliesToIds,
            sortOrder: og.sortOrder,
            isActive: og.isActive,
          })
          groupNameToId.set(og.name, newId)
          result.optionGroups.created++
        }
      } catch (e) {
        result.errors.push({ entity: 'optionGroup', name: og.name, message: String(e) })
      }
    }

    // ── 3. Upsert Base Models ─────────────────────────────────────
    for (const model of args.baseModels) {
      try {
        const categoryId = categoryNameToId.get(model.categoryRef)
        if (!categoryId) {
          result.errors.push({
            entity: 'baseModel',
            name: model.skuCode,
            message: `Kategorie "${model.categoryRef}" nicht gefunden`,
          })
          continue
        }

        const existing = await ctx.db
          .query('baseModels')
          .withIndex('by_skuCode', (q) => q.eq('skuCode', model.skuCode))
          .first()

        if (existing) {
          await ctx.db.patch(existing._id, {
            categoryId: categoryId as any,
            articleNo: model.articleNo,
            name: model.name,
            description: model.description,
            priceNet: model.priceNet,
            priceGross: model.priceGross,
            sortOrder: model.sortOrder,
            isActive: model.isActive,
          })
          result.baseModels.updated++
        } else {
          await ctx.db.insert('baseModels', {
            categoryId: categoryId as any,
            skuCode: model.skuCode,
            articleNo: model.articleNo,
            name: model.name,
            description: model.description,
            priceNet: model.priceNet,
            priceGross: model.priceGross,
            sortOrder: model.sortOrder,
            isActive: model.isActive,
          })
          result.baseModels.created++
        }
      } catch (e) {
        result.errors.push({ entity: 'baseModel', name: model.skuCode, message: String(e) })
      }
    }

    // ── 4. Upsert Options ─────────────────────────────────────────
    for (const opt of args.options) {
      try {
        const groupId = groupNameToId.get(opt.optionGroupRef)
        if (!groupId) {
          result.errors.push({
            entity: 'option',
            name: opt.skuCode,
            message: `Optionsgruppe "${opt.optionGroupRef}" nicht gefunden`,
          })
          continue
        }

        const existing = await ctx.db
          .query('options')
          .withIndex('by_skuCode', (q) => q.eq('skuCode', opt.skuCode))
          .first()

        if (existing) {
          await ctx.db.patch(existing._id, {
            optionGroupId: groupId as any,
            articleNo: opt.articleNo,
            name: opt.name,
            description: opt.description,
            priceNet: opt.priceNet,
            priceGross: opt.priceGross,
            sortOrder: opt.sortOrder,
            isActive: opt.isActive,
            isDefault: opt.isDefault,
          })
          result.options.updated++
        } else {
          await ctx.db.insert('options', {
            optionGroupId: groupId as any,
            skuCode: opt.skuCode,
            articleNo: opt.articleNo,
            name: opt.name,
            description: opt.description,
            priceNet: opt.priceNet,
            priceGross: opt.priceGross,
            sortOrder: opt.sortOrder,
            isActive: opt.isActive,
            isDefault: opt.isDefault,
          })
          result.options.created++
        }
      } catch (e) {
        result.errors.push({ entity: 'option', name: opt.skuCode, message: String(e) })
      }
    }

    return result
  },
})
```

**Step 2: Verify Convex compiles**

Run: `npx convex dev --once 2>&1 | tail -5`
Expected: Successful push with no errors

**Step 3: Commit**

```bash
git add convex/catalogImport.ts
git commit -m "feat(import-export): add Convex mutation for catalog upsert import"
```

---

### Task 6: Create the Import/Export admin page

**Files:**
- Create: `src/app/admin/(authenticated)/import-export/page.tsx`

**Step 1: Create the page**

```tsx
// src/app/admin/(authenticated)/import-export/page.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Download, Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { downloadJsonExport, downloadXlsxExport } from '@/lib/catalog-export'
import type { CatalogData } from '@/lib/catalog-export'
import { parseCatalogJson, parseCatalogXlsx, generateImportPreview } from '@/lib/catalog-import'
import type { ParseResult, ImportPreview, ImportResult } from '@/lib/catalog-io-types'

export default function ImportExportPage() {
  const categories = useQuery(api.categories.list)
  const baseModels = useQuery(api.baseModels.list)
  const optionGroups = useQuery(api.optionGroups.list)
  const options = useQuery(api.options.list)
  const importMutation = useMutation(api.catalogImport.importCatalog)

  const [exporting, setExporting] = useState<'json' | 'xlsx' | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dataLoaded = categories && baseModels && optionGroups && options

  const catalogData: CatalogData | null = dataLoaded
    ? { categories, baseModels, optionGroups, options }
    : null

  // ── Export Handlers ─────────────────────────────────────────────

  async function handleExportJson() {
    if (!catalogData) return
    setExporting('json')
    try {
      downloadJsonExport(catalogData)
      toast.success('JSON-Export heruntergeladen')
    } catch (e) {
      toast.error('Export fehlgeschlagen')
      console.error(e)
    } finally {
      setExporting(null)
    }
  }

  async function handleExportXlsx() {
    if (!catalogData) return
    setExporting('xlsx')
    try {
      await downloadXlsxExport(catalogData)
      toast.success('Excel-Export heruntergeladen')
    } catch (e) {
      toast.error('Export fehlgeschlagen')
      console.error(e)
    } finally {
      setExporting(null)
    }
  }

  // ── Import Handlers ─────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (file: File) => {
      setImportFile(file)
      setImportResult(null)
      setParsed(null)
      setPreview(null)

      try {
        let result: ParseResult
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          result = parseCatalogJson(text)
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const buffer = await file.arrayBuffer()
          result = await parseCatalogXlsx(buffer)
        } else {
          toast.error('Nur .json und .xlsx Dateien werden unterstutzt.')
          return
        }

        setParsed(result)

        if (dataLoaded) {
          const prev = generateImportPreview(
            result,
            categories,
            optionGroups,
            baseModels,
            options,
          )
          setPreview(prev)
        }

        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} Validierungsfehler gefunden`)
        }
        if (result.warnings.length > 0) {
          result.warnings.forEach((w) => toast.info(w))
        }
      } catch (e) {
        toast.error('Datei konnte nicht gelesen werden')
        console.error(e)
      }
    },
    [categories, baseModels, optionGroups, options, dataLoaded],
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    setImportResult(null)

    try {
      // Convert parsed data for the Convex mutation.
      // Replace null descriptions with undefined for Convex's optional validator.
      const result = await importMutation({
        categories: parsed.categories,
        optionGroups: parsed.optionGroups,
        baseModels: parsed.baseModels.map((m) => ({
          ...m,
          description: m.description ?? undefined,
        })),
        options: parsed.options.map((o) => ({
          ...o,
          description: o.description ?? undefined,
        })),
      })

      setImportResult(result)

      const totalCreated =
        result.categories.created +
        result.optionGroups.created +
        result.baseModels.created +
        result.options.created
      const totalUpdated =
        result.categories.updated +
        result.optionGroups.updated +
        result.baseModels.updated +
        result.options.updated

      if (result.errors.length === 0) {
        toast.success(`Import abgeschlossen: ${totalCreated} neu, ${totalUpdated} aktualisiert`)
      } else {
        toast.warning(
          `Import teilweise abgeschlossen: ${totalCreated} neu, ${totalUpdated} aktualisiert, ${result.errors.length} Fehler`,
        )
      }
    } catch (e) {
      toast.error('Import fehlgeschlagen')
      console.error(e)
    } finally {
      setImporting(false)
    }
  }

  function resetImport() {
    setImportFile(null)
    setParsed(null)
    setPreview(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Import / Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Katalogdaten als JSON oder Excel exportieren und importieren.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Export Card ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export
            </CardTitle>
            <CardDescription>
              Gesamten Katalog als Datei herunterladen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataLoaded && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1">Aktueller Katalog:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>{categories.length} Kategorien</li>
                  <li>{baseModels.length} Modelle</li>
                  <li>{optionGroups.length} Optionsgruppen</li>
                  <li>{options.length} Optionen</li>
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleExportJson}
                disabled={!dataLoaded || exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'json' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileJson className="mr-2 h-4 w-4" />
                )}
                Als JSON
              </Button>
              <Button
                onClick={handleExportXlsx}
                disabled={!dataLoaded || exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'xlsx' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Als Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Import Card ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import
            </CardTitle>
            <CardDescription>
              Katalogdaten aus JSON oder Excel importieren (Upsert).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            {!importFile && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50"
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Datei hier ablegen</p>
                <p className="text-xs text-muted-foreground">oder klicken zum Auswahlen</p>
                <p className="mt-1 text-xs text-muted-foreground">.json oder .xlsx</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            )}

            {/* File selected — show preview */}
            {importFile && preview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{importFile.name}</p>
                  <Button variant="ghost" size="sm" onClick={resetImport}>
                    Andere Datei
                  </Button>
                </div>

                <Separator />

                {/* Preview table */}
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Entitat</th>
                        <th className="px-3 py-2 text-center font-medium">Neu</th>
                        <th className="px-3 py-2 text-center font-medium">Update</th>
                        <th className="px-3 py-2 text-center font-medium">Fehler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ['Kategorien', preview.categories],
                          ['Optionsgruppen', preview.optionGroups],
                          ['Modelle', preview.baseModels],
                          ['Optionen', preview.options],
                        ] as [string, typeof preview.categories][]
                      ).map(([label, ep]) => (
                        <tr key={label} className="border-b last:border-0">
                          <td className="px-3 py-2">{label}</td>
                          <td className="px-3 py-2 text-center">
                            {ep.new > 0 && (
                              <Badge variant="default" className="bg-green-600">
                                +{ep.new}
                              </Badge>
                            )}
                            {ep.new === 0 && <span className="text-muted-foreground">0</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {ep.updated > 0 && (
                              <Badge variant="secondary">{ep.updated}</Badge>
                            )}
                            {ep.updated === 0 && (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {ep.errors.length > 0 && (
                              <Badge variant="destructive">{ep.errors.length}</Badge>
                            )}
                            {ep.errors.length === 0 && (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Errors detail */}
                {parsed && parsed.errors.length > 0 && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                    <p className="flex items-center gap-1 text-sm font-medium text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {parsed.errors.length} Validierungsfehler
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-destructive">
                      {parsed.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>
                          Zeile {err.row} ({err.entity}): {err.field} — {err.message}
                        </li>
                      ))}
                      {parsed.errors.length > 10 && (
                        <li>... und {parsed.errors.length - 10} weitere</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Import button */}
                <Button
                  onClick={handleImport}
                  disabled={importing || !parsed || parsed.categories.length + parsed.optionGroups.length + parsed.baseModels.length + parsed.options.length === 0}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importiere...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importieren
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div className="rounded-md border border-green-600/50 bg-green-50 p-3 dark:bg-green-950/20">
                <p className="flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Import abgeschlossen
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-green-700 dark:text-green-400">
                  <li>
                    Kategorien: {importResult.categories.created} neu,{' '}
                    {importResult.categories.updated} aktualisiert
                  </li>
                  <li>
                    Optionsgruppen: {importResult.optionGroups.created} neu,{' '}
                    {importResult.optionGroups.updated} aktualisiert
                  </li>
                  <li>
                    Modelle: {importResult.baseModels.created} neu,{' '}
                    {importResult.baseModels.updated} aktualisiert
                  </li>
                  <li>
                    Optionen: {importResult.options.created} neu,{' '}
                    {importResult.options.updated} aktualisiert
                  </li>
                </ul>
                {importResult.errors.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs font-medium text-destructive">
                      {importResult.errors.length} Fehler:
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-destructive">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          {err.entity} &quot;{err.name}&quot;: {err.message}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Button variant="outline" size="sm" className="mt-3" onClick={resetImport}>
                  Neuer Import
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

**Step 2: Verify the page compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`
Expected: No errors related to the new page

**Step 3: Commit**

```bash
git add src/app/admin/\(authenticated\)/import-export/page.tsx
git commit -m "feat(import-export): add /admin/import-export page with export + import UI"
```

---

### Task 7: Add sidebar link for Import/Export

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx:21-29`

**Step 1: Add the nav item**

In `src/components/admin/admin-sidebar.tsx`, add the `ArrowLeftRight` icon to the imports and add a new nav item after `Kunden`:

Add to the lucide-react import:
```
ArrowLeftRight
```

Add this entry to the `navItems` array, after the `Contact` (Kunden) entry:

```typescript
{ href: '/admin/import-export', label: 'Import/Export', icon: ArrowLeftRight },
```

The full `navItems` array should be:

```typescript
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Kategorien', icon: FolderOpen },
  { href: '/admin/models', label: 'Modelle', icon: Car },
  { href: '/admin/option-groups', label: 'Optionsgruppen', icon: Layers },
  { href: '/admin/options', label: 'Optionen', icon: ListChecks },
  { href: '/admin/customers', label: 'Kunden', icon: Contact },
  { href: '/admin/import-export', label: 'Import/Export', icon: ArrowLeftRight },
  { href: '/admin/users', label: 'Benutzer', icon: Users },
  { href: '/admin/settings', label: 'Einstellungen', icon: Settings },
]
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep admin-sidebar || echo "No errors in admin-sidebar"`

**Step 3: Commit**

```bash
git add src/components/admin/admin-sidebar.tsx
git commit -m "feat(import-export): add Import/Export link to admin sidebar"
```

---

### Task 8: End-to-end verification

**Step 1: Verify full TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors (or only pre-existing ones unrelated to import/export)

**Step 2: Verify Convex push**

Run: `npx convex dev --once 2>&1 | tail -5`
Expected: Successful push

**Step 3: Verify Next.js build compiles the page**

Run: `npm run build 2>&1 | tail -15`
Expected: Successful build, `/admin/import-export` listed in output

**Step 4: Manual smoke test**

1. Start dev server: `npm run dev`
2. Navigate to `/admin/import-export`
3. Verify Export card shows catalog counts
4. Click "Als JSON" → verify JSON file downloads with correct structure
5. Click "Als Excel" → verify XLSX file downloads with 4 sheets
6. Re-import the JSON file → verify preview shows all items as "Update"
7. Re-import the XLSX file → verify same preview
8. Click "Importieren" → verify success message, 0 errors

**Step 5: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(import-export): address issues found during verification"
```

---

## File Summary

| File | Action | Task |
|------|--------|------|
| `package.json` | Modify | Task 1 |
| `src/lib/catalog-io-types.ts` | Create | Task 2 |
| `src/lib/catalog-export.ts` | Create | Task 3 |
| `src/lib/catalog-import.ts` | Create | Task 4 |
| `convex/catalogImport.ts` | Create | Task 5 |
| `src/app/admin/(authenticated)/import-export/page.tsx` | Create | Task 6 |
| `src/components/admin/admin-sidebar.tsx` | Modify | Task 7 |

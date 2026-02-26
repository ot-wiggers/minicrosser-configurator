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
  const catRows = readSheet<Record<string, unknown>>(XLSX, wb, 'Kategorien', warnings)
  const ogRows = readSheet<Record<string, unknown>>(XLSX, wb, 'Optionsgruppen', warnings)
  const modelRows = readSheet<Record<string, unknown>>(XLSX, wb, 'Modelle', warnings)
  const optRows = readSheet<Record<string, unknown>>(XLSX, wb, 'Optionen', warnings)

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
    modelRows.map((r) => {
      let specs: Array<{ label: string; value: string }> = []
      if (typeof r.specs === 'string' && r.specs.trim()) {
        try { specs = JSON.parse(r.specs) } catch { /* ignore */ }
      }
      return {
        categoryRef: String(r.categoryRef ?? ''),
        skuCode: String(r.skuCode ?? ''),
        articleNo: String(r.articleNo ?? ''),
        name: String(r.name ?? ''),
        description: r.description ? String(r.description) : null,
        priceNet: Number(r.priceNet ?? 0),
        priceGross: Number(r.priceGross ?? 0),
        sortOrder: Number(r.sortOrder ?? 0),
        isActive: parseBool(r.isActive),
        specs,
      } as any
    }),
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
      restrictToModels: typeof r.restrictToModels === 'string'
        ? r.restrictToModels.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
    } as any)),
    errors,
  )

  return { categories, optionGroups, baseModels, options, errors, warnings }
}

// ── Helpers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readSheet<T>(XLSX: any, wb: { Sheets: Record<string, unknown>; SheetNames: string[] }, sheetName: string, warnings: string[]): T[] {
  const sheet = wb.Sheets[sheetName]
  if (!sheet) {
    warnings.push(`Arbeitsblatt "${sheetName}" nicht gefunden. Ubersprungen.`)
    return []
  }
  try {
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
      specs: Array.isArray((item as any).specs) ? (item as any).specs.filter((s: any) => s.label && s.value) : [],
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
      restrictToModels: Array.isArray((item as any).restrictToModels) ? (item as any).restrictToModels : [],
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
    keyFn: (item: { name?: string; skuCode?: string }) => string,
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
    categories: preview(parsed.categories, existingCatNames, (c) => c.name!, catErrors),
    optionGroups: preview(parsed.optionGroups, existingOgNames, (g) => g.name!, ogErrors),
    baseModels: preview(parsed.baseModels, existingModelSkus, (m) => m.skuCode!, modelErrors),
    options: preview(parsed.options, existingOptionSkus, (o) => o.skuCode!, optErrors),
  }
}

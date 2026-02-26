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
  specs?: Array<{ label: string; value: string }>
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
  restrictToModels?: string[]
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

  const modelIdToName = buildIdToNameMap(data.baseModels)

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
    specs: m.specs ?? [],
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
    restrictToModels: (o.restrictToModels ?? [])
      .map((id) => modelIdToName.get(id) ?? id)
      .filter(Boolean),
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

export async function exportCatalogToXlsx(data: CatalogData): Promise<ArrayBuffer> {
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

  // Sheet 3: Modelle — flatten specs to JSON string
  const modelRows = payload.baseModels.map((m) => ({
    ...m,
    specs: m.specs.length > 0 ? JSON.stringify(m.specs) : '',
  }))
  const modelSheet = XLSX.utils.json_to_sheet(modelRows)
  XLSX.utils.book_append_sheet(wb, modelSheet, 'Modelle')

  // Sheet 4: Optionen — flatten restrictToModels to comma-separated string
  const optRows = payload.options.map((o) => ({
    ...o,
    restrictToModels: o.restrictToModels.join(', '),
  }))
  const optSheet = XLSX.utils.json_to_sheet(optRows)
  XLSX.utils.book_append_sheet(wb, optSheet, 'Optionen')

  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
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

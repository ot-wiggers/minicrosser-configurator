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
  const blob = new Blob([buffer.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `katalog-export-${todayString()}.xlsx`)
}

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
  specs: Array<{ label: string; value: string }>
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
  restrictToModels: string[]
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

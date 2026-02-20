import type { Catalog, VariantCategory, BaseModel, Sku, OptionGroup, OptionItem } from './types'

export function getBaseModelsByCategory(catalog: Catalog, category: VariantCategory): BaseModel[] {
  return catalog.base_models.filter((m) => m.category === category)
}

export function getSkuForBaseModel(catalog: Catalog, baseModelId: string): Sku | undefined {
  const mapping = catalog.base_model_skus.find((bms) => bms.base_model_id === baseModelId)
  if (!mapping) return undefined
  return catalog.skus.find((s) => s.sku_code === mapping.sku_code)
}

export function getOptionGroupsForCategory(
  catalog: Catalog,
  category: VariantCategory,
): OptionGroup[] {
  return catalog.option_groups
    .filter((g) => g.applicable_categories.includes(category))
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function getOptionItemsForGroup(catalog: Catalog, groupId: string): OptionItem[] {
  return catalog.option_items
    .filter((i) => i.option_group_id === groupId)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function getSkuByCode(catalog: Catalog, code: string): Sku | undefined {
  return catalog.skus.find((s) => s.sku_code === code)
}

export type VariantCategory = 'TRIKE' | 'QUAD' | 'HD' | 'CABIN'
export type SkuType = 'BASE' | 'OPTION'
export type SelectionType = 'SINGLE' | 'MULTI' | 'QTY'

export interface Sku {
  sku_code: string
  sku_type: SkuType
  article_no: string
  name: string
  description?: string
  unit: string
  price_net: number
  price_gross: number
  is_active: boolean
}

export interface BaseModel {
  id: string
  name: string
  category: VariantCategory
  description?: string
  image_url?: string
}

export interface BaseModelSku {
  base_model_id: string
  sku_code: string
}

export interface OptionGroup {
  id: string
  name: string
  sort_order: number
  selection_type: SelectionType
  applicable_categories: VariantCategory[]
}

export interface OptionItem {
  id: string
  option_group_id: string
  sku_code: string
  sort_order: number
  is_default: boolean
}

export interface Catalog {
  skus: Sku[]
  base_models: BaseModel[]
  base_model_skus: BaseModelSku[]
  option_groups: OptionGroup[]
  option_items: OptionItem[]
}

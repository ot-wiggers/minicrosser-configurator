import { db } from '@/modules/storage/db'
import type { Catalog } from './types'
import type {
  CategoryRecord,
  BaseModelRecord,
  OptionGroupRecord,
  OptionRecord,
} from './db-types'
import { seedAdminUser } from '@/modules/auth/seed'
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
    selectionType: g.selection_type === 'QTY' ? 'MULTI' : (g.selection_type as 'SINGLE' | 'MULTI'),
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

  // Seed admin user after catalog migration
  await seedAdminUser()
}

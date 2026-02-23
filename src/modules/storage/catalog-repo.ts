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
    const all = await db.categories.orderBy('sortOrder').toArray()
    return all.filter((c) => c.isActive)
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

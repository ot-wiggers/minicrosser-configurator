import { categoryRepo, baseModelRepo, optionGroupRepo, optionRepo } from '@/modules/storage'
import type { CategoryRecord, BaseModelRecord, OptionGroupRecord, OptionRecord } from './db-types'

export async function getActiveCategories(): Promise<CategoryRecord[]> {
  return categoryRepo.getActive()
}

export async function getBaseModelsForCategory(categoryId: string): Promise<BaseModelRecord[]> {
  return baseModelRepo.getActiveByCategoryId(categoryId)
}

export async function getOptionGroupsForCategory(
  categoryId: string,
): Promise<OptionGroupRecord[]> {
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

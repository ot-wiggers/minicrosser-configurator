import type { SelectedOption, LineItem, PricingSummary } from '@/modules/storage/types'
import { db } from '@/modules/storage/db'

const VAT_RATE = 0.19

interface PricingItem {
  skuCode: string
  articleNo: string
  name: string
  priceNet: number
}

export function calculatePricingFromItems(
  baseModel: PricingItem,
  selectedOptions: Array<PricingItem & { quantity: number }>,
  vatRate: number = VAT_RATE,
): PricingSummary {
  const lineItems: LineItem[] = []

  // Base model line item
  lineItems.push({
    skuCode: baseModel.skuCode,
    articleNo: baseModel.articleNo,
    name: baseModel.name,
    quantity: 1,
    unitPriceNet: baseModel.priceNet,
    totalNet: baseModel.priceNet,
  })

  // Option line items
  for (const opt of selectedOptions) {
    const qty = opt.quantity || 1
    lineItems.push({
      skuCode: opt.skuCode,
      articleNo: opt.articleNo,
      name: opt.name,
      quantity: qty,
      unitPriceNet: opt.priceNet,
      totalNet: opt.priceNet * qty,
    })
  }

  const totalNet = lineItems.reduce((sum, item) => sum + item.totalNet, 0)
  const vatAmount = Math.round(totalNet * vatRate * 100) / 100
  const totalGross = Math.round((totalNet + vatAmount) * 100) / 100

  return {
    lineItems,
    totalNet: Math.round(totalNet * 100) / 100,
    vatRate,
    vatAmount,
    totalGross,
  }
}

/**
 * Async pricing calculation that resolves options from IndexedDB.
 */
export async function calculatePricingAsync(
  baseModelId: string,
  selectedOptions: SelectedOption[],
): Promise<PricingSummary | null> {
  const baseModel = await db.baseModels.get(baseModelId)
  if (!baseModel) return null

  const optionItems: Array<PricingItem & { quantity: number }> = []
  for (const opt of selectedOptions) {
    const option = await db.options.where('skuCode').equals(opt.skuCode).first()
    if (option) {
      optionItems.push({
        skuCode: option.skuCode,
        articleNo: option.articleNo,
        name: option.name,
        priceNet: option.priceNet,
        quantity: opt.quantity || 1,
      })
    }
  }

  return calculatePricingFromItems(baseModel, optionItems)
}

import type { LineItem, PricingSummary } from '@/modules/storage/types'

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

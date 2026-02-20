import type { Catalog, Sku } from '@/modules/catalog/types'
import { getSkuByCode } from '@/modules/catalog/selectors'
import type { SelectedOption, LineItem, PricingSummary } from '@/modules/storage/types'

const VAT_RATE = 0.19

export function calculatePricing(
  baseSku: Sku,
  selectedOptions: SelectedOption[],
  catalog: Catalog,
): PricingSummary {
  const lineItems: LineItem[] = []

  // Base model line item
  lineItems.push({
    skuCode: baseSku.sku_code,
    articleNo: baseSku.article_no,
    name: baseSku.name,
    quantity: 1,
    unitPriceNet: baseSku.price_net,
    totalNet: baseSku.price_net,
  })

  // Option line items
  for (const opt of selectedOptions) {
    const sku = getSkuByCode(catalog, opt.skuCode)
    if (!sku) continue
    const qty = opt.quantity || 1
    lineItems.push({
      skuCode: sku.sku_code,
      articleNo: sku.article_no,
      name: sku.name,
      quantity: qty,
      unitPriceNet: sku.price_net,
      totalNet: sku.price_net * qty,
    })
  }

  const totalNet = lineItems.reduce((sum, item) => sum + item.totalNet, 0)
  const vatAmount = Math.round(totalNet * VAT_RATE * 100) / 100
  const totalGross = Math.round((totalNet + vatAmount) * 100) / 100

  return {
    lineItems,
    totalNet: Math.round(totalNet * 100) / 100,
    vatRate: VAT_RATE,
    vatAmount,
    totalGross,
  }
}

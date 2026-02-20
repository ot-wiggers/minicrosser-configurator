import type { DocumentRecord } from '@/modules/storage/types'
import type { Catalog, VariantCategory } from '@/modules/catalog/types'
import { getOptionGroupsForCategory, getOptionItemsForGroup, getSkuByCode } from '@/modules/catalog/selectors'
import {
  createContext,
  drawText,
  drawTextRight,
  moveDown,
  drawLine,
  drawHeading,
  checkPageBreak,
  formatCurrencyPdf,
} from './helpers'

const typeLabel: Record<string, string> = {
  QUOTE: 'ANGEBOT',
  ORDER: 'BESTELLUNG',
}

function formatDatePdf(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function generateDocumentPdf(doc: DocumentRecord): Promise<Uint8Array> {
  const ctx = await createContext()
  const rightEdge = ctx.pageWidth - ctx.margin

  // 1. Header
  drawText(ctx, typeLabel[doc.document_type] ?? 'DOKUMENT', ctx.margin, {
    size: 22,
    bold: true,
    color: { r: 0.91, g: 0.45, b: 0.1 },
  })
  drawTextRight(ctx, `Nr. ${doc.document_no}`, rightEdge, { size: 10 })
  moveDown(ctx, 18)
  drawTextRight(ctx, `Datum: ${formatDatePdf(doc.created_at)}`, rightEdge, { size: 10 })
  moveDown(ctx, 30)

  // 2. Customer block
  drawHeading(ctx, 'Kundendaten')
  drawText(ctx, doc.customer.company, ctx.margin, { bold: true })
  moveDown(ctx)
  drawText(ctx, `${doc.customer.firstName} ${doc.customer.lastName}`, ctx.margin)
  moveDown(ctx)
  drawText(ctx, doc.customer.street, ctx.margin)
  moveDown(ctx)
  drawText(ctx, `${doc.customer.zip} ${doc.customer.city}`, ctx.margin)
  moveDown(ctx)
  drawText(ctx, `E-Mail: ${doc.customer.email}`, ctx.margin)
  if (doc.customer.phone) {
    moveDown(ctx)
    drawText(ctx, `Telefon: ${doc.customer.phone}`, ctx.margin)
  }
  moveDown(ctx, 24)

  // 3. Line items table
  drawHeading(ctx, 'Positionen')

  // Table header
  const col1 = ctx.margin
  const col2 = ctx.margin + 80
  const col3 = rightEdge - 200
  const col4 = rightEdge - 110
  const col5 = rightEdge

  drawText(ctx, 'Art.-Nr.', col1, { size: 8, bold: true })
  drawText(ctx, 'Bezeichnung', col2, { size: 8, bold: true })
  drawTextRight(ctx, 'Menge', col3, { size: 8, bold: true })
  drawTextRight(ctx, 'Einzelpr. netto', col4, { size: 8, bold: true })
  drawTextRight(ctx, 'Gesamt netto', col5, { size: 8, bold: true })
  moveDown(ctx, 6)
  drawLine(ctx, ctx.margin, rightEdge)

  // Table rows
  for (const item of doc.pricing.lineItems) {
    checkPageBreak(ctx, 20)
    drawText(ctx, item.articleNo, col1, { size: 9 })
    drawText(ctx, item.name, col2, { size: 9 })
    drawTextRight(ctx, String(item.quantity), col3, { size: 9 })
    drawTextRight(ctx, formatCurrencyPdf(item.unitPriceNet), col4, { size: 9 })
    drawTextRight(ctx, formatCurrencyPdf(item.totalNet), col5, { size: 9 })
    moveDown(ctx)
  }

  moveDown(ctx, 8)
  drawLine(ctx, ctx.margin, rightEdge)

  // 4. Summary
  const summaryX = rightEdge - 180

  drawText(ctx, 'Netto', summaryX, { size: 10 })
  drawTextRight(ctx, formatCurrencyPdf(doc.pricing.totalNet), rightEdge, { size: 10 })
  moveDown(ctx)

  drawText(ctx, 'MwSt. 19%', summaryX, { size: 10 })
  drawTextRight(ctx, formatCurrencyPdf(doc.pricing.vatAmount), rightEdge, { size: 10 })
  moveDown(ctx, 8)
  drawLine(ctx, summaryX, rightEdge)

  drawText(ctx, 'Brutto', summaryX, { size: 12, bold: true })
  drawTextRight(ctx, formatCurrencyPdf(doc.pricing.totalGross), rightEdge, {
    size: 12,
    bold: true,
  })
  moveDown(ctx, 30)

  // 5. Notes
  if (doc.notes) {
    checkPageBreak(ctx, 40)
    drawHeading(ctx, 'Bemerkungen')
    const lines = doc.notes.split('\n')
    for (const line of lines) {
      checkPageBreak(ctx, 16)
      drawText(ctx, line, ctx.margin, { size: 9 })
      moveDown(ctx)
    }
  }

  return ctx.doc.save()
}

export async function generateBlankFormPdf(
  catalog: Catalog,
  category?: VariantCategory,
): Promise<Uint8Array> {
  const ctx = await createContext()
  const rightEdge = ctx.pageWidth - ctx.margin

  // 1. Header
  drawText(ctx, 'ANGEBOT / BESTELLUNG', ctx.margin, {
    size: 22,
    bold: true,
    color: { r: 0.91, g: 0.45, b: 0.1 },
  })
  moveDown(ctx, 18)
  drawText(ctx, 'Nr.: ___________________________', ctx.margin, { size: 10 })
  drawTextRight(ctx, 'Datum: _______________', rightEdge, { size: 10 })
  moveDown(ctx, 30)

  // 2. Customer block with blank lines
  drawHeading(ctx, 'Kundendaten')
  const customerFields = [
    'Firma',
    'Vorname / Nachname',
    'Straße / Nr.',
    'PLZ / Ort',
    'E-Mail',
    'Telefon',
    'Kd.-Nr.',
  ]
  for (const field of customerFields) {
    drawText(ctx, `${field}: `, ctx.margin, { size: 9 })
    drawText(ctx, '________________________________________', ctx.margin + 100, { size: 9 })
    moveDown(ctx)
  }
  moveDown(ctx, 16)

  // 3. Option groups
  const groups = category
    ? catalog.option_groups
        .filter((g) => g.applicable_categories.includes(category))
        .sort((a, b) => a.sort_order - b.sort_order)
    : catalog.option_groups.sort((a, b) => a.sort_order - b.sort_order)

  for (const group of groups) {
    checkPageBreak(ctx, 40)
    drawHeading(ctx, group.name)

    const items = getOptionItemsForGroup(catalog, group.id)
    for (const item of items) {
      checkPageBreak(ctx, 18)
      const sku = getSkuByCode(catalog, item.sku_code)
      if (!sku) continue

      // Checkbox
      drawText(ctx, '[  ]', ctx.margin, { size: 10 })
      drawText(ctx, sku.name, ctx.margin + 30, { size: 9 })
      drawText(ctx, `Art.-Nr.: ${sku.article_no}`, ctx.margin + 250, { size: 8 })
      drawTextRight(
        ctx,
        sku.price_net > 0 ? formatCurrencyPdf(sku.price_net) : 'Inkl.',
        rightEdge,
        { size: 9 },
      )
      moveDown(ctx)
    }
    moveDown(ctx, 8)
  }

  // 4. Empty summary block
  checkPageBreak(ctx, 80)
  moveDown(ctx, 16)
  drawLine(ctx, ctx.margin, rightEdge)

  const summaryX = rightEdge - 200
  drawText(ctx, 'Netto:', summaryX, { size: 10 })
  drawText(ctx, '____________________', summaryX + 80, { size: 10 })
  moveDown(ctx, 20)
  drawText(ctx, 'MwSt. 19%:', summaryX, { size: 10 })
  drawText(ctx, '____________________', summaryX + 80, { size: 10 })
  moveDown(ctx, 8)
  drawLine(ctx, summaryX, rightEdge)
  drawText(ctx, 'Brutto:', summaryX, { size: 12, bold: true })
  drawText(ctx, '____________________', summaryX + 80, { size: 12 })
  moveDown(ctx, 30)

  // 5. Notes
  checkPageBreak(ctx, 40)
  drawText(ctx, 'Bemerkungen:', ctx.margin, { size: 9 })
  moveDown(ctx, 4)
  for (let i = 0; i < 3; i++) {
    drawText(ctx, '________________________________________________________________________', ctx.margin, { size: 9 })
    moveDown(ctx)
  }

  return ctx.doc.save()
}

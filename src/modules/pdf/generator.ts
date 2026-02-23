import type { DocumentRecord } from '@/modules/storage/types'
import {
  createContext,
  drawText,
  drawTextRight,
  moveDown,
  drawLine,
  drawHeading,
  formatCurrencyPdf,
  newPage,
} from './helpers'
import {
  loadCorporateSettings,
  drawCorporateHeader,
  drawCorporateFooter,
  drawAccentStripe,
  type CorporateSettings,
} from './corporate'
import type { PDFContext } from './helpers'

const typeLabel: Record<string, string> = {
  QUOTE: 'ANGEBOT',
  ORDER: 'BESTELLUNG',
}

function formatDatePdf(date: string): string {
  const d = new Date(date)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function applyPageBranding(
  ctx: PDFContext,
  settings: CorporateSettings,
) {
  drawAccentStripe(ctx.page, settings.pdfColorAccent, ctx.pageHeight, settings.pdfAccentStripeWidth)
  drawCorporateFooter(ctx.page, { regular: ctx.font }, settings, ctx.pageWidth)
}

export async function generateDocumentPdf(doc: DocumentRecord): Promise<Uint8Array> {
  const ctx = await createContext()
  const settings = await loadCorporateSettings()
  const rightEdge = ctx.pageWidth - ctx.margin

  // Corporate header
  const docTitle = typeLabel[doc.document_type] ?? 'DOKUMENT'
  ctx.y = drawCorporateHeader(
    ctx.page,
    { regular: ctx.font, bold: ctx.fontBold },
    settings,
    docTitle,
    ctx.pageWidth,
  )

  // Page branding (accent stripe + footer)
  applyPageBranding(ctx, settings)

  // Override newPage to also brand subsequent pages
  const originalCheckPageBreak = (neededHeight: number) => {
    if (ctx.y - neededHeight < 60) {
      newPage(ctx)
      applyPageBranding(ctx, settings)
    }
  }

  // Document number and date
  drawText(ctx, `Nr. ${doc.document_no}`, ctx.margin, { size: 10 })
  drawTextRight(ctx, `Datum: ${formatDatePdf(doc.created_at)}`, rightEdge, { size: 10 })
  moveDown(ctx, 24)

  // Customer block
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

  // Line items table
  drawHeading(ctx, 'Positionen')

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

  for (const item of doc.pricing.lineItems) {
    originalCheckPageBreak(20)
    drawText(ctx, item.articleNo, col1, { size: 9 })
    drawText(ctx, item.name, col2, { size: 9 })
    drawTextRight(ctx, String(item.quantity), col3, { size: 9 })
    drawTextRight(ctx, formatCurrencyPdf(item.unitPriceNet), col4, { size: 9 })
    drawTextRight(ctx, formatCurrencyPdf(item.totalNet), col5, { size: 9 })
    moveDown(ctx)
  }

  moveDown(ctx, 8)
  drawLine(ctx, ctx.margin, rightEdge)

  // Summary
  const summaryX = rightEdge - 180

  drawText(ctx, 'Netto', summaryX, { size: 10 })
  drawTextRight(ctx, formatCurrencyPdf(doc.pricing.totalNet), rightEdge, { size: 10 })
  moveDown(ctx)

  drawText(ctx, `MwSt. ${Math.round(doc.pricing.vatRate * 100)}%`, summaryX, { size: 10 })
  drawTextRight(ctx, formatCurrencyPdf(doc.pricing.vatAmount), rightEdge, { size: 10 })
  moveDown(ctx, 8)
  drawLine(ctx, summaryX, rightEdge)

  drawText(ctx, 'Brutto', summaryX, { size: 12, bold: true })
  drawTextRight(ctx, formatCurrencyPdf(doc.pricing.totalGross), rightEdge, {
    size: 12,
    bold: true,
  })
  moveDown(ctx, 30)

  // Notes
  if (doc.notes) {
    originalCheckPageBreak(40)
    drawHeading(ctx, 'Bemerkungen')
    const lines = doc.notes.split('\n')
    for (const line of lines) {
      originalCheckPageBreak(16)
      drawText(ctx, line, ctx.margin, { size: 9 })
      moveDown(ctx)
    }
  }

  return ctx.doc.save()
}

import { rgb } from 'pdf-lib'
import type { CustomerData, PricingSummary } from '@/modules/storage/types'
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
  embedLogoImage,
  FOOTER_SAFE_Y,
  type CorporateSettings,
} from './corporate'
import type { PDFContext } from './helpers'
import type { PDFImage } from 'pdf-lib'

/** Shape of a Convex document as passed from the UI */
interface ConvexDocument {
  documentNo: string
  documentType: string
  customer: CustomerData
  pricing: PricingSummary
  notes?: string
  _creationTime: number
}

/** Optional image data for PDF embedding */
interface PdfImages {
  logoBytes?: Uint8Array
  signatureBytes?: Uint8Array
}

const typeLabel: Record<string, string> = {
  QUOTE: 'ANGEBOT',
  ORDER: 'BESTELLUNG',
}

function formatDatePdf(date: string | number): string {
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

export async function generateDocumentPdf(
  doc: ConvexDocument,
  images?: PdfImages,
): Promise<Uint8Array> {
  const ctx = await createContext()
  const settings = await loadCorporateSettings()
  const rightEdge = ctx.pageWidth - ctx.margin

  // Embed logo if provided
  let logoImage: PDFImage | undefined
  if (images?.logoBytes) {
    logoImage = await embedLogoImage(ctx.doc, images.logoBytes)
  }

  // Corporate header
  const docTitle = typeLabel[doc.documentType] ?? 'DOKUMENT'
  ctx.y = drawCorporateHeader(
    ctx.page,
    { regular: ctx.font, bold: ctx.fontBold },
    settings,
    docTitle,
    ctx.pageWidth,
    logoImage,
  )

  // Page branding (accent stripe + footer)
  applyPageBranding(ctx, settings)

  // Page-break helper that brands new pages
  const checkPageBreak = (neededHeight: number) => {
    if (ctx.y - neededHeight < FOOTER_SAFE_Y) {
      newPage(ctx)
      applyPageBranding(ctx, settings)
    }
  }

  // ── Sender line (small, gray) ──
  drawText(ctx, `${settings.companyName} \u2013 ${settings.companyStreet} \u2013 ${settings.companyZip} ${settings.companyCity}`, ctx.margin, {
    size: 6.5,
    color: { r: 0.5, g: 0.5, b: 0.5 },
  })
  moveDown(ctx, 18)

  // ── Address block (left) + Document info (right) ──
  const savedY = ctx.y

  // Customer address (left side)
  drawText(ctx, doc.customer.company, ctx.margin, { bold: true })
  moveDown(ctx)
  if (doc.customer.contactPerson) {
    drawText(ctx, doc.customer.contactPerson, ctx.margin)
    moveDown(ctx)
  } else {
    drawText(ctx, `${doc.customer.firstName} ${doc.customer.lastName}`, ctx.margin)
    moveDown(ctx)
  }
  drawText(ctx, doc.customer.street, ctx.margin)
  moveDown(ctx)
  drawText(ctx, `${doc.customer.zip} ${doc.customer.city}`, ctx.margin)
  const addressEndY = ctx.y

  // Document info (right side)
  ctx.y = savedY
  const infoLabelX = rightEdge - 160
  const infoValueX = rightEdge

  drawText(ctx, 'Dokumentnr.:', infoLabelX, { size: 8 })
  drawTextRight(ctx, doc.documentNo ?? '\u2014', infoValueX, { size: 8, bold: true })
  moveDown(ctx, 14)
  drawText(ctx, 'Datum:', infoLabelX, { size: 8 })
  drawTextRight(ctx, formatDatePdf(doc._creationTime), infoValueX, { size: 8 })
  moveDown(ctx, 14)
  if (doc.customer.customerNumber) {
    drawText(ctx, 'Kunden-Nr.:', infoLabelX, { size: 8 })
    drawTextRight(ctx, doc.customer.customerNumber, infoValueX, { size: 8 })
    moveDown(ctx, 14)
  }
  drawText(ctx, 'E-Mail:', infoLabelX, { size: 8 })
  drawTextRight(ctx, doc.customer.email, infoValueX, { size: 8 })
  if (doc.customer.phone) {
    moveDown(ctx, 14)
    drawText(ctx, 'Telefon:', infoLabelX, { size: 8 })
    drawTextRight(ctx, doc.customer.phone, infoValueX, { size: 8 })
  }

  // Resume below whichever column is lower
  ctx.y = Math.min(addressEndY, ctx.y) - 24

  // ── Line items table ──
  drawHeading(ctx, 'Positionen')

  const colPos = ctx.margin
  const colArt = ctx.margin + 30
  const colName = ctx.margin + 100
  const colQty = rightEdge - 200
  const colUnit = rightEdge - 110
  const colTotal = rightEdge

  // Table header
  drawText(ctx, 'Pos.', colPos, { size: 8, bold: true })
  drawText(ctx, 'Art.-Nr.', colArt, { size: 8, bold: true })
  drawText(ctx, 'Bezeichnung', colName, { size: 8, bold: true })
  drawTextRight(ctx, 'Menge', colQty, { size: 8, bold: true })
  drawTextRight(ctx, 'Einzelpr. netto', colUnit, { size: 8, bold: true })
  drawTextRight(ctx, 'Gesamt netto', colTotal, { size: 8, bold: true })
  moveDown(ctx, 6)
  drawLine(ctx, ctx.margin, rightEdge)

  let posNr = 1
  for (const item of doc.pricing.lineItems) {
    checkPageBreak(20)

    // Alternating row background
    if (posNr % 2 === 0) {
      ctx.page.drawRectangle({
        x: ctx.margin,
        y: ctx.y - 4,
        width: rightEdge - ctx.margin,
        height: 16,
        color: rgb(0.96, 0.96, 0.96),
      })
    }

    drawText(ctx, String(posNr), colPos, { size: 9 })
    drawText(ctx, item.articleNo, colArt, { size: 9 })
    drawText(ctx, item.name, colName, { size: 9 })
    drawTextRight(ctx, String(item.quantity), colQty, { size: 9 })
    drawTextRight(ctx, formatCurrencyPdf(item.unitPriceNet), colUnit, { size: 9 })
    drawTextRight(ctx, formatCurrencyPdf(item.totalNet), colTotal, { size: 9 })
    moveDown(ctx)

    // Row separator line
    ctx.page.drawLine({
      start: { x: ctx.margin, y: ctx.y + 2 },
      end: { x: rightEdge, y: ctx.y + 2 },
      thickness: 0.25,
      color: rgb(0.85, 0.85, 0.85),
    })

    posNr++
  }

  moveDown(ctx, 8)
  drawLine(ctx, ctx.margin, rightEdge)

  // ── Summary ──
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

  // ── Notes ──
  if (doc.notes) {
    checkPageBreak(40)
    drawHeading(ctx, 'Bemerkungen')
    const lines = doc.notes.split('\n')
    for (const line of lines) {
      checkPageBreak(16)
      drawText(ctx, line, ctx.margin, { size: 9 })
      moveDown(ctx)
    }
    moveDown(ctx, 16)
  }

  // ── Signature area (orders only) ──
  if (doc.documentType === 'ORDER') {
    checkPageBreak(80)
    moveDown(ctx, 20)

    const lineWidth = 180
    const leftLineX = ctx.margin
    const rightLineX = rightEdge - lineWidth

    // Embed signature image if provided
    if (images?.signatureBytes) {
      try {
        let sigImage
        try {
          sigImage = await ctx.doc.embedPng(images.signatureBytes)
        } catch {
          sigImage = await ctx.doc.embedJpg(images.signatureBytes)
        }
        const sigMaxW = lineWidth
        const sigMaxH = 50
        const aspect = sigImage.width / sigImage.height
        let sigW = sigMaxW
        let sigH = sigW / aspect
        if (sigH > sigMaxH) {
          sigH = sigMaxH
          sigW = sigH * aspect
        }
        ctx.page.drawImage(sigImage, {
          x: rightLineX + (lineWidth - sigW) / 2,
          y: ctx.y,
          width: sigW,
          height: sigH,
        })
        moveDown(ctx, sigH + 4)
      } catch {
        // Signature image could not be embedded — skip
      }
    }

    // Signature lines
    ctx.page.drawLine({
      start: { x: leftLineX, y: ctx.y },
      end: { x: leftLineX + lineWidth, y: ctx.y },
      thickness: 0.5,
      color: rgb(0.4, 0.4, 0.4),
    })
    ctx.page.drawLine({
      start: { x: rightLineX, y: ctx.y },
      end: { x: rightLineX + lineWidth, y: ctx.y },
      thickness: 0.5,
      color: rgb(0.4, 0.4, 0.4),
    })

    moveDown(ctx, 12)
    drawText(ctx, 'Datum, Ort', leftLineX, { size: 7, color: { r: 0.5, g: 0.5, b: 0.5 } })
    drawText(ctx, 'Unterschrift Kunde', rightLineX, { size: 7, color: { r: 0.5, g: 0.5, b: 0.5 } })
  }

  return ctx.doc.save()
}

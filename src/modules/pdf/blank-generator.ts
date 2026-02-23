import { rgb } from 'pdf-lib'
import { db } from '@/modules/storage/db'
import {
  createContext,
  drawText,
  drawTextRight,
  moveDown,
  drawLine,
  formatCurrencyPdf,
  newPage,
} from './helpers'
import {
  loadCorporateSettings,
  drawCorporateHeader,
  drawCorporateFooter,
  drawAccentStripe,
  hexToRgb,
  type CorporateSettings,
} from './corporate'
import type { PDFContext } from './helpers'

function applyPageBranding(ctx: PDFContext, settings: CorporateSettings) {
  drawAccentStripe(ctx.page, settings.pdfColorAccent, ctx.pageHeight)
  drawCorporateFooter(ctx.page, { regular: ctx.font }, settings, ctx.pageWidth)
}

function ensureSpace(ctx: PDFContext, settings: CorporateSettings, neededHeight: number) {
  if (ctx.y - neededHeight < 60) {
    newPage(ctx)
    applyPageBranding(ctx, settings)
  }
}

function drawCheckbox(ctx: PDFContext, x: number) {
  ctx.page.drawRectangle({
    x,
    y: ctx.y - 2,
    width: 8,
    height: 8,
    borderColor: rgb(0.4, 0.4, 0.4),
    borderWidth: 0.8,
  })
}

function drawBlankLine(ctx: PDFContext, x: number, width: number) {
  ctx.page.drawLine({
    start: { x, y: ctx.y - 2 },
    end: { x: x + width, y: ctx.y - 2 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })
}

function drawSectionHeader(
  ctx: PDFContext,
  settings: CorporateSettings,
  text: string,
  rightEdge: number,
) {
  ensureSpace(ctx, settings, 30)
  const primary = hexToRgb(settings.pdfColorPrimary)

  // Section header bar
  ctx.page.drawRectangle({
    x: ctx.margin,
    y: ctx.y - 4,
    width: rightEdge - ctx.margin,
    height: 18,
    color: rgb(primary.r, primary.g, primary.b),
  })

  ctx.page.drawText(text, {
    x: ctx.margin + 6,
    y: ctx.y,
    size: 9,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  })

  moveDown(ctx, 24)
}

export async function generateBlankFormPdf(categoryId: string): Promise<Uint8Array> {
  const ctx = await createContext()
  const settings = await loadCorporateSettings()
  const rightEdge = ctx.pageWidth - ctx.margin

  // Corporate header
  ctx.y = drawCorporateHeader(
    ctx.page,
    { regular: ctx.font, bold: ctx.fontBold },
    settings,
    'BESTELLFORMULAR',
    ctx.pageWidth,
  )
  applyPageBranding(ctx, settings)

  // Customer fields
  moveDown(ctx, 4)
  const customerFields = [
    'Kunden-Nr.',
    'Ansprechpartner',
    'Firma',
    'Straße / Nr.',
    'PLZ / Ort',
    'E-Mail',
    'Telefon',
  ]
  for (const field of customerFields) {
    drawText(ctx, `${field}:`, ctx.margin, { size: 8 })
    drawBlankLine(ctx, ctx.margin + 80, rightEdge - ctx.margin - 80)
    moveDown(ctx, 14)
  }
  moveDown(ctx, 8)

  // Table header
  const colCheck = ctx.margin
  const colArtNr = ctx.margin + 16
  const colName = ctx.margin + 90
  const colNet = rightEdge - 100
  const colGross = rightEdge

  drawText(ctx, '', colCheck, { size: 7, bold: true })
  drawText(ctx, 'Art.-Nr.', colArtNr, { size: 7, bold: true })
  drawText(ctx, 'Beschreibung', colName, { size: 7, bold: true })
  drawTextRight(ctx, 'Netto', colNet, { size: 7, bold: true })
  drawTextRight(ctx, 'Brutto', colGross, { size: 7, bold: true })
  moveDown(ctx, 4)
  drawLine(ctx, ctx.margin, rightEdge)

  // Load base models for category
  const baseModels = await db.baseModels
    .where('categoryId')
    .equals(categoryId)
    .sortBy('sortOrder')
  const activeModels = baseModels.filter((m) => m.isActive)

  if (activeModels.length > 0) {
    drawSectionHeader(ctx, settings, 'BASISMODELLE', rightEdge)

    let rowIdx = 0
    for (const model of activeModels) {
      ensureSpace(ctx, settings, 16)

      // Alternating row background
      if (rowIdx % 2 === 1) {
        ctx.page.drawRectangle({
          x: ctx.margin,
          y: ctx.y - 4,
          width: rightEdge - ctx.margin,
          height: 14,
          color: rgb(0.96, 0.96, 0.96),
        })
      }

      drawCheckbox(ctx, colCheck)
      drawText(ctx, model.articleNo, colArtNr, { size: 8 })
      drawText(ctx, model.name, colName, { size: 8 })
      drawTextRight(ctx, formatCurrencyPdf(model.priceNet), colNet, { size: 8 })
      drawTextRight(ctx, formatCurrencyPdf(model.priceGross), colGross, { size: 8 })
      moveDown(ctx, 16)
      rowIdx++
    }
    moveDown(ctx, 4)
  }

  // Load option groups for category
  const allGroups = await db.optionGroups.orderBy('sortOrder').toArray()
  const applicableGroups = allGroups.filter(
    (g) => g.isActive && (g.appliesTo.length === 0 || g.appliesTo.includes(categoryId)),
  )

  for (const group of applicableGroups) {
    const options = await db.options
      .where('optionGroupId')
      .equals(group.id)
      .sortBy('sortOrder')
    const activeOptions = options.filter((o) => o.isActive)

    if (activeOptions.length === 0) continue

    drawSectionHeader(ctx, settings, group.name.toUpperCase(), rightEdge)

    let rowIdx = 0
    for (const option of activeOptions) {
      ensureSpace(ctx, settings, 16)

      // Alternating row background
      if (rowIdx % 2 === 1) {
        ctx.page.drawRectangle({
          x: ctx.margin,
          y: ctx.y - 4,
          width: rightEdge - ctx.margin,
          height: 14,
          color: rgb(0.96, 0.96, 0.96),
        })
      }

      drawCheckbox(ctx, colCheck)
      drawText(ctx, option.articleNo, colArtNr, { size: 8 })

      // Name with default diamond marker
      const displayName = option.isDefault ? `${option.name} *` : option.name
      drawText(ctx, displayName, colName, { size: 8 })

      if (group.selectionType === 'MULTI') {
        // For MULTI groups: show "Menge: ___" instead of individual price
        drawText(ctx, 'Menge:', colNet - 40, { size: 7 })
        drawBlankLine(ctx, colNet - 10, 30)
        drawTextRight(ctx, formatCurrencyPdf(option.priceNet), colGross, { size: 8 })
      } else {
        drawTextRight(ctx, formatCurrencyPdf(option.priceNet), colNet, { size: 8 })
        drawTextRight(ctx, formatCurrencyPdf(option.priceGross), colGross, { size: 8 })
      }

      moveDown(ctx, 16)
      rowIdx++
    }
    moveDown(ctx, 4)
  }

  // Summary section
  ensureSpace(ctx, settings, 100)
  moveDown(ctx, 8)
  drawLine(ctx, ctx.margin, rightEdge)
  moveDown(ctx, 4)

  const summaryX = rightEdge - 200
  drawText(ctx, 'Netto:', summaryX, { size: 10 })
  drawBlankLine(ctx, summaryX + 80, 120)
  moveDown(ctx, 18)
  drawText(ctx, 'MwSt. 19%:', summaryX, { size: 10 })
  drawBlankLine(ctx, summaryX + 80, 120)
  moveDown(ctx, 8)
  drawLine(ctx, summaryX, rightEdge)
  drawText(ctx, 'Brutto:', summaryX, { size: 12, bold: true })
  drawBlankLine(ctx, summaryX + 80, 120)
  moveDown(ctx, 30)

  // Notes section
  ensureSpace(ctx, settings, 60)
  drawText(ctx, 'Bemerkungen:', ctx.margin, { size: 9, bold: true })
  moveDown(ctx, 4)
  for (let i = 0; i < 3; i++) {
    drawBlankLine(ctx, ctx.margin, rightEdge - ctx.margin)
    moveDown(ctx, 16)
  }
  moveDown(ctx, 16)

  // Date + Signature
  ensureSpace(ctx, settings, 40)
  drawText(ctx, 'Datum:', ctx.margin, { size: 9 })
  drawBlankLine(ctx, ctx.margin + 40, 120)
  drawText(ctx, 'Unterschrift:', rightEdge - 200, { size: 9 })
  drawBlankLine(ctx, rightEdge - 130, 130)

  return ctx.doc.save()
}

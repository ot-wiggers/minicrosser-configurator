import { rgb } from 'pdf-lib'
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
  embedLogoImage,
  hexToRgb,
  FOOTER_SAFE_Y,
  type CorporateSettings,
} from './corporate'
import type { PDFContext } from './helpers'
import type { PDFImage } from 'pdf-lib'

/** Data shape for base models used in blank PDF generation */
export interface BlankPdfBaseModel {
  articleNo: string
  name: string
  priceNet: number
  priceGross: number
  isActive: boolean
  sortOrder: number
}

/** Data shape for option groups used in blank PDF generation */
export interface BlankPdfOptionGroup {
  _id: string
  name: string
  selectionType: string
  isActive: boolean
  sortOrder: number
  appliesTo: string[]
}

/** Data shape for options used in blank PDF generation */
export interface BlankPdfOption {
  optionGroupId: string
  articleNo: string
  name: string
  priceNet: number
  priceGross: number
  isDefault: boolean
  isActive: boolean
  sortOrder: number
}

/** All catalog data needed to generate a blank form PDF */
export interface BlankPdfCatalogData {
  baseModels: BlankPdfBaseModel[]
  optionGroups: BlankPdfOptionGroup[]
  options: BlankPdfOption[]
}

function applyPageBranding(ctx: PDFContext, settings: CorporateSettings) {
  drawAccentStripe(ctx.page, settings.pdfColorAccent, ctx.pageHeight, settings.pdfAccentStripeWidth)
  drawCorporateFooter(ctx.page, { regular: ctx.font }, settings, ctx.pageWidth)
}

function ensureSpace(ctx: PDFContext, settings: CorporateSettings, neededHeight: number) {
  if (ctx.y - neededHeight < FOOTER_SAFE_Y) {
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

  // Section header bar (draws downward from ctx.y, not upward)
  ctx.page.drawRectangle({
    x: ctx.margin,
    y: ctx.y - 14,
    width: rightEdge - ctx.margin,
    height: 16,
    color: rgb(primary.r, primary.g, primary.b),
  })

  ctx.page.drawText(text, {
    x: ctx.margin + 6,
    y: ctx.y - 10,
    size: 9,
    font: ctx.fontBold,
    color: rgb(1, 1, 1),
  })

  moveDown(ctx, 22)
}

/**
 * Generates a blank order form PDF for a given category.
 * Catalog data (base models, option groups, options) must be passed in
 * from Convex queries — no Dexie dependency.
 */
export async function generateBlankFormPdf(
  categoryId: string,
  catalogData: BlankPdfCatalogData,
  logoBytes?: Uint8Array,
  settingsMap?: Record<string, string | number | boolean>,
  categoryImageBytes?: Uint8Array,
): Promise<Uint8Array> {
  const ctx = await createContext()
  const settings = await loadCorporateSettings(settingsMap)
  const rightEdge = ctx.pageWidth - ctx.margin

  // Embed logo if provided
  let logoImage: PDFImage | undefined
  if (logoBytes) {
    logoImage = await embedLogoImage(ctx.doc, logoBytes)
  }

  // Embed category image if provided
  let categoryImage: PDFImage | undefined
  if (categoryImageBytes) {
    categoryImage = await embedLogoImage(ctx.doc, categoryImageBytes)
  }

  // Corporate header
  ctx.y = drawCorporateHeader(
    ctx.page,
    { regular: ctx.font, bold: ctx.fontBold },
    settings,
    'BESTELLFORMULAR',
    ctx.pageWidth,
    logoImage,
  )
  applyPageBranding(ctx, settings)

  // Customer fields (left half) + Category image (right half)
  moveDown(ctx, 4)
  const midX = ctx.margin + (rightEdge - ctx.margin) * 0.5
  const fieldLabelW = 70
  const fieldLineEnd = midX - 10
  const savedCustomerY = ctx.y

  const customerFields = [
    'Kunden-Nr.',
    'Ansprechpartner',
    'Firma',
    'Strasse / Nr.',
    'PLZ / Ort',
    'E-Mail',
    'Telefon',
  ]
  for (const field of customerFields) {
    drawText(ctx, `${field}:`, ctx.margin, { size: 8 })
    drawBlankLine(ctx, ctx.margin + fieldLabelW, fieldLineEnd - ctx.margin - fieldLabelW)
    moveDown(ctx, 14)
  }
  const customerEndY = ctx.y

  // Draw category image on the right side
  if (categoryImage) {
    const imgAreaX = midX + 10
    const imgAreaW = rightEdge - imgAreaX
    const imgAreaH = savedCustomerY - customerEndY - 8
    const aspect = categoryImage.width / categoryImage.height
    let imgW = imgAreaW
    let imgH = imgW / aspect
    if (imgH > imgAreaH) {
      imgH = imgAreaH
      imgW = imgH * aspect
    }
    const imgX = imgAreaX + (imgAreaW - imgW) / 2
    const imgY = customerEndY + (savedCustomerY - customerEndY - imgH) / 2
    ctx.page.drawImage(categoryImage, {
      x: imgX,
      y: imgY,
      width: imgW,
      height: imgH,
    })
  }

  ctx.y = customerEndY
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
  moveDown(ctx, 4)

  // Filter base models for this category
  const activeModels = catalogData.baseModels
    .filter((m) => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)

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

  // Filter option groups that apply to this category
  const applicableGroups = catalogData.optionGroups
    .filter((g) => g.isActive && (g.appliesTo.length === 0 || g.appliesTo.includes(categoryId)))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  for (const group of applicableGroups) {
    const groupOptions = catalogData.options
      .filter((o) => o.optionGroupId === group._id && o.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    if (groupOptions.length === 0) continue

    drawSectionHeader(ctx, settings, group.name.toUpperCase(), rightEdge)

    let rowIdx = 0
    for (const option of groupOptions) {
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
  moveDown(ctx, 16)

  const summaryX = rightEdge - 200
  const blankLineX = summaryX + 80
  const blankLineW = rightEdge - blankLineX

  drawText(ctx, 'Netto:', summaryX, { size: 9 })
  drawBlankLine(ctx, blankLineX, blankLineW)
  moveDown(ctx, 18)
  drawText(ctx, 'MwSt. 19%:', summaryX, { size: 9 })
  drawBlankLine(ctx, blankLineX, blankLineW)
  moveDown(ctx, 18)
  drawText(ctx, 'Brutto:', summaryX, { size: 10, bold: true })
  drawBlankLine(ctx, blankLineX, blankLineW)
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

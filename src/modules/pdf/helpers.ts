import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'

export interface PDFContext {
  doc: PDFDocument
  page: PDFPage
  font: PDFFont
  fontBold: PDFFont
  y: number
  margin: number
  pageWidth: number
  pageHeight: number
}

const LINE_HEIGHT = 16
const HEADING_HEIGHT = 22

export async function createContext(): Promise<PDFContext> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  return {
    doc,
    page,
    font,
    fontBold,
    y: 800,
    margin: 50,
    pageWidth: 595.28,
    pageHeight: 841.89,
  }
}

export function drawText(
  ctx: PDFContext,
  text: string,
  x: number,
  options?: {
    size?: number
    bold?: boolean
    color?: { r: number; g: number; b: number }
    maxWidth?: number
  },
) {
  const size = options?.size ?? 10
  const font = options?.bold ? ctx.fontBold : ctx.font
  const color = options?.color
    ? rgb(options.color.r, options.color.g, options.color.b)
    : rgb(0.18, 0.22, 0.28)

  ctx.page.drawText(text, { x, y: ctx.y, size, font, color })
}

export function drawTextRight(
  ctx: PDFContext,
  text: string,
  rightX: number,
  options?: { size?: number; bold?: boolean },
) {
  const size = options?.size ?? 10
  const font = options?.bold ? ctx.fontBold : ctx.font
  const textWidth = font.widthOfTextAtSize(text, size)
  drawText(ctx, text, rightX - textWidth, options)
}

export function moveDown(ctx: PDFContext, amount?: number) {
  ctx.y -= amount ?? LINE_HEIGHT
}

export function drawLine(ctx: PDFContext, x1: number, x2: number) {
  ctx.page.drawLine({
    start: { x: x1, y: ctx.y },
    end: { x: x2, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })
  ctx.y -= 8
}

export function newPage(ctx: PDFContext) {
  const page = ctx.doc.addPage([ctx.pageWidth, ctx.pageHeight])
  ctx.page = page
  ctx.y = 800
}

export function checkPageBreak(ctx: PDFContext, neededHeight: number) {
  if (ctx.y - neededHeight < 60) {
    newPage(ctx)
  }
}

export function drawHeading(ctx: PDFContext, text: string) {
  checkPageBreak(ctx, HEADING_HEIGHT + 10)
  drawText(ctx, text, ctx.margin, { size: 12, bold: true })
  moveDown(ctx, HEADING_HEIGHT)
}

export function formatCurrencyPdf(amount: number): string {
  return (
    amount.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' EUR'
  )
}

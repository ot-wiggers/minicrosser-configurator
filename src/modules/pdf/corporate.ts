import { rgb, type PDFPage, type PDFFont } from 'pdf-lib'
import { settingsRepo } from '@/modules/storage'

export interface CorporateSettings {
  companyName: string
  companyStreet: string
  companyZip: string
  companyCity: string
  companyPhone: string
  companyFax: string
  companyEmail: string
  companyWeb: string
  bankName1: string
  bankIban1: string
  bankBic1: string
  pdfColorPrimary: string
  pdfColorAccent: string
}

export async function loadCorporateSettings(): Promise<CorporateSettings> {
  const getValue = async (key: string, def: string) =>
    (await settingsRepo.getValue<string>(key, def))

  return {
    companyName: await getValue('companyName', 'Wiggers GmbH & Co. KG'),
    companyStreet: await getValue('companyStreet', 'Gerhard-Stalling-Straße 42'),
    companyZip: await getValue('companyZip', '26135'),
    companyCity: await getValue('companyCity', 'Oldenburg'),
    companyPhone: await getValue('companyPhone', '04 41 / 3 61 11 3 09'),
    companyFax: await getValue('companyFax', '04 41 / 3 61 11 3 09'),
    companyEmail: await getValue('companyEmail', 'info@minicrosser.info'),
    companyWeb: await getValue('companyWeb', 'www.minicrosser.info'),
    bankName1: await getValue('bankName1', 'Oldenburgische Landesbank'),
    bankIban1: await getValue('bankIban1', ''),
    bankBic1: await getValue('bankBic1', ''),
    pdfColorPrimary: await getValue('pdfColorPrimary', '#3A4250'),
    pdfColorAccent: await getValue('pdfColorAccent', '#D4A843'),
  }
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0.23, g: 0.26, b: 0.31 } // default anthracite
}

/**
 * Draws the corporate header bar with document title.
 * Returns the new Y position after the header.
 */
export function drawCorporateHeader(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  settings: CorporateSettings,
  docTitle: string,
  pageWidth: number,
): number {
  const headerHeight = 70
  const headerY = page.getHeight() - headerHeight
  const primary = hexToRgb(settings.pdfColorPrimary)
  const accent = hexToRgb(settings.pdfColorAccent)

  // Anthracite header bar (full width)
  page.drawRectangle({
    x: 0,
    y: headerY,
    width: pageWidth,
    height: headerHeight,
    color: rgb(primary.r, primary.g, primary.b),
  })

  // Gold accent stripe on left (8pt wide)
  page.drawRectangle({
    x: 0,
    y: headerY,
    width: 8,
    height: headerHeight,
    color: rgb(accent.r, accent.g, accent.b),
  })

  // Company name (white, top-left)
  page.drawText(settings.companyName, {
    x: 20,
    y: headerY + headerHeight - 25,
    size: 11,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  })

  // Company address line (white, smaller)
  const addressLine = `${settings.companyStreet} | ${settings.companyZip} ${settings.companyCity}`
  page.drawText(addressLine, {
    x: 20,
    y: headerY + headerHeight - 40,
    size: 7,
    font: fonts.regular,
    color: rgb(0.85, 0.85, 0.85),
  })

  // Document title (white, right-aligned, large)
  const titleWidth = fonts.bold.widthOfTextAtSize(docTitle, 18)
  page.drawText(docTitle, {
    x: pageWidth - titleWidth - 20,
    y: headerY + headerHeight - 30,
    size: 18,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  })

  return headerY - 20 // Y position below header with spacing
}

/**
 * Draws the corporate footer with company + bank details.
 */
export function drawCorporateFooter(
  page: PDFPage,
  fonts: { regular: PDFFont },
  settings: CorporateSettings,
  pageWidth: number,
): void {
  const footerY = 35
  const fontSize = 6.5
  const color = rgb(0.5, 0.5, 0.5)

  // Thin line above footer
  page.drawLine({
    start: { x: 50, y: footerY + 12 },
    end: { x: pageWidth - 50, y: footerY + 12 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })

  // Left column: company info
  page.drawText(
    `${settings.companyName} | ${settings.companyStreet} | ${settings.companyZip} ${settings.companyCity}`,
    { x: 50, y: footerY, size: fontSize, font: fonts.regular, color },
  )

  // Middle: contact
  const contactText = `Tel: ${settings.companyPhone} | ${settings.companyEmail}`
  const contactWidth = fonts.regular.widthOfTextAtSize(contactText, fontSize)
  page.drawText(contactText, {
    x: (pageWidth - contactWidth) / 2,
    y: footerY - 10,
    size: fontSize,
    font: fonts.regular,
    color,
  })

  // Right: bank info (if available)
  if (settings.bankName1 && settings.bankIban1) {
    const bankText = `${settings.bankName1} | IBAN: ${settings.bankIban1}`
    const bankWidth = fonts.regular.widthOfTextAtSize(bankText, fontSize)
    page.drawText(bankText, {
      x: pageWidth - bankWidth - 50,
      y: footerY,
      size: fontSize,
      font: fonts.regular,
      color,
    })
  }
}

/**
 * Draws a vertical accent stripe on the left edge of the page.
 */
export function drawAccentStripe(
  page: PDFPage,
  accentColor: string,
  pageHeight: number,
): void {
  const accent = hexToRgb(accentColor)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: 6,
    height: pageHeight,
    color: rgb(accent.r, accent.g, accent.b),
  })
}

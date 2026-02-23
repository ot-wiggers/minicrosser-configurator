import { rgb, type PDFPage, type PDFFont } from 'pdf-lib'

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
  // Extended PDF settings
  pdfFontSizeBody: number
  pdfFontSizeHeading: number
  pdfFontSizeFooter: number
  pdfHeaderHeight: number
  pdfAccentStripeWidth: number
  pdfMarginTop: number
  pdfMarginBottom: number
  pdfMarginLeft: number
  pdfMarginRight: number
  pdfHeaderLine1: string
  pdfHeaderLine2: string
  pdfHeaderLine3: string
  pdfSlogan: string
}

const DEFAULTS: CorporateSettings = {
  companyName: 'Wiggers GmbH & Co. KG',
  companyStreet: 'Gerhard-Stalling-Strasse 42',
  companyZip: '26135',
  companyCity: 'Oldenburg',
  companyPhone: '04 41 / 3 61 11 3 09',
  companyFax: '04 41 / 3 61 11 3 09',
  companyEmail: 'info@minicrosser.info',
  companyWeb: 'www.minicrosser.info',
  bankName1: 'Oldenburgische Landesbank',
  bankIban1: '',
  bankBic1: '',
  pdfColorPrimary: '#1E3A5F',
  pdfColorAccent: '#D4A843',
  pdfFontSizeBody: 9,
  pdfFontSizeHeading: 11,
  pdfFontSizeFooter: 6.5,
  pdfHeaderHeight: 70,
  pdfAccentStripeWidth: 8,
  pdfMarginTop: 50,
  pdfMarginBottom: 60,
  pdfMarginLeft: 50,
  pdfMarginRight: 50,
  pdfHeaderLine1: '',
  pdfHeaderLine2: '',
  pdfHeaderLine3: '',
  pdfSlogan: '',
}

/**
 * Builds CorporateSettings from a key-value settings map (from Convex).
 * Falls back to hardcoded defaults for missing keys.
 */
export function buildCorporateSettings(
  settingsMap: Record<string, string | number | boolean>,
): CorporateSettings {
  function str(key: string, def: string): string {
    const val = settingsMap[key]
    return val !== undefined ? String(val) : def
  }
  function num(key: string, def: number): number {
    const val = settingsMap[key]
    if (val === undefined) return def
    const n = typeof val === 'number' ? val : parseFloat(String(val))
    return isNaN(n) ? def : n
  }

  return {
    companyName: str('companyName', DEFAULTS.companyName),
    companyStreet: str('companyStreet', DEFAULTS.companyStreet),
    companyZip: str('companyZip', DEFAULTS.companyZip),
    companyCity: str('companyCity', DEFAULTS.companyCity),
    companyPhone: str('companyPhone', DEFAULTS.companyPhone),
    companyFax: str('companyFax', DEFAULTS.companyFax),
    companyEmail: str('companyEmail', DEFAULTS.companyEmail),
    companyWeb: str('companyWeb', DEFAULTS.companyWeb),
    bankName1: str('bankName1', DEFAULTS.bankName1),
    bankIban1: str('bankIban1', DEFAULTS.bankIban1),
    bankBic1: str('bankBic1', DEFAULTS.bankBic1),
    pdfColorPrimary: str('pdfColorPrimary', DEFAULTS.pdfColorPrimary),
    pdfColorAccent: str('pdfColorAccent', DEFAULTS.pdfColorAccent),
    pdfFontSizeBody: num('pdfFontSizeBody', DEFAULTS.pdfFontSizeBody),
    pdfFontSizeHeading: num('pdfFontSizeHeading', DEFAULTS.pdfFontSizeHeading),
    pdfFontSizeFooter: num('pdfFontSizeFooter', DEFAULTS.pdfFontSizeFooter),
    pdfHeaderHeight: num('pdfHeaderHeight', DEFAULTS.pdfHeaderHeight),
    pdfAccentStripeWidth: num('pdfAccentStripeWidth', DEFAULTS.pdfAccentStripeWidth),
    pdfMarginTop: num('pdfMarginTop', DEFAULTS.pdfMarginTop),
    pdfMarginBottom: num('pdfMarginBottom', DEFAULTS.pdfMarginBottom),
    pdfMarginLeft: num('pdfMarginLeft', DEFAULTS.pdfMarginLeft),
    pdfMarginRight: num('pdfMarginRight', DEFAULTS.pdfMarginRight),
    pdfHeaderLine1: str('pdfHeaderLine1', DEFAULTS.pdfHeaderLine1),
    pdfHeaderLine2: str('pdfHeaderLine2', DEFAULTS.pdfHeaderLine2),
    pdfHeaderLine3: str('pdfHeaderLine3', DEFAULTS.pdfHeaderLine3),
    pdfSlogan: str('pdfSlogan', DEFAULTS.pdfSlogan),
  }
}

/**
 * Loads corporate settings. Uses a provided settings map if available,
 * otherwise falls back to hardcoded defaults.
 */
export async function loadCorporateSettings(
  preloadedSettings?: Record<string, string | number | boolean>,
): Promise<CorporateSettings> {
  if (preloadedSettings) {
    return buildCorporateSettings(preloadedSettings)
  }
  // Fallback: use defaults (Dexie no longer used)
  return { ...DEFAULTS }
}

/** Returns default settings for previews or offline fallback. */
export function getDefaultSettings(): CorporateSettings {
  return { ...DEFAULTS }
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
  const headerHeight = settings.pdfHeaderHeight
  const stripeWidth = settings.pdfAccentStripeWidth
  const headerY = page.getHeight() - headerHeight
  const primary = hexToRgb(settings.pdfColorPrimary)
  const accent = hexToRgb(settings.pdfColorAccent)

  // Primary header bar (full width)
  page.drawRectangle({
    x: 0,
    y: headerY,
    width: pageWidth,
    height: headerHeight,
    color: rgb(primary.r, primary.g, primary.b),
  })

  // Accent stripe on left
  page.drawRectangle({
    x: 0,
    y: headerY,
    width: stripeWidth,
    height: headerHeight,
    color: rgb(accent.r, accent.g, accent.b),
  })

  // Company name (white, top-left)
  page.drawText(settings.companyName, {
    x: stripeWidth + 12,
    y: headerY + headerHeight - 25,
    size: settings.pdfFontSizeHeading,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  })

  // Address line or custom header lines
  const headerLine = settings.pdfHeaderLine1 ||
    `${settings.companyStreet} | ${settings.companyZip} ${settings.companyCity}`
  page.drawText(headerLine, {
    x: stripeWidth + 12,
    y: headerY + headerHeight - 40,
    size: 7,
    font: fonts.regular,
    color: rgb(0.85, 0.85, 0.85),
  })

  // Optional slogan or second header line
  if (settings.pdfSlogan || settings.pdfHeaderLine2) {
    page.drawText(settings.pdfSlogan || settings.pdfHeaderLine2, {
      x: stripeWidth + 12,
      y: headerY + headerHeight - 52,
      size: 6.5,
      font: fonts.regular,
      color: rgb(0.75, 0.75, 0.75),
    })
  }

  // Document title (white, right-aligned, large)
  const titleSize = 18
  const titleWidth = fonts.bold.widthOfTextAtSize(docTitle, titleSize)
  page.drawText(docTitle, {
    x: pageWidth - titleWidth - 20,
    y: headerY + headerHeight - 30,
    size: titleSize,
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
  const fontSize = settings.pdfFontSizeFooter
  const color = rgb(0.5, 0.5, 0.5)

  // Thin line above footer
  page.drawLine({
    start: { x: settings.pdfMarginLeft, y: footerY + 12 },
    end: { x: pageWidth - settings.pdfMarginRight, y: footerY + 12 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })

  // Left column: company info
  page.drawText(
    `${settings.companyName} | ${settings.companyStreet} | ${settings.companyZip} ${settings.companyCity}`,
    { x: settings.pdfMarginLeft, y: footerY, size: fontSize, font: fonts.regular, color },
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
      x: pageWidth - bankWidth - settings.pdfMarginRight,
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
  stripeWidth = 6,
): void {
  const accent = hexToRgb(accentColor)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: stripeWidth,
    height: pageHeight,
    color: rgb(accent.r, accent.g, accent.b),
  })
}

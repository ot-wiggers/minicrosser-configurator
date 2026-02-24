import { rgb, type PDFPage, type PDFFont, type PDFDocument, type PDFImage } from 'pdf-lib'

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
  bankName2: string
  bankIban2: string
  bankBic2: string
  companyLegalName: string
  companyRegister: string
  companyCeo: string
  companyTaxOffice: string
  companyVatId: string
  pdfColorPrimary: string
  pdfColorAccent: string
  logoStorageId: string
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
  pdfLogoMaxHeight: number
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
  bankName2: '',
  bankIban2: '',
  bankBic2: '',
  companyLegalName: '',
  companyRegister: '',
  companyCeo: '',
  companyTaxOffice: '',
  companyVatId: '',
  pdfColorPrimary: '#1E3A5F',
  pdfColorAccent: '#D4A843',
  logoStorageId: '',
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
  pdfLogoMaxHeight: 40,
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
    bankName2: str('bankName2', DEFAULTS.bankName2),
    bankIban2: str('bankIban2', DEFAULTS.bankIban2),
    bankBic2: str('bankBic2', DEFAULTS.bankBic2),
    companyLegalName: str('companyLegalName', DEFAULTS.companyLegalName),
    companyRegister: str('companyRegister', DEFAULTS.companyRegister),
    companyCeo: str('companyCeo', DEFAULTS.companyCeo),
    companyTaxOffice: str('companyTaxOffice', DEFAULTS.companyTaxOffice),
    companyVatId: str('companyVatId', DEFAULTS.companyVatId),
    pdfColorPrimary: str('pdfColorPrimary', DEFAULTS.pdfColorPrimary),
    pdfColorAccent: str('pdfColorAccent', DEFAULTS.pdfColorAccent),
    logoStorageId: str('logoStorageId', DEFAULTS.logoStorageId),
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
    pdfLogoMaxHeight: num('pdfLogoMaxHeight', DEFAULTS.pdfLogoMaxHeight),
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
 * Optionally embeds a logo image.
 * Returns the new Y position after the header.
 */
export function drawCorporateHeader(
  page: PDFPage,
  fonts: { regular: PDFFont; bold: PDFFont },
  settings: CorporateSettings,
  docTitle: string,
  pageWidth: number,
  logoImage?: PDFImage,
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

  // Logo or company name on the left
  const textStartX = stripeWidth + 12
  if (logoImage) {
    const maxLogoH = settings.pdfLogoMaxHeight
    const maxLogoW = 180
    const aspect = logoImage.width / logoImage.height
    let logoH = maxLogoH
    let logoW = logoH * aspect
    if (logoW > maxLogoW) {
      logoW = maxLogoW
      logoH = logoW / aspect
    }
    page.drawImage(logoImage, {
      x: textStartX,
      y: headerY + (headerHeight - logoH) / 2,
      width: logoW,
      height: logoH,
    })
  } else {
    // Company name (white, top-left)
    page.drawText(settings.companyName, {
      x: textStartX,
      y: headerY + headerHeight - 25,
      size: settings.pdfFontSizeHeading,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    })

    // Address line or custom header lines
    const headerLine = settings.pdfHeaderLine1 ||
      `${settings.companyStreet} | ${settings.companyZip} ${settings.companyCity}`
    page.drawText(headerLine, {
      x: textStartX,
      y: headerY + headerHeight - 40,
      size: 7,
      font: fonts.regular,
      color: rgb(0.85, 0.85, 0.85),
    })

    // Optional slogan or second header line
    if (settings.pdfSlogan || settings.pdfHeaderLine2) {
      page.drawText(settings.pdfSlogan || settings.pdfHeaderLine2, {
        x: textStartX,
        y: headerY + headerHeight - 52,
        size: 6.5,
        font: fonts.regular,
        color: rgb(0.75, 0.75, 0.75),
      })
    }
  }

  // Document title (white, right-aligned, large)
  const titleSize = 18
  const titleWidth = fonts.bold.widthOfTextAtSize(docTitle, titleSize)
  page.drawText(docTitle, {
    x: pageWidth - titleWidth - 20,
    y: headerY + (headerHeight - titleSize) / 2,
    size: titleSize,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  })

  return headerY - 20 // Y position below header with spacing
}

/** Minimum Y below which document content must not go (above footer). */
export const FOOTER_SAFE_Y = 95

/**
 * Draws the corporate footer with 3 columns:
 * Left: company info + contact | Center: bank connections | Right: legal info
 */
export function drawCorporateFooter(
  page: PDFPage,
  fonts: { regular: PDFFont },
  settings: CorporateSettings,
  pageWidth: number,
): void {
  const footerTop = 78
  const fontSize = settings.pdfFontSizeFooter
  const lineHeight = fontSize + 2.5
  const color = rgb(0.5, 0.5, 0.5)
  const ml = settings.pdfMarginLeft
  const mr = settings.pdfMarginRight
  const contentWidth = pageWidth - ml - mr
  const col1X = ml
  const col2X = ml + contentWidth * 0.35
  const col3X = ml + contentWidth * 0.68

  // Thin line above footer with proper spacing
  page.drawLine({
    start: { x: ml, y: footerTop + 12 },
    end: { x: pageWidth - mr, y: footerTop + 12 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  })

  function drawCol(x: number, lines: string[], maxWidth?: number) {
    let y = footerTop
    for (const line of lines) {
      if (!line) continue
      // Truncate text if it would overflow column width
      let displayText = line
      if (maxWidth) {
        const textW = fonts.regular.widthOfTextAtSize(displayText, fontSize)
        if (textW > maxWidth) {
          while (fonts.regular.widthOfTextAtSize(displayText + '…', fontSize) > maxWidth && displayText.length > 1) {
            displayText = displayText.slice(0, -1)
          }
          displayText += '…'
        }
      }
      page.drawText(displayText, { x, y, size: fontSize, font: fonts.regular, color })
      y -= lineHeight
    }
  }

  const col1Width = (col2X - col1X) - 4
  const col2Width = (col3X - col2X) - 4
  const col3Width = (pageWidth - mr) - col3X

  // Column 1: Company info
  drawCol(col1X, [
    settings.companyName,
    settings.companyStreet,
    `${settings.companyZip} ${settings.companyCity}`,
    `Tel: ${settings.companyPhone}`,
    settings.companyFax ? `Fax: ${settings.companyFax}` : '',
    settings.companyEmail,
    settings.companyWeb,
  ], col1Width)

  // Column 2: Bank connections
  const bankLines: string[] = []
  if (settings.bankName1) {
    bankLines.push(settings.bankName1)
    if (settings.bankIban1) bankLines.push(`IBAN: ${settings.bankIban1}`)
    if (settings.bankBic1) bankLines.push(`BIC: ${settings.bankBic1}`)
  }
  if (settings.bankName2) {
    if (bankLines.length > 0) bankLines.push('') // spacer only if bank1 exists
    bankLines.push(settings.bankName2)
    if (settings.bankIban2) bankLines.push(`IBAN: ${settings.bankIban2}`)
    if (settings.bankBic2) bankLines.push(`BIC: ${settings.bankBic2}`)
  }
  drawCol(col2X, bankLines, col2Width)

  // Column 3: Legal info
  drawCol(col3X, [
    settings.companyLegalName,
    settings.companyRegister,
    settings.companyCeo ? `GF: ${settings.companyCeo}` : '',
    settings.companyTaxOffice ? `FA: ${settings.companyTaxOffice}` : '',
    settings.companyVatId ? `USt-Id: ${settings.companyVatId}` : '',
  ], col3Width)
}

/**
 * Embeds a logo image into the PDF document from raw bytes.
 * Supports PNG and JPEG formats.
 */
export async function embedLogoImage(
  doc: PDFDocument,
  logoBytes: Uint8Array,
): Promise<PDFImage | undefined> {
  try {
    // Try PNG first, then JPEG
    try {
      return await doc.embedPng(logoBytes)
    } catch {
      return await doc.embedJpg(logoBytes)
    }
  } catch {
    console.warn('Could not embed logo image — unsupported format')
    return undefined
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

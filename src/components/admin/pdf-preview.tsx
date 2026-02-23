'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Eye } from 'lucide-react'
import {
  buildCorporateSettings,
  drawCorporateHeader,
  drawCorporateFooter,
  drawAccentStripe,
  type CorporateSettings,
} from '@/modules/pdf/corporate'

interface PdfPreviewProps {
  settingsMap: Record<string, string>
}

async function generatePreviewPdf(settings: CorporateSettings): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const doc = await PDFDocument.create()
  const page = doc.addPage([595.28, 841.89]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()

  // Draw header
  const y = drawCorporateHeader(
    page,
    { regular: font, bold: fontBold },
    settings,
    'ANGEBOT',
    pageWidth,
  )

  // Draw accent stripe on body pages
  drawAccentStripe(page, settings.pdfColorAccent, pageHeight, settings.pdfAccentStripeWidth)

  // Draw footer
  drawCorporateFooter(page, { regular: font }, settings, pageWidth)

  // Dummy content
  const margin = settings.pdfMarginLeft
  const rightEdge = pageWidth - settings.pdfMarginRight
  let currentY = y - 10

  // Document info
  page.drawText('Dokumentnr: MC-2026-000001', {
    x: margin,
    y: currentY,
    size: settings.pdfFontSizeBody,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  })
  currentY -= 14
  page.drawText('Datum: 23.02.2026', {
    x: margin,
    y: currentY,
    size: settings.pdfFontSizeBody,
    font,
    color: rgb(0.4, 0.4, 0.4),
  })
  currentY -= 30

  // Customer block
  page.drawText('Kundendaten', {
    x: margin,
    y: currentY,
    size: settings.pdfFontSizeHeading,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  })
  currentY -= 16

  const customerLines = [
    'Mustermann GmbH',
    'Max Mustermann',
    'Musterstrasse 1',
    '12345 Musterstadt',
    'max@mustermann.de',
  ]
  for (const line of customerLines) {
    page.drawText(line, {
      x: margin,
      y: currentY,
      size: settings.pdfFontSizeBody,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
    currentY -= 13
  }
  currentY -= 15

  // Line items heading
  page.drawText('Positionen', {
    x: margin,
    y: currentY,
    size: settings.pdfFontSizeHeading,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  })
  currentY -= 18

  // Table header line
  page.drawLine({
    start: { x: margin, y: currentY + 4 },
    end: { x: rightEdge, y: currentY + 4 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })

  const cols = [margin, margin + 80, rightEdge - 120, rightEdge - 60, rightEdge]
  const headers = ['Art.-Nr.', 'Bezeichnung', 'Menge', 'Einzelpreis', 'Gesamt']
  headers.forEach((h, i) => {
    page.drawText(h, {
      x: cols[i] ?? margin,
      y: currentY - 8,
      size: 7,
      font: fontBold,
      color: rgb(0.4, 0.4, 0.4),
    })
  })
  currentY -= 20

  // Dummy items
  const items = [
    ['MC-DL524', 'Mini Crosser M2 4W', '1', '5.899,00', '5.899,00'],
    ['MC-A001', 'Korb vorne', '1', '129,00', '129,00'],
    ['MC-A015', 'Stockhalter', '1', '49,00', '49,00'],
  ]
  for (const item of items) {
    page.drawLine({
      start: { x: margin, y: currentY + 4 },
      end: { x: rightEdge, y: currentY + 4 },
      thickness: 0.25,
      color: rgb(0.85, 0.85, 0.85),
    })
    item.forEach((cell, i) => {
      page.drawText(cell, {
        x: cols[i] ?? margin,
        y: currentY - 6,
        size: settings.pdfFontSizeBody,
        font,
        color: rgb(0.3, 0.3, 0.3),
      })
    })
    currentY -= 16
  }

  // Total
  currentY -= 10
  page.drawLine({
    start: { x: rightEdge - 160, y: currentY + 4 },
    end: { x: rightEdge, y: currentY + 4 },
    thickness: 1,
    color: rgb(0.3, 0.3, 0.3),
  })
  page.drawText('Gesamt netto:', {
    x: rightEdge - 160,
    y: currentY - 10,
    size: settings.pdfFontSizeBody,
    font,
    color: rgb(0.3, 0.3, 0.3),
  })
  page.drawText('6.077,00 EUR', {
    x: rightEdge - 60,
    y: currentY - 10,
    size: settings.pdfFontSizeBody,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  })

  return doc.save()
}

export function PdfPreview({ settingsMap }: PdfPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const generate = useCallback(async (map: Record<string, string>) => {
    setGenerating(true)
    try {
      const settings = buildCorporateSettings(map)
      const bytes = await generatePreviewPdf(settings)
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (err) {
      console.error('PDF preview error:', err)
    } finally {
      setGenerating(false)
    }
  }, [])

  // Debounced auto-update when settings change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => generate(settingsMap), 800)
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [settingsMap, generate])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4" />
          PDF-Vorschau
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => generate(settingsMap)}
          disabled={generating}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </CardHeader>
      <CardContent>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="PDF-Vorschau"
            className="h-[600px] w-full rounded border"
          />
        ) : (
          <div className="flex h-[600px] items-center justify-center rounded border bg-muted/30 text-sm text-muted-foreground">
            {generating ? 'PDF wird generiert...' : 'Vorschau wird geladen...'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

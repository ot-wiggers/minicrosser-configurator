// src/app/admin/(authenticated)/import-export/page.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Download, Upload, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { downloadJsonExport, downloadXlsxExport } from '@/lib/catalog-export'
import type { CatalogData } from '@/lib/catalog-export'
import { parseCatalogJson, parseCatalogXlsx, generateImportPreview } from '@/lib/catalog-import'
import type { ParseResult, ImportPreview, ImportResult } from '@/lib/catalog-io-types'

export default function ImportExportPage() {
  const categories = useQuery(api.categories.list)
  const baseModels = useQuery(api.baseModels.list)
  const optionGroups = useQuery(api.optionGroups.list)
  const options = useQuery(api.options.list)
  const importMutation = useMutation(api.catalogImport.importCatalog)

  const [exporting, setExporting] = useState<'json' | 'xlsx' | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dataLoaded = categories && baseModels && optionGroups && options

  const catalogData: CatalogData | null = dataLoaded
    ? { categories, baseModels, optionGroups, options }
    : null

  // ── Export Handlers ─────────────────────────────────────────────

  async function handleExportJson() {
    if (!catalogData) return
    setExporting('json')
    try {
      downloadJsonExport(catalogData)
      toast.success('JSON-Export heruntergeladen')
    } catch (e) {
      toast.error('Export fehlgeschlagen')
      console.error(e)
    } finally {
      setExporting(null)
    }
  }

  async function handleExportXlsx() {
    if (!catalogData) return
    setExporting('xlsx')
    try {
      await downloadXlsxExport(catalogData)
      toast.success('Excel-Export heruntergeladen')
    } catch (e) {
      toast.error('Export fehlgeschlagen')
      console.error(e)
    } finally {
      setExporting(null)
    }
  }

  // ── Import Handlers ─────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (file: File) => {
      setImportFile(file)
      setImportResult(null)
      setParsed(null)
      setPreview(null)

      try {
        let result: ParseResult
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          result = parseCatalogJson(text)
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const buffer = await file.arrayBuffer()
          result = await parseCatalogXlsx(buffer)
        } else {
          toast.error('Nur .json und .xlsx Dateien werden unterstutzt.')
          return
        }

        setParsed(result)

        if (dataLoaded) {
          const prev = generateImportPreview(
            result,
            categories,
            optionGroups,
            baseModels,
            options,
          )
          setPreview(prev)
        }

        if (result.errors.length > 0) {
          toast.warning(`${result.errors.length} Validierungsfehler gefunden`)
        }
        if (result.warnings.length > 0) {
          result.warnings.forEach((w) => toast.info(w))
        }
      } catch (e) {
        toast.error('Datei konnte nicht gelesen werden')
        console.error(e)
      }
    },
    [categories, baseModels, optionGroups, options, dataLoaded],
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    setImportResult(null)

    try {
      // Convert parsed data for the Convex mutation.
      // Replace null descriptions with undefined for Convex's optional validator.
      const result = await importMutation({
        categories: parsed.categories,
        optionGroups: parsed.optionGroups,
        baseModels: parsed.baseModels.map((m) => ({
          ...m,
          description: m.description ?? undefined,
        })),
        options: parsed.options.map((o) => ({
          ...o,
          description: o.description ?? undefined,
        })),
      })

      setImportResult(result)

      const totalCreated =
        result.categories.created +
        result.optionGroups.created +
        result.baseModels.created +
        result.options.created
      const totalUpdated =
        result.categories.updated +
        result.optionGroups.updated +
        result.baseModels.updated +
        result.options.updated

      if (result.errors.length === 0) {
        toast.success(`Import abgeschlossen: ${totalCreated} neu, ${totalUpdated} aktualisiert`)
      } else {
        toast.warning(
          `Import teilweise abgeschlossen: ${totalCreated} neu, ${totalUpdated} aktualisiert, ${result.errors.length} Fehler`,
        )
      }
    } catch (e) {
      toast.error('Import fehlgeschlagen')
      console.error(e)
    } finally {
      setImporting(false)
    }
  }

  function resetImport() {
    setImportFile(null)
    setParsed(null)
    setPreview(null)
    setImportResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Import / Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Katalogdaten als JSON oder Excel exportieren und importieren.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Export Card ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export
            </CardTitle>
            <CardDescription>
              Gesamten Katalog als Datei herunterladen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dataLoaded && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-1">Aktueller Katalog:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li>{categories.length} Kategorien</li>
                  <li>{baseModels.length} Modelle</li>
                  <li>{optionGroups.length} Optionsgruppen</li>
                  <li>{options.length} Optionen</li>
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleExportJson}
                disabled={!dataLoaded || exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'json' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileJson className="mr-2 h-4 w-4" />
                )}
                Als JSON
              </Button>
              <Button
                onClick={handleExportXlsx}
                disabled={!dataLoaded || exporting !== null}
                variant="outline"
                className="flex-1"
              >
                {exporting === 'xlsx' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Als Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Import Card ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import
            </CardTitle>
            <CardDescription>
              Katalogdaten aus JSON oder Excel importieren (Upsert).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            {!importFile && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center transition-colors hover:border-muted-foreground/50"
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Datei hier ablegen</p>
                <p className="text-xs text-muted-foreground">oder klicken zum Auswahlen</p>
                <p className="mt-1 text-xs text-muted-foreground">.json oder .xlsx</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            )}

            {/* File selected — show preview */}
            {importFile && preview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{importFile.name}</p>
                  <Button variant="ghost" size="sm" onClick={resetImport}>
                    Andere Datei
                  </Button>
                </div>

                <Separator />

                {/* Preview table */}
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium">Entitat</th>
                        <th className="px-3 py-2 text-center font-medium">Neu</th>
                        <th className="px-3 py-2 text-center font-medium">Update</th>
                        <th className="px-3 py-2 text-center font-medium">Fehler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ['Kategorien', preview.categories],
                          ['Optionsgruppen', preview.optionGroups],
                          ['Modelle', preview.baseModels],
                          ['Optionen', preview.options],
                        ] as [string, typeof preview.categories][]
                      ).map(([label, ep]) => (
                        <tr key={label} className="border-b last:border-0">
                          <td className="px-3 py-2">{label}</td>
                          <td className="px-3 py-2 text-center">
                            {ep.new > 0 && (
                              <Badge variant="default" className="bg-green-600">
                                +{ep.new}
                              </Badge>
                            )}
                            {ep.new === 0 && <span className="text-muted-foreground">0</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {ep.updated > 0 && (
                              <Badge variant="secondary">{ep.updated}</Badge>
                            )}
                            {ep.updated === 0 && (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {ep.errors.length > 0 && (
                              <Badge variant="destructive">{ep.errors.length}</Badge>
                            )}
                            {ep.errors.length === 0 && (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Errors detail */}
                {parsed && parsed.errors.length > 0 && (
                  <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
                    <p className="flex items-center gap-1 text-sm font-medium text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {parsed.errors.length} Validierungsfehler
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-destructive">
                      {parsed.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>
                          Zeile {err.row} ({err.entity}): {err.field} — {err.message}
                        </li>
                      ))}
                      {parsed.errors.length > 10 && (
                        <li>... und {parsed.errors.length - 10} weitere</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Import button */}
                <Button
                  onClick={handleImport}
                  disabled={importing || !parsed || parsed.categories.length + parsed.optionGroups.length + parsed.baseModels.length + parsed.options.length === 0}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importiere...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importieren
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div className="rounded-md border border-green-600/50 bg-green-50 p-3 dark:bg-green-950/20">
                <p className="flex items-center gap-1 text-sm font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Import abgeschlossen
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-green-700 dark:text-green-400">
                  <li>
                    Kategorien: {importResult.categories.created} neu,{' '}
                    {importResult.categories.updated} aktualisiert
                  </li>
                  <li>
                    Optionsgruppen: {importResult.optionGroups.created} neu,{' '}
                    {importResult.optionGroups.updated} aktualisiert
                  </li>
                  <li>
                    Modelle: {importResult.baseModels.created} neu,{' '}
                    {importResult.baseModels.updated} aktualisiert
                  </li>
                  <li>
                    Optionen: {importResult.options.created} neu,{' '}
                    {importResult.options.updated} aktualisiert
                  </li>
                </ul>
                {importResult.errors.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs font-medium text-destructive">
                      {importResult.errors.length} Fehler:
                    </p>
                    <ul className="mt-1 space-y-0.5 text-xs text-destructive">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>
                          {err.entity} &quot;{err.name}&quot;: {err.message}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Button variant="outline" size="sm" className="mt-3" onClick={resetImport}>
                  Neuer Import
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { useConfiguratorStore } from '@/modules/configurator'
import { DocumentPreview } from '@/components/documents/document-preview'
import { VersionHistory } from '@/components/documents/version-history'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, Download, FileText, Mail, CheckCircle, Pencil } from 'lucide-react'
import { SendEmailDialog } from '@/components/documents/send-email-dialog'
import type { BlankPdfCatalogData } from '@/modules/pdf/blank-generator'

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function DocumentPage() {
  const params = useParams()
  const router = useRouter()
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const loadFromDocument = useConfiguratorStore((s) => s.loadFromDocument)

  const documentId = params.id as string
  const doc = useQuery(
    api.documents.getById,
    documentId ? { id: documentId as Id<"documents"> } : 'skip',
  )
  const updateStatus = useMutation(api.documents.updateStatus)

  // Catalog data for blank PDF generation
  const allBaseModels = useQuery(api.baseModels.list)
  const allOptionGroups = useQuery(api.optionGroups.list)
  const allOptions = useQuery(api.options.list)
  const allSettings = useQuery(api.settings.list)

  // Category image for blank PDF
  const category = useQuery(
    api.categories.getById,
    doc?.selectedCategory ? { id: doc.selectedCategory as Id<"categories"> } : 'skip',
  )

  // Resolve storage URLs for signature and logo
  const signatureUrl = useQuery(
    api.files.getUrl,
    doc?.signatureStorageId ? { storageId: doc.signatureStorageId } : 'skip',
  )
  const logoStorageId = allSettings?.find((s) => s.key === 'logoStorageId')?.value as string | undefined
  const logoUrl = useQuery(
    api.files.getUrl,
    logoStorageId ? { storageId: logoStorageId as Id<"_storage"> } : 'skip',
  )

  // Build settings map for PDF generators (so they use Convex settings, not defaults)
  function buildSettingsMap(): Record<string, string | number | boolean> | undefined {
    if (!allSettings) return undefined
    const map: Record<string, string | number | boolean> = {}
    for (const rec of allSettings) {
      map[rec.key] = rec.value
    }
    return map
  }

  /** Fetch image bytes from a URL */
  async function fetchImageBytes(url: string): Promise<Uint8Array> {
    const res = await fetch(url)
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  }

  async function handleDownloadPdf() {
    if (!doc) return
    try {
      const { generateDocumentPdf } = await import('@/modules/pdf')
      const images: { logoBytes?: Uint8Array; signatureBytes?: Uint8Array } = {}
      if (logoUrl) images.logoBytes = await fetchImageBytes(logoUrl)
      if (signatureUrl) images.signatureBytes = await fetchImageBytes(signatureUrl)
      const bytes = await generateDocumentPdf(doc, images, buildSettingsMap())
      downloadPdf(bytes, `${doc.documentNo}.pdf`)
      toast.success('PDF heruntergeladen')
    } catch (err) {
      toast.error('PDF-Erstellung fehlgeschlagen')
      console.error(err)
    }
  }

  async function handleDownloadBlankPdf() {
    if (!doc || !allBaseModels || !allOptionGroups || !allOptions) return
    try {
      const { generateBlankFormPdf } = await import('@/modules/pdf/blank-generator')

      const catalogData: BlankPdfCatalogData = {
        baseModels: allBaseModels
          .filter((m: any) => m.categoryId === doc.selectedCategory)
          .map((m: any) => ({
            articleNo: m.articleNo,
            name: m.name,
            priceNet: m.priceNet,
            priceGross: m.priceGross,
            isActive: m.isActive,
            sortOrder: m.sortOrder,
          })),
        optionGroups: allOptionGroups.map((g) => ({
          _id: g._id,
          name: g.name,
          selectionType: g.selectionType,
          isActive: g.isActive,
          sortOrder: g.sortOrder,
          appliesTo: g.appliesTo ?? [],
        })),
        options: allOptions.map((o) => ({
          optionGroupId: o.optionGroupId,
          articleNo: o.articleNo,
          name: o.name,
          priceNet: o.priceNet,
          priceGross: o.priceGross,
          isDefault: o.isDefault ?? false,
          isActive: o.isActive,
          sortOrder: o.sortOrder,
        })),
      }

      let logoBytesForBlank: Uint8Array | undefined
      if (logoUrl) logoBytesForBlank = await fetchImageBytes(logoUrl)
      let categoryImageBytes: Uint8Array | undefined
      if (category?.imageUrl) categoryImageBytes = await fetchImageBytes(category.imageUrl)
      const bytes = await generateBlankFormPdf(doc.selectedCategory, catalogData, logoBytesForBlank, buildSettingsMap(), categoryImageBytes)
      downloadPdf(bytes, `Blanko-${doc.documentNo}.pdf`)
      toast.success('Blanko-PDF heruntergeladen')
    } catch (err) {
      toast.error('PDF-Erstellung fehlgeschlagen')
      console.error(err)
    }
  }

  async function handleFinalize() {
    if (!doc || doc.status !== 'DRAFT') return
    try {
      await updateStatus({ id: doc._id, status: 'FINAL' })
      toast.success('Dokument finalisiert')
    } catch {
      toast.error('Fehler beim Finalisieren')
    }
  }

  function handleEdit() {
    if (!doc || doc.status !== 'DRAFT') return
    // Load document data into configurator store
    loadFromDocument({
      _id: doc._id,
      documentType: doc.documentType,
      selectedCategory: doc.selectedCategory,
      selectedBaseModelId: doc.selectedBaseModelId,
      selectedOptions: doc.selectedOptions.map((opt) => ({
        optionItemId: opt.optionItemId,
        skuCode: opt.skuCode,
        articleNo: opt.articleNo ?? '',
        name: opt.name ?? '',
        priceNet: opt.priceNet ?? 0,
        quantity: opt.quantity,
      })),
    })
    router.push('/new')
  }

  if (doc === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (doc === null) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <p className="text-muted-foreground">Dokument nicht gefunden.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurueck
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          {doc.status === 'DRAFT' && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Bearbeiten
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadBlankPdf}>
            <FileText className="mr-2 h-4 w-4" />
            Blanko PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowEmailDialog(true)}>
            <Mail className="mr-2 h-4 w-4" />
            E-Mail senden
          </Button>
          {doc.status === 'DRAFT' && (
            <Button size="sm" onClick={handleFinalize}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalisieren
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <DocumentPreview document={doc as any} />
        <VersionHistory documentId={documentId} />
      </div>

      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        document={doc as any}
      />
    </div>
  )
}

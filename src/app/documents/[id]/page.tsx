'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { documentRepo } from '@/modules/storage'
import type { DocumentRecord } from '@/modules/storage/types'
import { DocumentPreview } from '@/components/documents/document-preview'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, Download, FileText, Mail, CheckCircle } from 'lucide-react'
import { SendEmailDialog } from '@/components/documents/send-email-dialog'

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
  const [doc, setDoc] = useState<DocumentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  const loadDocument = useCallback(async () => {
    const id = Number(params.id)
    if (isNaN(id)) {
      setLoading(false)
      return
    }
    const record = await documentRepo.getById(id)
    setDoc(record ?? null)
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    loadDocument()
  }, [loadDocument])

  async function handleDownloadPdf() {
    if (!doc) return
    try {
      const { generateDocumentPdf } = await import('@/modules/pdf')
      const bytes = await generateDocumentPdf(doc)
      downloadPdf(bytes, `${doc.document_no}.pdf`)
      toast.success('PDF heruntergeladen')
    } catch (err) {
      toast.error('PDF-Erstellung fehlgeschlagen')
      console.error(err)
    }
  }

  async function handleDownloadBlankPdf() {
    if (!doc) return
    try {
      const { generateBlankFormPdf } = await import('@/modules/pdf')
      const { loadCatalog } = await import('@/modules/catalog')
      const catalog = loadCatalog()
      const bytes = await generateBlankFormPdf(catalog, doc.selectedCategory)
      downloadPdf(bytes, `Blanko-${doc.selectedCategory}.pdf`)
      toast.success('Blanko-PDF heruntergeladen')
    } catch (err) {
      toast.error('PDF-Erstellung fehlgeschlagen')
      console.error(err)
    }
  }

  async function handleFinalize() {
    if (!doc || doc.status !== 'DRAFT') return
    await documentRepo.updateStatus(doc.id!, 'FINAL')
    await loadDocument()
    toast.success('Dokument finalisiert')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <p className="text-muted-foreground">Dokument nicht gefunden.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
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

      <DocumentPreview document={doc} />

      <SendEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        document={doc}
        onSent={loadDocument}
      />
    </div>
  )
}

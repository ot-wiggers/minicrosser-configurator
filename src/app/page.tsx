'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DocumentList } from '@/components/documents/document-list'
import { BlankPdfButtons } from '@/components/dashboard/blank-pdf-buttons'
import { useConfiguratorStore } from '@/modules/configurator'
import { FilePlus2, ShoppingCart } from 'lucide-react'

export default function DashboardPage() {
  const { setDocumentType, reset } = useConfiguratorStore()

  function handleNew(type: 'QUOTE' | 'ORDER') {
    reset()
    setDocumentType(type)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Mini Crosser Angebots- &amp; Bestellkonfigurator
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <Link href="/new" onClick={() => handleNew('QUOTE')}>
          <Button variant="outline" className="h-24 w-full text-lg" size="lg">
            <FilePlus2 className="mr-2 h-6 w-6" />
            Neues Angebot
          </Button>
        </Link>
        <Link href="/new" onClick={() => handleNew('ORDER')}>
          <Button variant="outline" className="h-24 w-full text-lg" size="lg">
            <ShoppingCart className="mr-2 h-6 w-6" />
            Neue Bestellung
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Blanko-Formulare</h2>
        <BlankPdfButtons />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Letzte Dokumente</h2>
        <DocumentList />
      </div>
    </div>
  )
}

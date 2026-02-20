'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { documentRepo } from '@/modules/storage'
import type { DocumentRecord } from '@/modules/storage/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, FileText } from 'lucide-react'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  DRAFT: 'secondary',
  FINAL: 'default',
  SENT: 'default',
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Entwurf',
  FINAL: 'Final',
  SENT: 'Versendet',
}

const typeLabel: Record<string, string> = {
  QUOTE: 'Angebot',
  ORDER: 'Bestellung',
}

export function DocumentList() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const loadDocuments = useCallback(async () => {
    const docs = searchQuery
      ? await documentRepo.search(searchQuery)
      : await documentRepo.getAll()
    setDocuments(docs)
  }, [searchQuery])

  useEffect(() => {
    const timeout = setTimeout(loadDocuments, 0)
    return () => clearTimeout(timeout)
  }, [loadDocuments])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Suche nach Dokumentnummer, Firma, Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="mb-4 h-12 w-12" />
          <p>Noch keine Dokumente vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{doc.document_no}</span>
                      <Badge variant={statusVariant[doc.status]}>
                        {statusLabel[doc.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {typeLabel[doc.document_type]} &middot; {doc.customer.company} &middot;{' '}
                      {doc.customer.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(doc.pricing.totalGross)}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(doc.created_at)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

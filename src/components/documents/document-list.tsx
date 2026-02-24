'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
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
  const [searchQuery, setSearchQuery] = useState('')

  // Use either search or list query depending on search input
  const allDocuments = useQuery(api.documents.list)
  const searchResults = useQuery(
    api.documents.search,
    searchQuery.trim() ? { query: searchQuery.trim() } : 'skip',
  )

  const documents = useMemo(() => {
    if (searchQuery.trim() && searchResults) return searchResults
    if (!searchQuery.trim() && allDocuments) return allDocuments
    return []
  }, [searchQuery, searchResults, allDocuments])

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
          {documents.map((doc: any) => (
            <Link key={doc._id} href={`/documents/${doc._id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{doc.documentNo ?? '\u2014'}</span>
                      <Badge variant={statusVariant[doc.status]}>
                        {statusLabel[doc.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {typeLabel[doc.documentType]} &middot; {doc.customer.company} &middot;{' '}
                      {doc.customer.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(doc.pricing.totalGross)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(doc._creationTime)}
                    </p>
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

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { db } from '@/modules/storage/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { Search, FileText } from 'lucide-react'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  FINAL: 'default',
  SENT: 'default',
  FOLLOW_UP: 'outline',
  ACCEPTED: 'default',
  DECLINED: 'destructive',
  EXPIRED: 'secondary',
  ARCHIVED: 'secondary',
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Entwurf',
  FINAL: 'Final',
  SENT: 'Versendet',
  FOLLOW_UP: 'Nachfassen',
  ACCEPTED: 'Angenommen',
  DECLINED: 'Abgelehnt',
  EXPIRED: 'Abgelaufen',
  ARCHIVED: 'Archiviert',
}

const OPEN_STATUSES = new Set(['DRAFT', 'FINAL', 'SENT', 'FOLLOW_UP'])
const ARCHIVED_STATUSES = new Set(['ARCHIVED', 'DECLINED', 'EXPIRED', 'ACCEPTED'])

const typeLabel: Record<string, string> = {
  QUOTE: 'Angebot',
  ORDER: 'Bestellung',
}

function DocumentCard({ doc }: { doc: any }) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">{doc.documentNo ?? '\u2014'}</span>
            <Badge variant={statusVariant[doc.status]}>
              {statusLabel[doc.status]}
            </Badge>
            {doc._isLocal && (
              <Badge variant="outline" className="border-orange-500 text-orange-500">
                Offline
              </Badge>
            )}
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
  )
}

export function DocumentList() {
  const isOnline = useOnlineStatus()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'archived'>('open')
  const [localDocs, setLocalDocs] = useState<any[]>([])

  // Load local documents from Dexie
  useEffect(() => {
    db.documents
      .orderBy('created_at')
      .reverse()
      .toArray()
      .then(setLocalDocs)
      .catch(console.error)
  }, [])

  // Use either search or list query depending on search input
  const allDocuments = useQuery(api.documents.list)
  const searchResults = useQuery(
    api.documents.search,
    searchQuery.trim() ? { query: searchQuery.trim() } : 'skip',
  )

  const documents = useMemo(() => {
    // Online: use Convex results
    if (isOnline) {
      const convexDocs = searchQuery.trim() && searchResults ? searchResults : (!searchQuery.trim() && allDocuments ? allDocuments : [])
      // Add unsync'd local documents at the top
      const unsyncedLocal = localDocs
        .filter((d) => !d.convexId)
        .map((d) => ({
          _id: `local-${d.id}`,
          documentNo: d.document_no,
          documentType: d.document_type,
          status: d.status,
          customer: d.customer,
          pricing: d.pricing,
          _creationTime: new Date(d.created_at).getTime(),
          _isLocal: true,
        }))
      return [...unsyncedLocal, ...convexDocs]
    }

    // Offline: use local documents only
    return localDocs.map((d) => ({
      _id: d.convexId || `local-${d.id}`,
      documentNo: d.document_no,
      documentType: d.document_type,
      status: d.status,
      customer: d.customer,
      pricing: d.pricing,
      _creationTime: new Date(d.created_at).getTime(),
      _isLocal: !d.convexId,
    }))
  }, [isOnline, searchQuery, searchResults, allDocuments, localDocs])

  const filteredDocuments = useMemo(() => {
    if (filter === 'all') return documents
    if (filter === 'open') return documents.filter((d: any) => OPEN_STATUSES.has(d.status))
    return documents.filter((d: any) => ARCHIVED_STATUSES.has(d.status))
  }, [documents, filter])

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(['open', 'all', 'archived'] as const).map((f) => (
          <Button
            key={f}
            variant="ghost"
            size="sm"
            className={cn(
              'flex-1',
              filter === f && 'bg-background shadow-sm',
            )}
            onClick={() => setFilter(f)}
          >
            {f === 'open' ? 'Offen' : f === 'all' ? 'Alle' : 'Archiviert'}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Suche nach Dokumentnummer, Firma, Name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="mb-4 h-12 w-12" />
          <p>Noch keine Dokumente vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc: any) =>
            doc._isLocal ? (
              <div key={doc._id}>
                <DocumentCard doc={doc} />
              </div>
            ) : (
              <Link key={doc._id} href={`/documents/${doc._id}`}>
                <DocumentCard doc={doc} />
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  )
}

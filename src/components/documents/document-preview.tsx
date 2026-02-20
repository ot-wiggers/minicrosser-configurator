'use client'

import type { DocumentRecord } from '@/modules/storage/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'

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

interface DocumentPreviewProps {
  document: DocumentRecord
}

export function DocumentPreview({ document: doc }: DocumentPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{typeLabel[doc.document_type]}</h2>
            <Badge variant={statusVariant[doc.status]}>{statusLabel[doc.status]}</Badge>
          </div>
          <p className="mt-1 font-mono text-lg text-muted-foreground">{doc.document_no}</p>
          <p className="text-sm text-muted-foreground">{formatDate(doc.created_at)}</p>
        </div>
      </div>

      {/* Customer block */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kundendaten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="font-semibold">{doc.customer.company}</p>
              <p>
                {doc.customer.firstName} {doc.customer.lastName}
              </p>
              <p>{doc.customer.street}</p>
              <p>
                {doc.customer.zip} {doc.customer.city}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">E-Mail: </span>
                {doc.customer.email}
              </p>
              {doc.customer.phone && (
                <p>
                  <span className="text-muted-foreground">Telefon: </span>
                  {doc.customer.phone}
                </p>
              )}
              {doc.customer.contactPerson && (
                <p>
                  <span className="text-muted-foreground">Ansprechpartner: </span>
                  {doc.customer.contactPerson}
                </p>
              )}
              {doc.customer.customerNumber && (
                <p>
                  <span className="text-muted-foreground">Kd.-Nr.: </span>
                  {doc.customer.customerNumber}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line items table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Positionen</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Art.-Nr.</TableHead>
                <TableHead>Bezeichnung</TableHead>
                <TableHead className="text-right">Menge</TableHead>
                <TableHead className="text-right">Einzelpreis (netto)</TableHead>
                <TableHead className="text-right">Gesamt (netto)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doc.pricing.lineItems.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-sm">{item.articleNo}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPriceNet)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.totalNet)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator className="my-4" />

          <div className="ml-auto max-w-xs space-y-2">
            <div className="flex justify-between">
              <span>Netto</span>
              <span className="font-medium">{formatCurrency(doc.pricing.totalNet)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>MwSt. 19%</span>
              <span>{formatCurrency(doc.pricing.vatAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Brutto</span>
              <span className="text-primary">{formatCurrency(doc.pricing.totalGross)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {doc.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bemerkungen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{doc.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

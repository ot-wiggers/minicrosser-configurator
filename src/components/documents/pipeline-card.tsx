'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Mail, MailCheck, MailOpen, MailX, Clock } from 'lucide-react'

const typeLabel: Record<string, string> = {
  QUOTE: 'Angebot',
  ORDER: 'Bestellung',
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

function EmailStatusIcon({ emailStatus, emailEvent }: { emailStatus: string | null; emailEvent: string | null }) {
  if (emailStatus === 'FAILED') {
    return <MailX className="h-4 w-4 text-destructive" />
  }
  if (emailEvent === 'opened' || emailEvent === 'clicked') {
    return <MailOpen className="h-4 w-4 text-green-600" />
  }
  if (emailEvent === 'delivered') {
    return <MailCheck className="h-4 w-4 text-blue-600" />
  }
  if (emailEvent === 'bounced') {
    return <MailX className="h-4 w-4 text-orange-500" />
  }
  if (emailStatus === 'SENT') {
    return <Mail className="h-4 w-4 text-muted-foreground" />
  }
  if (emailStatus === 'PENDING') {
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }
  return null
}

interface PipelineCardProps {
  doc: {
    _id: string
    documentNo: string
    documentType: string
    status: string
    customer: { company: string; firstName: string; lastName: string }
    pricing: { totalGross: number }
    _creationTime: number
    sentAt?: number
    emailStatus: string | null
    emailEvent: string | null
    emailError: string | null
    createdByName?: string
  }
}

export function PipelineCard({ doc }: PipelineCardProps) {
  return (
    <Link href={`/documents/${doc._id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-sm font-medium">{doc.documentNo}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {typeLabel[doc.documentType]}
                </Badge>
                <Badge variant={statusVariant[doc.status]} className="text-[10px] px-1.5 py-0">
                  {statusLabel[doc.status]}
                </Badge>
                <EmailStatusIcon emailStatus={doc.emailStatus} emailEvent={doc.emailEvent} />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {doc.customer.company || `${doc.customer.firstName} ${doc.customer.lastName}`}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold">
              {formatCurrency(doc.pricing.totalGross)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(doc.sentAt ?? doc._creationTime)}</span>
            {doc.createdByName && <span>{doc.createdByName}</span>}
          </div>
          {doc.emailError && (
            <p className="mt-1 truncate text-xs text-destructive">{doc.emailError}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

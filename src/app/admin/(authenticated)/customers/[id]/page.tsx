'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../../convex/_generated/api'
import type { Id } from '../../../../../../convex/_generated/dataModel'
import { CustomerForm } from '@/components/admin/customer-form'
import { CustomerActionsChecklist } from '@/components/customers/customer-actions-checklist'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Pencil, Trash2, FileText, Plus } from 'lucide-react'

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

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const customer = useQuery(api.customers.getById, { id: customerId as Id<"customers"> })
  const documents = useQuery(api.documents.listByCustomerId, { customerId: customerId as Id<"customers"> })
  const removeCustomer = useMutation(api.customers.remove)

  const [formOpen, setFormOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  async function handleDelete() {
    try {
      await removeCustomer({ id: customerId as Id<"customers"> })
      toast.success('Kunde geloescht.')
      router.push('/admin/customers')
    } catch (err) {
      console.error('Failed to delete customer:', err)
      toast.error('Fehler beim Loeschen des Kunden.')
    }
    setShowDeleteDialog(false)
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p>Lade Kundendaten...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.company || `${customer.firstName} ${customer.lastName}`}
            </h1>
            <p className="text-muted-foreground">
              {customer.firstName} {customer.lastName}
              {customer.customerNumber && (
                <span className="ml-2 font-mono text-sm">
                  (Kd.-Nr.: {customer.customerNumber})
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Loeschen
          </Button>
        </div>
      </div>

      {/* Customer Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stammdaten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Firma</span>
                <p className="font-medium">{customer.company}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Name</span>
                <p>{customer.firstName} {customer.lastName}</p>
              </div>
              {(customer.street || customer.zip || customer.city) && (
                <div>
                  <span className="text-sm text-muted-foreground">Adresse</span>
                  {customer.street && <p>{customer.street}</p>}
                  {(customer.zip || customer.city) && (
                    <p>
                      {customer.zip} {customer.city}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">E-Mail</span>
                <p>{customer.email}</p>
              </div>
              {customer.phone && (
                <div>
                  <span className="text-sm text-muted-foreground">Telefon</span>
                  <p>{customer.phone}</p>
                </div>
              )}
              {customer.contactPerson && (
                <div>
                  <span className="text-sm text-muted-foreground">Ansprechpartner</span>
                  <p>{customer.contactPerson}</p>
                </div>
              )}
              {customer.customerNumber && (
                <div>
                  <span className="text-sm text-muted-foreground">Kundennummer</span>
                  <p className="font-mono">{customer.customerNumber}</p>
                </div>
              )}
            </div>
          </div>
          {(customer as any).notes && (
            <div className="mt-4 border-t pt-4">
              <span className="text-sm text-muted-foreground">Notizen</span>
              <p className="whitespace-pre-wrap text-sm">{(customer as any).notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Actions Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerActionsChecklist customerId={customerId} />
        </CardContent>
      </Card>

      {/* Related Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dokumente</CardTitle>
          <Link href="/new">
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Neues Angebot
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {(!documents || documents.length === 0) ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <FileText className="h-8 w-8" />
              <p className="text-sm">Noch keine Dokumente fuer diesen Kunden</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <Link key={doc._id} href={`/documents/${doc._id}`}>
                  <div className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-muted/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm">
                          {doc.documentNo}
                        </span>
                        <Badge variant={statusVariant[doc.status]}>
                          {statusLabel[doc.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel[doc.documentType]} &middot;{' '}
                        {formatDate(new Date(doc._creationTime).toISOString())}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatCurrency(doc.pricing.totalGross)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customerId={customerId}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Moechten Sie &quot;{customer.company}&quot; wirklich loeschen?
              Diese Aktion kann nicht rueckgaengig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Loeschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

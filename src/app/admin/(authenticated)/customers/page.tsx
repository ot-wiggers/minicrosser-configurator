'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { CustomerForm } from '@/components/admin/customer-form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Plus, Pencil, Trash2, Contact, Search, Eye } from 'lucide-react'

export default function CustomersPage() {
  const allCustomers = useQuery(api.customers.list)
  const removeCustomer = useMutation(api.customers.remove)

  const [formOpen, setFormOpen] = useState(false)
  const [editCustomerId, setEditCustomerId] = useState<string | undefined>(undefined)
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCustomers = useMemo(() => {
    if (!allCustomers) return []
    const customers = allCustomers
    if (!searchQuery.trim()) return customers
    const lower = searchQuery.toLowerCase()
    return customers.filter(
      (c: any) =>
        c.company.toLowerCase().includes(lower) ||
        c.lastName.toLowerCase().includes(lower) ||
        c.firstName.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        (c.customerNumber?.toLowerCase().includes(lower) ?? false),
    )
  }, [allCustomers, searchQuery])

  function handleCreate() {
    setEditCustomerId(undefined)
    setFormOpen(true)
  }

  function handleEdit(customerId: string) {
    setEditCustomerId(customerId)
    setFormOpen(true)
  }

  async function handleDelete() {
    if (!deleteCustomerId) return
    try {
      await removeCustomer({ id: deleteCustomerId as Id<"customers"> })
      toast.success('Kunde geloescht.')
    } catch (err) {
      console.error('Failed to delete customer:', err)
      toast.error('Fehler beim Loeschen des Kunden.')
    }
    setDeleteCustomerId(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kundenverwaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Kundenstammdaten
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Kunde
        </Button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Suche nach Firma, Name, E-Mail, Kundennummer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCustomers.length === 0 && !searchQuery.trim() && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-12 text-muted-foreground">
          <Contact className="h-10 w-10" />
          <p>Keine Kunden vorhanden.</p>
          <Button variant="outline" size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Ersten Kunden erstellen
          </Button>
        </div>
      )}

      {filteredCustomers.length === 0 && searchQuery.trim() && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-12 text-muted-foreground">
          <Search className="h-10 w-10" />
          <p>Keine Kunden gefunden fuer &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {filteredCustomers.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firma</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>E-Mail</TableHead>
                <TableHead>Kd.-Nr.</TableHead>
                <TableHead>Ort</TableHead>
                <TableHead className="w-32 text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer: any) => (
                <TableRow key={customer._id}>
                  <TableCell className="font-medium">{customer.company}</TableCell>
                  <TableCell>
                    {customer.firstName} {customer.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {customer.email}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {customer.customerNumber ?? '—'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {customer.city ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/customers/${customer._id}`}>
                        <Button variant="ghost" size="icon" title="Details anzeigen">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(customer._id)}
                        title="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteCustomerId(customer._id)}
                        title="Loeschen"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerForm
        open={formOpen}
        onOpenChange={setFormOpen}
        customerId={editCustomerId}
      />

      <AlertDialog open={!!deleteCustomerId} onOpenChange={() => setDeleteCustomerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kunde loeschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Moechten Sie diesen Kunden wirklich loeschen? Diese Aktion kann nicht
              rueckgaengig gemacht werden.
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

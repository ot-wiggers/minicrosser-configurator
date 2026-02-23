'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface CustomerFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId?: string
}

export function CustomerForm({ open, onOpenChange, customerId }: CustomerFormProps) {
  const customer = useQuery(
    api.customers.getById,
    customerId ? { id: customerId as any } : 'skip',
  )
  const createCustomer = useMutation(api.customers.create)
  const updateCustomer = useMutation(api.customers.update)

  const [company, setCompany] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [street, setStreet] = useState('')
  const [zip, setZip] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [customerNumber, setCustomerNumber] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = !!customerId

  useEffect(() => {
    if (open) {
      if (customer) {
        setCompany(customer.company)
        setFirstName(customer.firstName)
        setLastName(customer.lastName)
        setStreet(customer.street ?? '')
        setZip(customer.zip ?? '')
        setCity(customer.city ?? '')
        setEmail(customer.email)
        setPhone(customer.phone ?? '')
        setContactPerson(customer.contactPerson ?? '')
        setCustomerNumber(customer.customerNumber ?? '')
      } else if (!customerId) {
        setCompany('')
        setFirstName('')
        setLastName('')
        setStreet('')
        setZip('')
        setCity('')
        setEmail('')
        setPhone('')
        setContactPerson('')
        setCustomerNumber('')
      }
    }
  }, [open, customer, customerId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedCompany = company.trim()
    const trimmedEmail = email.trim()

    if (!trimmedCompany) {
      toast.error('Bitte eine Firma eingeben.')
      return
    }
    if (!trimmedEmail) {
      toast.error('Bitte eine E-Mail eingeben.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Bitte eine gueltige E-Mail-Adresse eingeben.')
      return
    }

    setSaving(true)
    try {
      if (isEdit && customerId) {
        await updateCustomer({
          id: customerId as any,
          company: trimmedCompany,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          street: street.trim() || undefined,
          zip: zip.trim() || undefined,
          city: city.trim() || undefined,
          email: trimmedEmail,
          phone: phone.trim() || undefined,
          contactPerson: contactPerson.trim() || undefined,
          customerNumber: customerNumber.trim() || undefined,
        })
        toast.success('Kunde aktualisiert.')
      } else {
        await createCustomer({
          company: trimmedCompany,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          street: street.trim() || undefined,
          zip: zip.trim() || undefined,
          city: city.trim() || undefined,
          email: trimmedEmail,
          phone: phone.trim() || undefined,
          contactPerson: contactPerson.trim() || undefined,
          customerNumber: customerNumber.trim() || undefined,
        })
        toast.success('Kunde erstellt.')
      }
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save customer:', err)
      toast.error('Fehler beim Speichern des Kunden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Kunde bearbeiten' : 'Neuer Kunde'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Bearbeiten Sie die Kundendaten und speichern Sie.'
              : 'Erstellen Sie einen neuen Kundeneintrag.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
          <div className="space-y-2">
            <Label htmlFor="customer-company">Firma *</Label>
            <Input
              id="customer-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Mustermann GmbH"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-firstName">Vorname *</Label>
              <Input
                id="customer-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-lastName">Nachname *</Label>
              <Input
                id="customer-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-street">Straße / Nr.</Label>
            <Input
              id="customer-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Musterstraße 1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-zip">PLZ</Label>
              <Input
                id="customer-zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="12345"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="customer-city">Ort</Label>
              <Input
                id="customer-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Musterstadt"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-email">E-Mail *</Label>
            <Input
              id="customer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@mustermann.de"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Telefon</Label>
              <Input
                id="customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 123 456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-customerNumber">Kundennummer</Label>
              <Input
                id="customer-customerNumber"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                placeholder="KD-001"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-contactPerson">Ansprechpartner</Label>
            <Input
              id="customer-contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Frau Schmidt"
            />
          </div>
        </form>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

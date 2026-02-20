'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfiguratorStore } from '@/modules/configurator'
import { loadCatalog, getSkuForBaseModel } from '@/modules/catalog'
import { calculatePricing } from '@/modules/pricing'
import { documentRepo, sequenceRepo } from '@/modules/storage'
import type { CustomerData } from '@/modules/storage/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const requiredFields: (keyof CustomerData)[] = [
  'company',
  'firstName',
  'lastName',
  'street',
  'zip',
  'city',
  'email',
]

const fieldLabels: Record<string, string> = {
  company: 'Firma',
  firstName: 'Vorname',
  lastName: 'Nachname',
  street: 'Straße / Nr.',
  zip: 'PLZ',
  city: 'Ort',
  email: 'E-Mail',
  phone: 'Telefon',
  contactPerson: 'Ansprechpartner',
  customerNumber: 'Kundennummer',
}

export function CustomerFormDialog({ open, onOpenChange }: CustomerFormDialogProps) {
  const router = useRouter()
  const {
    documentType,
    selectedCategory,
    selectedBaseModelId,
    selectedOptions,
    reset,
  } = useConfiguratorStore()

  const [customer, setCustomer] = useState<CustomerData>({
    company: '',
    firstName: '',
    lastName: '',
    street: '',
    zip: '',
    city: '',
    email: '',
    phone: '',
    contactPerson: '',
    customerNumber: '',
  })
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function updateField(field: keyof CustomerData, value: string) {
    setCustomer((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    for (const field of requiredFields) {
      if (!customer[field]?.trim()) {
        newErrors[field] = `${fieldLabels[field]} ist erforderlich`
      }
    }
    if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      newErrors.email = 'Bitte gültige E-Mail-Adresse eingeben'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    if (!selectedCategory || !selectedBaseModelId) return

    setSaving(true)
    try {
      const catalog = loadCatalog()
      const baseSku = getSkuForBaseModel(catalog, selectedBaseModelId)
      if (!baseSku) throw new Error('Base SKU not found')

      const optionsArray = Object.values(selectedOptions)
      const pricing = calculatePricing(baseSku, optionsArray, catalog)
      const documentNo = await sequenceRepo.getNextNumber()
      const now = new Date().toISOString()

      const id = await documentRepo.create({
        document_no: documentNo,
        document_type: documentType,
        status: 'DRAFT',
        customer,
        pricing,
        selectedCategory,
        selectedBaseModelId,
        selectedOptions: optionsArray,
        notes: notes || undefined,
        created_at: now,
        updated_at: now,
      })

      reset()
      onOpenChange(false)
      toast.success(
        `${documentType === 'QUOTE' ? 'Angebot' : 'Bestellung'} ${documentNo} erstellt`,
      )
      router.push(`/documents/${id}`)
    } catch (err) {
      toast.error('Fehler beim Speichern')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const title =
    documentType === 'QUOTE' ? 'Angebot erstellen' : 'Bestellung erstellen'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Bitte Kundendaten eingeben</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Required fields */}
          <div className="grid gap-2">
            <Label htmlFor="company">{fieldLabels.company} *</Label>
            <Input
              id="company"
              value={customer.company}
              onChange={(e) => updateField('company', e.target.value)}
              className={errors.company ? 'border-destructive' : ''}
            />
            {errors.company && (
              <p className="text-sm text-destructive">{errors.company}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">{fieldLabels.firstName} *</Label>
              <Input
                id="firstName"
                value={customer.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                className={errors.firstName ? 'border-destructive' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">{fieldLabels.lastName} *</Label>
              <Input
                id="lastName"
                value={customer.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                className={errors.lastName ? 'border-destructive' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="street">{fieldLabels.street} *</Label>
            <Input
              id="street"
              value={customer.street}
              onChange={(e) => updateField('street', e.target.value)}
              className={errors.street ? 'border-destructive' : ''}
            />
            {errors.street && (
              <p className="text-sm text-destructive">{errors.street}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="zip">{fieldLabels.zip} *</Label>
              <Input
                id="zip"
                value={customer.zip}
                onChange={(e) => updateField('zip', e.target.value)}
                className={errors.zip ? 'border-destructive' : ''}
              />
              {errors.zip && (
                <p className="text-sm text-destructive">{errors.zip}</p>
              )}
            </div>
            <div className="col-span-2 grid gap-2">
              <Label htmlFor="city">{fieldLabels.city} *</Label>
              <Input
                id="city"
                value={customer.city}
                onChange={(e) => updateField('city', e.target.value)}
                className={errors.city ? 'border-destructive' : ''}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">{fieldLabels.email} *</Label>
            <Input
              id="email"
              type="email"
              value={customer.email}
              onChange={(e) => updateField('email', e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">{fieldLabels.phone}</Label>
              <Input
                id="phone"
                value={customer.phone}
                onChange={(e) => updateField('phone', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customerNumber">{fieldLabels.customerNumber}</Label>
              <Input
                id="customerNumber"
                value={customer.customerNumber}
                onChange={(e) => updateField('customerNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contactPerson">{fieldLabels.contactPerson}</Label>
            <Input
              id="contactPerson"
              value={customer.contactPerson}
              onChange={(e) => updateField('contactPerson', e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Bemerkungen</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Speichert...' : title}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

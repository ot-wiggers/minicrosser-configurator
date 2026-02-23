'use client'

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/modules/storage/db'
import { baseModelRepo } from '@/modules/storage'
import type { BaseModelRecord } from '@/modules/catalog/db-types'
import { ImageUpload } from '@/components/admin/image-upload'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ModelFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: BaseModelRecord
}

const VAT_RATE = 1.19

const emptyForm = {
  categoryId: '',
  skuCode: '',
  articleNo: '',
  name: '',
  description: '',
  priceNet: 0,
  priceGross: 0,
  sortOrder: 0,
  isActive: true,
  imageBlob: undefined as Blob | undefined,
}

function ModelFormInner({
  onOpenChange,
  model,
}: {
  onOpenChange: (open: boolean) => void
  model?: BaseModelRecord
}) {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray()) ?? []

  const [form, setForm] = useState(() => {
    if (model) {
      return {
        categoryId: model.categoryId,
        skuCode: model.skuCode,
        articleNo: model.articleNo,
        name: model.name,
        description: model.description ?? '',
        priceNet: model.priceNet,
        priceGross: model.priceGross,
        sortOrder: model.sortOrder,
        isActive: model.isActive,
        imageBlob: model.imageBlob,
      }
    }
    return emptyForm
  })
  const [grossOverridden, setGrossOverridden] = useState(() => {
    if (!model) return false
    const calculated = Math.round(model.priceNet * VAT_RATE * 100) / 100
    return Math.abs(model.priceGross - calculated) > 0.01
  })

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Auto-calculate gross from net unless manually overridden
      if (key === 'priceNet' && !grossOverridden) {
        next.priceGross = Math.round((value as number) * VAT_RATE * 100) / 100
      }
      return next
    })
  }

  function handleGrossChange(value: number) {
    setGrossOverridden(true)
    setForm((prev) => ({ ...prev, priceGross: value }))
  }

  function resetGrossToCalculated() {
    setGrossOverridden(false)
    setForm((prev) => ({
      ...prev,
      priceGross: Math.round(prev.priceNet * VAT_RATE * 100) / 100,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.categoryId) {
      toast.error('Bitte eine Kategorie auswahlen.')
      return
    }
    if (!form.name.trim()) {
      toast.error('Bitte einen Namen eingeben.')
      return
    }

    try {
      const record: BaseModelRecord = {
        id: model?.id ?? crypto.randomUUID(),
        categoryId: form.categoryId,
        skuCode: form.skuCode.trim(),
        articleNo: form.articleNo.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceNet: form.priceNet,
        priceGross: form.priceGross,
        imageBlob: form.imageBlob,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      }

      await baseModelRepo.upsert(record)
      toast.success(model ? 'Modell aktualisiert.' : 'Modell erstellt.')
      onOpenChange(false)
    } catch {
      toast.error('Fehler beim Speichern.')
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{model ? 'Modell bearbeiten' : 'Neues Modell'}</SheetTitle>
      </SheetHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>Kategorie</Label>
            <Select value={form.categoryId} onValueChange={(v) => updateField('categoryId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Kategorie wahlen..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* SKU Code */}
          <div className="space-y-2">
            <Label htmlFor="skuCode">SKU-Code</Label>
            <Input
              id="skuCode"
              value={form.skuCode}
              onChange={(e) => updateField('skuCode', e.target.value)}
              placeholder="z.B. MC-M1"
            />
          </div>

          {/* Article No */}
          <div className="space-y-2">
            <Label htmlFor="articleNo">Artikelnummer</Label>
            <Input
              id="articleNo"
              value={form.articleNo}
              onChange={(e) => updateField('articleNo', e.target.value)}
              placeholder="z.B. 12345"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Modellname"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Optionale Beschreibung..."
              rows={3}
            />
          </div>

          {/* Price Net */}
          <div className="space-y-2">
            <Label htmlFor="priceNet">Preis Netto (EUR)</Label>
            <Input
              id="priceNet"
              type="number"
              step="0.01"
              min="0"
              value={form.priceNet}
              onChange={(e) => updateField('priceNet', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Price Gross */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="priceGross">Preis Brutto (EUR)</Label>
              {grossOverridden && (
                <button
                  type="button"
                  onClick={resetGrossToCalculated}
                  className="text-xs text-primary hover:underline"
                >
                  Automatisch berechnen
                </button>
              )}
            </div>
            <Input
              id="priceGross"
              type="number"
              step="0.01"
              min="0"
              value={form.priceGross}
              onChange={(e) => handleGrossChange(parseFloat(e.target.value) || 0)}
            />
            {!grossOverridden && (
              <p className="text-xs text-muted-foreground">Automatisch berechnet (Netto x 1,19)</p>
            )}
          </div>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sortierung</Label>
            <Input
              id="sortOrder"
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(e) => updateField('sortOrder', parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <Switch
              id="isActive"
              checked={form.isActive}
              onCheckedChange={(checked) => updateField('isActive', checked)}
            />
            <Label htmlFor="isActive">Aktiv</Label>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Bild</Label>
            <ImageUpload
              value={form.imageBlob}
              onChange={(blob) => updateField('imageBlob', blob)}
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="mt-2">
            {model ? 'Speichern' : 'Erstellen'}
          </Button>
        </form>
    </>
  )
}

export function ModelForm({ open, onOpenChange, model }: ModelFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        {open && (
          <ModelFormInner
            key={model?.id ?? 'new'}
            onOpenChange={onOpenChange}
            model={model}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

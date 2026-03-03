'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
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
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { Plus, Trash2 } from 'lucide-react'

interface ModelFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelId?: string
}

const VAT_RATE = 1.19

function ModelFormInner({
  onOpenChange,
  modelId,
}: {
  onOpenChange: (open: boolean) => void
  modelId?: string
}) {
  const model = useQuery(api.baseModels.getById, modelId ? { id: modelId as Id<"baseModels"> } : 'skip')
  const categories = useQuery(api.categories.list) ?? []
  const createModel = useMutation(api.baseModels.create)
  const updateModel = useMutation(api.baseModels.update)

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
        priceOnRequest: model.priceOnRequest ?? false,
        isDefault: model.isDefault ?? false,
        upgradeLabel: model.upgradeLabel ?? '',
        imageStorageId: model.imageStorageId as string | undefined,
        specs: (model.specs ?? []) as Array<{ label: string; value: string }>,
      }
    }
    return {
      categoryId: '',
      skuCode: '',
      articleNo: '',
      name: '',
      description: '',
      priceNet: 0,
      priceGross: 0,
      sortOrder: 0,
      isActive: true,
      priceOnRequest: false,
      isDefault: false,
      upgradeLabel: '',
      imageStorageId: undefined as string | undefined,
      specs: [] as Array<{ label: string; value: string }>,
    }
  })
  const [grossOverridden, setGrossOverridden] = useState(() => {
    if (!model) return false
    const calculated = Math.round(model.priceNet * VAT_RATE * 100) / 100
    return Math.abs(model.priceGross - calculated) > 0.01
  })

  // Populate form when model data loads (query is async)
  useEffect(() => {
    if (model) {
      setForm({
        categoryId: model.categoryId,
        skuCode: model.skuCode,
        articleNo: model.articleNo,
        name: model.name,
        description: model.description ?? '',
        priceNet: model.priceNet,
        priceGross: model.priceGross,
        sortOrder: model.sortOrder,
        isActive: model.isActive,
        priceOnRequest: model.priceOnRequest ?? false,
        isDefault: model.isDefault ?? false,
        upgradeLabel: model.upgradeLabel ?? '',
        imageStorageId: model.imageStorageId as string | undefined,
        specs: (model.specs ?? []) as Array<{ label: string; value: string }>,
      })
      const calculated = Math.round(model.priceNet * VAT_RATE * 100) / 100
      setGrossOverridden(Math.abs(model.priceGross - calculated) > 0.01)
    }
  }, [model])

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
      if (modelId) {
        const updateArgs: any = {
          id: modelId,
          categoryId: form.categoryId,
          skuCode: form.skuCode.trim(),
          articleNo: form.articleNo.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          priceNet: form.priceNet,
          priceGross: form.priceGross,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
          priceOnRequest: form.priceOnRequest || undefined,
          isDefault: form.isDefault || undefined,
          upgradeLabel: form.upgradeLabel.trim() || undefined,
          specs: form.specs.filter((s) => s.label.trim() && s.value.trim()),
        }
        if (form.imageStorageId) {
          updateArgs.imageStorageId = form.imageStorageId
        } else if (model?.imageStorageId && !form.imageStorageId) {
          updateArgs.removeImage = true
        }
        await updateModel(updateArgs)
        toast.success('Modell aktualisiert.')
      } else {
        const createArgs: any = {
          categoryId: form.categoryId,
          skuCode: form.skuCode.trim(),
          articleNo: form.articleNo.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          priceNet: form.priceNet,
          priceGross: form.priceGross,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
          priceOnRequest: form.priceOnRequest || undefined,
          isDefault: form.isDefault || undefined,
          upgradeLabel: form.upgradeLabel.trim() || undefined,
          specs: form.specs.filter((s) => s.label.trim() && s.value.trim()),
        }
        if (form.imageStorageId) {
          createArgs.imageStorageId = form.imageStorageId
        }
        await createModel(createArgs)
        toast.success('Modell erstellt.')
      }
      onOpenChange(false)
    } catch {
      toast.error('Fehler beim Speichern.')
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{modelId ? 'Modell bearbeiten' : 'Neues Modell'}</SheetTitle>
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
                  <SelectItem key={cat._id} value={cat._id}>
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

          {/* Description (Rich Text) */}
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <RichTextEditor
              content={form.description}
              onChange={(html) => updateField('description', html)}
              placeholder="Optionale Beschreibung..."
            />
          </div>

          {/* Price on Request */}
          <div className="flex items-center gap-3">
            <Switch
              id="priceOnRequest"
              checked={form.priceOnRequest}
              onCheckedChange={(checked) => updateField('priceOnRequest', checked)}
            />
            <Label htmlFor="priceOnRequest">Preis auf Anfrage</Label>
          </div>

          {!form.priceOnRequest && (
            <>
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
            </>
          )}

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

          {/* Is Default (auto-selected in configurator) */}
          <div className="flex items-center gap-3">
            <Switch
              id="isDefault"
              checked={form.isDefault}
              onCheckedChange={(checked) => updateField('isDefault', checked)}
            />
            <Label htmlFor="isDefault">Standard-Modell (Comfort)</Label>
          </div>

          {/* Upgrade Label */}
          <div className="space-y-2">
            <Label htmlFor="upgradeLabel">Upgrade-Bezeichnung</Label>
            <Input
              id="upgradeLabel"
              value={form.upgradeLabel}
              onChange={(e) => updateField('upgradeLabel', e.target.value)}
              placeholder="z.B. Premium-Ausstattung"
            />
            <p className="text-xs text-muted-foreground">Alternativer Name im Upgrade-Picker (optional)</p>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Bild</Label>
            <ImageUpload
              storageId={form.imageStorageId}
              onChange={(id) => updateField('imageStorageId', id)}
            />
          </div>

          {/* Technical Specs */}
          <div className="space-y-2">
            <Label>Technische Daten</Label>
            {form.specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Bezeichnung"
                  value={spec.label}
                  onChange={(e) => {
                    const next = [...form.specs]
                    next[i] = { ...next[i], label: e.target.value }
                    setForm((prev) => ({ ...prev, specs: next }))
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="Wert"
                  value={spec.value}
                  onChange={(e) => {
                    const next = [...form.specs]
                    next[i] = { ...next[i], value: e.target.value }
                    setForm((prev) => ({ ...prev, specs: next }))
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const next = form.specs.filter((_, j) => j !== i)
                    setForm((prev) => ({ ...prev, specs: next }))
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  specs: [...prev.specs, { label: '', value: '' }],
                }))
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Zeile hinzufügen
            </Button>
          </div>

          {/* Submit */}
          <Button type="submit" className="mt-2">
            {modelId ? 'Speichern' : 'Erstellen'}
          </Button>
        </form>
    </>
  )
}

export function ModelForm({ open, onOpenChange, modelId }: ModelFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        {open && (
          <ModelFormInner
            key={modelId ?? 'new'}
            onOpenChange={onOpenChange}
            modelId={modelId}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

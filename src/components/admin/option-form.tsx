'use client'

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/modules/storage/db'
import { optionRepo } from '@/modules/storage'
import type { OptionRecord } from '@/modules/catalog/db-types'
import { ImageUpload } from '@/components/admin/image-upload'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface OptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  option?: OptionRecord
}

const VAT_RATE = 1.19

function OptionFormInner({
  onOpenChange,
  option,
}: {
  onOpenChange: (open: boolean) => void
  option?: OptionRecord
}) {
  const optionGroups = useLiveQuery(() => db.optionGroups.orderBy('sortOrder').toArray())

  const [optionGroupId, setOptionGroupId] = useState(option?.optionGroupId ?? '')
  const [skuCode, setSkuCode] = useState(option?.skuCode ?? '')
  const [articleNo, setArticleNo] = useState(option?.articleNo ?? '')
  const [name, setName] = useState(option?.name ?? '')
  const [description, setDescription] = useState(option?.description ?? '')
  const [priceNet, setPriceNet] = useState(option ? String(option.priceNet) : '')
  const [priceGross, setPriceGross] = useState(option ? String(option.priceGross) : '')
  const [grossManuallyEdited, setGrossManuallyEdited] = useState(false)
  const [sortOrder, setSortOrder] = useState(option ? String(option.sortOrder) : '0')
  const [isActive, setIsActive] = useState(option?.isActive ?? true)
  const [isDefault, setIsDefault] = useState(option?.isDefault ?? false)
  const [imageBlob, setImageBlob] = useState<Blob | undefined>(option?.imageBlob)

  function handlePriceNetChange(value: string) {
    setPriceNet(value)
    if (!grossManuallyEdited && value !== '') {
      const net = parseFloat(value)
      if (!isNaN(net)) {
        setPriceGross((Math.round(net * VAT_RATE * 100) / 100).toFixed(2))
      }
    }
  }

  function handleGrossChange(value: string) {
    setPriceGross(value)
    setGrossManuallyEdited(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!optionGroupId) {
      toast.error('Bitte eine Optionsgruppe auswahlen.')
      return
    }
    if (!skuCode.trim() || !articleNo.trim() || !name.trim()) {
      toast.error('Bitte alle Pflichtfelder ausfullen.')
      return
    }

    const netVal = parseFloat(priceNet)
    const grossVal = parseFloat(priceGross)
    if (isNaN(netVal) || isNaN(grossVal)) {
      toast.error('Bitte gultige Preise eingeben.')
      return
    }

    const record: OptionRecord = {
      id: option?.id ?? crypto.randomUUID(),
      optionGroupId,
      skuCode: skuCode.trim(),
      articleNo: articleNo.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      priceNet: netVal,
      priceGross: grossVal,
      imageBlob,
      sortOrder: parseInt(sortOrder, 10) || 0,
      isActive,
      isDefault,
    }

    try {
      await optionRepo.upsert(record)
      toast.success(option ? 'Option aktualisiert.' : 'Option erstellt.')
      onOpenChange(false)
    } catch {
      toast.error('Fehler beim Speichern.')
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{option ? 'Option bearbeiten' : 'Neue Option'}</SheetTitle>
      </SheetHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
        {/* Option Group */}
        <div className="space-y-2">
          <Label>Optionsgruppe *</Label>
          <Select value={optionGroupId} onValueChange={setOptionGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="Gruppe auswahlen..." />
            </SelectTrigger>
            <SelectContent>
              {optionGroups?.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SKU Code */}
        <div className="space-y-2">
          <Label htmlFor="skuCode">SKU Code *</Label>
          <Input
            id="skuCode"
            value={skuCode}
            onChange={(e) => setSkuCode(e.target.value)}
            placeholder="z.B. OPT-001"
          />
        </div>

        {/* Article No */}
        <div className="space-y-2">
          <Label htmlFor="articleNo">Artikelnummer *</Label>
          <Input
            id="articleNo"
            value={articleNo}
            onChange={(e) => setArticleNo(e.target.value)}
            placeholder="z.B. 12345"
          />
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optionsname"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Beschreibung</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionale Beschreibung..."
            rows={3}
          />
        </div>

        {/* Price Net / Gross */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priceNet">Preis Netto (EUR) *</Label>
            <Input
              id="priceNet"
              type="number"
              step="0.01"
              min="0"
              value={priceNet}
              onChange={(e) => handlePriceNetChange(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceGross">Preis Brutto (EUR) *</Label>
            <Input
              id="priceGross"
              type="number"
              step="0.01"
              min="0"
              value={priceGross}
              onChange={(e) => handleGrossChange(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Sort Order */}
        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sortierung</Label>
          <Input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* Active */}
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Aktiv</Label>
          <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
        </div>

        {/* Is Default */}
        <div className="flex items-center justify-between">
          <Label htmlFor="isDefault">Standard-Option</Label>
          <Switch id="isDefault" checked={isDefault} onCheckedChange={setIsDefault} />
        </div>

        {/* Image */}
        <div className="space-y-2">
          <Label>Bild (optional)</Label>
          <ImageUpload value={imageBlob} onChange={setImageBlob} />
        </div>

        {/* Submit */}
        <Button type="submit" className="mt-2 w-full">
          {option ? 'Speichern' : 'Erstellen'}
        </Button>
      </form>
    </>
  )
}

export function OptionForm({ open, onOpenChange, option }: OptionFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        {open && (
          <OptionFormInner
            key={option?.id ?? 'new'}
            onOpenChange={onOpenChange}
            option={option}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

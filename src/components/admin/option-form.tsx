'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ImageUpload } from '@/components/admin/image-upload'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface OptionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  optionId?: string
}

/** Section for managing per-model color variant images (only for color options). */
function ColorVariantSection({ optionId }: { optionId: string }) {
  const baseModels = useQuery(api.baseModels.list)

  if (!baseModels) return null

  return (
    <div className="space-y-3">
      <Separator />
      <Label className="text-base font-semibold">Modell-Bilder (Farbvariante)</Label>
      <p className="text-sm text-muted-foreground">
        Laden Sie pro Basismodell ein Bild in dieser Farbe hoch.
      </p>
      {baseModels.map((model) => (
        <ColorVariantModelRow
          key={model._id}
          modelId={model._id}
          modelName={model.name}
          optionId={optionId as Id<'options'>}
        />
      ))}
    </div>
  )
}

function ColorVariantModelRow({
  modelId,
  modelName,
  optionId,
}: {
  modelId: Id<'baseModels'>
  modelName: string
  optionId: Id<'options'>
}) {
  const images = useQuery(api.colorVariantImages.listByModelAndOption, {
    baseModelId: modelId,
    optionId,
  })
  const createVariant = useMutation(api.colorVariantImages.create)
  const removeVariant = useMutation(api.colorVariantImages.remove)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const [uploading, setUploading] = useState(false)

  async function handleUpload(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const uploadUrl = await generateUploadUrl()
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const { storageId } = await result.json()
      await createVariant({
        baseModelId: modelId,
        optionId,
        imageStorageId: storageId,
        sortOrder: (images?.length ?? 0) + 1,
      })
      toast.success(`Bild fur ${modelName} hochgeladen`)
    } catch {
      toast.error('Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-sm font-medium">{modelName}</p>
      <div className="flex flex-wrap gap-2">
        {images?.map((img) => (
          <div key={img._id} className="relative">
            <img
              src={img.imageUrl ?? ''}
              alt={modelName}
              className="h-16 w-16 rounded-md border object-cover"
            />
            <button
              type="button"
              onClick={async () => {
                await removeVariant({ id: img._id })
                toast.success('Bild entfernt')
              }}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {/* Upload button */}
        <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50">
          {uploading ? (
            <span className="text-xs">...</span>
          ) : (
            <span className="text-xl">+</span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

const VAT_RATE = 1.19

function OptionFormInner({
  onOpenChange,
  optionId,
}: {
  onOpenChange: (open: boolean) => void
  optionId?: string
}) {
  const option = useQuery(api.options.getById, optionId ? { id: optionId as Id<"options"> } : 'skip')
  const optionGroups = useQuery(api.optionGroups.list)
  const createOption = useMutation(api.options.create)
  const updateOption = useMutation(api.options.update)

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
  const [imageStorageId, setImageStorageId] = useState<string | undefined>(option?.imageStorageId as string | undefined)

  // Populate form when option data loads (query is async)
  useEffect(() => {
    if (option) {
      setOptionGroupId(option.optionGroupId)
      setSkuCode(option.skuCode)
      setArticleNo(option.articleNo)
      setName(option.name)
      setDescription(option.description ?? '')
      setPriceNet(String(option.priceNet))
      setPriceGross(String(option.priceGross))
      setSortOrder(String(option.sortOrder))
      setIsActive(option.isActive)
      setIsDefault(option.isDefault)
      setImageStorageId(option.imageStorageId as string | undefined)
    }
  }, [option])

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

    try {
      if (optionId) {
        const updateArgs: any = {
          id: optionId,
          optionGroupId,
          skuCode: skuCode.trim(),
          articleNo: articleNo.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          priceNet: netVal,
          priceGross: grossVal,
          sortOrder: parseInt(sortOrder, 10) || 0,
          isActive,
          isDefault,
        }
        if (imageStorageId) {
          updateArgs.imageStorageId = imageStorageId
        } else if (option?.imageStorageId && !imageStorageId) {
          updateArgs.removeImage = true
        }
        await updateOption(updateArgs)
        toast.success('Option aktualisiert.')
      } else {
        const createArgs: any = {
          optionGroupId,
          skuCode: skuCode.trim(),
          articleNo: articleNo.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          priceNet: netVal,
          priceGross: grossVal,
          sortOrder: parseInt(sortOrder, 10) || 0,
          isActive,
          isDefault,
        }
        if (imageStorageId) {
          createArgs.imageStorageId = imageStorageId
        }
        await createOption(createArgs)
        toast.success('Option erstellt.')
      }
      onOpenChange(false)
    } catch {
      toast.error('Fehler beim Speichern.')
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{optionId ? 'Option bearbeiten' : 'Neue Option'}</SheetTitle>
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
              {optionGroups && optionGroups.map((g) => (
                <SelectItem key={g._id} value={g._id}>
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
          <ImageUpload storageId={imageStorageId} onChange={setImageStorageId} />
        </div>

        {/* Color variant images (only for color options being edited) */}
        {optionId && optionGroupId && optionGroups && (() => {
          const group = optionGroups.find((g) => g._id === optionGroupId)
          if (group && /farbe|color/i.test(group.name)) {
            return <ColorVariantSection optionId={optionId} />
          }
          return null
        })()}

        {/* Submit */}
        <Button type="submit" className="mt-2 w-full">
          {optionId ? 'Speichern' : 'Erstellen'}
        </Button>
      </form>
    </>
  )
}

export function OptionForm({ open, onOpenChange, optionId }: OptionFormProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        {open && (
          <OptionFormInner
            key={optionId ?? 'new'}
            onOpenChange={onOpenChange}
            optionId={optionId}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

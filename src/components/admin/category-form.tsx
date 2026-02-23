'use client'

import { useEffect, useState } from 'react'
import { categoryRepo } from '@/modules/storage'
import type { CategoryRecord } from '@/modules/catalog/db-types'
import { ImageUpload } from '@/components/admin/image-upload'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryRecord
}

export function CategoryForm({ open, onOpenChange, category }: CategoryFormProps) {
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [imageBlob, setImageBlob] = useState<Blob | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const isEdit = !!category

  // Reset form when sheet opens or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name)
        setSortOrder(category.sortOrder)
        setIsActive(category.isActive)
        setImageBlob(category.imageBlob)
      } else {
        setName('')
        setSortOrder(0)
        setIsActive(true)
        setImageBlob(undefined)
      }
    }
  }, [open, category])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Bitte einen Namen eingeben.')
      return
    }

    setSaving(true)
    try {
      const record: CategoryRecord = {
        id: category?.id ?? crypto.randomUUID(),
        name: trimmedName,
        sortOrder,
        isActive,
        imageBlob,
      }
      await categoryRepo.upsert(record)
      toast.success(isEdit ? 'Kategorie aktualisiert.' : 'Kategorie erstellt.')
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save category:', err)
      toast.error('Fehler beim Speichern der Kategorie.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Kategorie bearbeiten' : 'Neue Kategorie'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Bearbeiten Sie die Felder und speichern Sie die Kategorie.'
              : 'Erstellen Sie eine neue Produktkategorie.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 overflow-y-auto px-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Elektromobile"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-sort-order">Sortierung</Label>
            <Input
              id="category-sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              min={0}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="category-active">Aktiv</Label>
            <Switch
              id="category-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <div className="space-y-2">
            <Label>Bild</Label>
            <ImageUpload value={imageBlob} onChange={setImageBlob} />
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

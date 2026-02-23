'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
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
  categoryId?: string
}

export function CategoryForm({ open, onOpenChange, categoryId }: CategoryFormProps) {
  const category = useQuery(api.categories.getById, categoryId ? { id: categoryId as any } : 'skip')
  const createCategory = useMutation(api.categories.create)
  const updateCategory = useMutation(api.categories.update)

  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [imageStorageId, setImageStorageId] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState(false)

  const isEdit = !!categoryId

  // Reset form when sheet opens or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name)
        setSortOrder(category.sortOrder)
        setIsActive(category.isActive)
        setImageStorageId(category.imageStorageId)
      } else if (!categoryId) {
        setName('')
        setSortOrder(0)
        setIsActive(true)
        setImageStorageId(undefined)
      }
    }
  }, [open, category, categoryId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Bitte einen Namen eingeben.')
      return
    }

    setSaving(true)
    try {
      if (isEdit && categoryId) {
        const updateArgs: any = {
          id: categoryId,
          name: trimmedName,
          sortOrder,
          isActive,
        }
        if (imageStorageId) {
          updateArgs.imageStorageId = imageStorageId
        } else if (category?.imageStorageId && !imageStorageId) {
          // Image was removed
          updateArgs.removeImage = true
        }
        await updateCategory(updateArgs)
        toast.success('Kategorie aktualisiert.')
      } else {
        const createArgs: any = {
          name: trimmedName,
          sortOrder,
          isActive,
        }
        if (imageStorageId) {
          createArgs.imageStorageId = imageStorageId
        }
        await createCategory(createArgs)
        toast.success('Kategorie erstellt.')
      }
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
            <ImageUpload storageId={imageStorageId} onChange={setImageStorageId} />
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

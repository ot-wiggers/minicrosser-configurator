'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
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

interface OptionGroupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: string
}

export function OptionGroupForm({ open, onOpenChange, groupId }: OptionGroupFormProps) {
  const group = useQuery(api.optionGroups.getById, groupId ? { id: groupId as Id<"optionGroups"> } : 'skip')
  const categories = useQuery(api.categories.list)
  const createGroup = useMutation(api.optionGroups.create)
  const updateGroup = useMutation(api.optionGroups.update)

  const [name, setName] = useState('')
  const [selectionType, setSelectionType] = useState<'SINGLE' | 'MULTI'>('SINGLE')
  const [appliesTo, setAppliesTo] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const isEdit = !!groupId

  // Reset form when sheet opens or group changes
  useEffect(() => {
    if (open) {
      if (group) {
        setName(group.name)
        setSelectionType(group.selectionType as 'SINGLE' | 'MULTI')
        setAppliesTo([...group.appliesTo])
        setSortOrder(group.sortOrder)
        setIsActive(group.isActive)
      } else if (!groupId) {
        setName('')
        setSelectionType('SINGLE')
        setAppliesTo([])
        setSortOrder(0)
        setIsActive(true)
      }
    }
  }, [open, group, groupId])

  function toggleCategory(categoryId: string) {
    setAppliesTo((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.error('Bitte einen Namen eingeben.')
      return
    }

    setSaving(true)
    try {
      if (isEdit && groupId) {
        await updateGroup({
          id: groupId as Id<"optionGroups">,
          name: trimmedName,
          selectionType,
          appliesTo,
          sortOrder,
          isActive,
        })
        toast.success('Optionsgruppe aktualisiert.')
      } else {
        await createGroup({
          name: trimmedName,
          selectionType,
          appliesTo,
          sortOrder,
          isActive,
        })
        toast.success('Optionsgruppe erstellt.')
      }
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to save option group:', err)
      toast.error('Fehler beim Speichern der Optionsgruppe.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? 'Optionsgruppe bearbeiten' : 'Neue Optionsgruppe'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Bearbeiten Sie die Felder und speichern Sie die Optionsgruppe.'
              : 'Erstellen Sie eine neue Optionsgruppe.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-6 overflow-y-auto px-4"
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Sitzoptionen"
              required
            />
          </div>

          {/* Selection Type */}
          <fieldset className="space-y-2">
            <Label asChild>
              <legend>Auswahltyp</legend>
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="selectionType"
                  value="SINGLE"
                  checked={selectionType === 'SINGLE'}
                  onChange={() => setSelectionType('SINGLE')}
                  className="accent-primary h-4 w-4"
                />
                Einzelauswahl (SINGLE)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="selectionType"
                  value="MULTI"
                  checked={selectionType === 'MULTI'}
                  onChange={() => setSelectionType('MULTI')}
                  className="accent-primary h-4 w-4"
                />
                Mehrfachauswahl (MULTI)
              </label>
            </div>
          </fieldset>

          {/* Applies To (categories) */}
          <fieldset className="space-y-2">
            <Label asChild>
              <legend>Gilt f&uuml;r Kategorien</legend>
            </Label>
            <p className="text-xs text-muted-foreground">
              Keine Auswahl = gilt f&uuml;r alle Kategorien.
            </p>
            <div className="space-y-1.5 rounded-md border p-3 max-h-40 overflow-y-auto">
              {categories && categories.length > 0 ? (
                categories.map((cat) => (
                  <label
                    key={cat._id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={appliesTo.includes(cat._id)}
                      onChange={() => toggleCategory(cat._id)}
                      className="accent-primary h-4 w-4 rounded"
                    />
                    {cat.name}
                  </label>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Keine Kategorien vorhanden.</p>
              )}
            </div>
          </fieldset>

          {/* Sort Order */}
          <div className="space-y-2">
            <Label htmlFor="group-sort-order">Sortierung</Label>
            <Input
              id="group-sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              min={0}
            />
          </div>

          {/* Active */}
          <div className="flex items-center justify-between">
            <Label htmlFor="group-active">Aktiv</Label>
            <Switch
              id="group-active"
              checked={isActive}
              onCheckedChange={setIsActive}
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

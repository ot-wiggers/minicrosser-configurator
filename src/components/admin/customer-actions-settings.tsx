'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { toast } from 'sonner'

interface EditingAction {
  id?: Id<'customerActions'>
  label: string
  description: string
  sortOrder: number
  isActive: boolean
}

export function CustomerActionsSettings() {
  const actions = useQuery(api.customerActions.list)
  const createAction = useMutation(api.customerActions.create)
  const updateAction = useMutation(api.customerActions.update)
  const removeAction = useMutation(api.customerActions.remove)

  const [editing, setEditing] = useState<EditingAction | null>(null)

  function startNew() {
    const nextSort = actions ? Math.max(0, ...actions.map((a) => a.sortOrder)) + 1 : 1
    setEditing({ label: '', description: '', sortOrder: nextSort, isActive: true })
  }

  function startEdit(action: NonNullable<typeof actions>[number]) {
    setEditing({
      id: action._id,
      label: action.label,
      description: action.description ?? '',
      sortOrder: action.sortOrder,
      isActive: action.isActive,
    })
  }

  async function handleSave() {
    if (!editing) return
    if (!editing.label.trim()) {
      toast.error('Bitte einen Namen eingeben.')
      return
    }

    try {
      if (editing.id) {
        await updateAction({
          id: editing.id,
          label: editing.label.trim(),
          description: editing.description.trim() || undefined,
          sortOrder: editing.sortOrder,
          isActive: editing.isActive,
        })
        toast.success('Aktion aktualisiert.')
      } else {
        await createAction({
          label: editing.label.trim(),
          description: editing.description.trim() || undefined,
          sortOrder: editing.sortOrder,
          isActive: editing.isActive,
        })
        toast.success('Aktion erstellt.')
      }
      setEditing(null)
    } catch {
      toast.error('Fehler beim Speichern.')
    }
  }

  async function handleDelete(id: Id<'customerActions'>) {
    try {
      await removeAction({ id })
      toast.success('Aktion geloescht.')
    } catch {
      toast.error('Fehler beim Loeschen.')
    }
  }

  async function handleToggleActive(action: NonNullable<typeof actions>[number]) {
    try {
      await updateAction({ id: action._id, isActive: !action.isActive })
    } catch {
      toast.error('Fehler beim Aktualisieren.')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Kundenaktionen</CardTitle>
        <Button size="sm" onClick={startNew} disabled={!!editing}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Aktion
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing && !editing.id && (
          <div className="rounded-md border p-4 space-y-3 bg-muted/50">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                placeholder="z.B. Katalog zuschicken"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Input
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                placeholder="Optionale Beschreibung..."
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="space-y-2">
                <Label>Reihenfolge</Label>
                <Input
                  type="number"
                  value={editing.sortOrder}
                  onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
                  className="w-20"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={editing.isActive}
                  onCheckedChange={(checked) => setEditing({ ...editing, isActive: checked })}
                />
                <Label>Aktiv</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave}>
                <Check className="mr-1 h-4 w-4" />
                Speichern
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                <X className="mr-1 h-4 w-4" />
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {!actions && <p className="text-sm text-muted-foreground">Laden...</p>}

        {actions?.map((action) =>
          editing?.id === action._id ? (
            <div key={action._id} className="rounded-md border p-4 space-y-3 bg-muted/50">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={editing!.label}
                  onChange={(e) => setEditing({ ...editing!, label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Input
                  value={editing!.description}
                  onChange={(e) => setEditing({ ...editing!, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Reihenfolge</Label>
                  <Input
                    type="number"
                    value={editing!.sortOrder}
                    onChange={(e) => setEditing({ ...editing!, sortOrder: Number(e.target.value) })}
                    className="w-20"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={editing!.isActive}
                    onCheckedChange={(checked) => setEditing({ ...editing!, isActive: checked })}
                  />
                  <Label>Aktiv</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Check className="mr-1 h-4 w-4" />
                  Speichern
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                  <X className="mr-1 h-4 w-4" />
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={action._id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{action.label}</span>
                  {!action.isActive && (
                    <span className="text-xs text-muted-foreground">(inaktiv)</span>
                  )}
                </div>
                {action.description && (
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={action.isActive}
                  onCheckedChange={() => handleToggleActive(action)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => startEdit(action)}
                  disabled={!!editing}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(action._id)}
                  disabled={!!editing}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ),
        )}

        {actions?.length === 0 && !editing && (
          <p className="text-sm text-muted-foreground">
            Noch keine Aktionen definiert. Erstellen Sie die erste Aktion.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

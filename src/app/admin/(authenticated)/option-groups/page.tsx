'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { OptionGroupForm } from '@/components/admin/option-group-form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Layers } from 'lucide-react'

export default function OptionGroupsPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | undefined>(undefined)

  const groups = useQuery(api.optionGroups.list)
  const categories = useQuery(api.categories.list)
  const options = useQuery(api.options.list)
  const removeGroup = useMutation(api.optionGroups.remove)
  const removeOption = useMutation(api.options.remove)

  // Build a map of category id -> name for display
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    if (categories) {
      for (const cat of categories) {
        map.set(cat._id, cat.name)
      }
    }
    return map
  }, [categories])

  // Count options per group
  const optionCountMap = useMemo(() => {
    const map = new Map<string, number>()
    if (options) {
      for (const opt of options) {
        map.set(opt.optionGroupId, (map.get(opt.optionGroupId) ?? 0) + 1)
      }
    }
    return map
  }, [options])

  function getCategoryNames(appliesTo: string[]): string {
    if (appliesTo.length === 0) return 'Alle'
    return appliesTo
      .map((id) => categoryMap.get(id) ?? id)
      .join(', ')
  }

  function handleCreate() {
    setEditingGroupId(undefined)
    setFormOpen(true)
  }

  function handleEdit(groupId: string) {
    setEditingGroupId(groupId)
    setFormOpen(true)
  }

  async function handleDelete(group: any) {
    const optionCount = optionCountMap.get(group._id) ?? 0
    const message = optionCount > 0
      ? `"${group.name}" hat ${optionCount} Option(en). Trotzdem löschen?`
      : `"${group.name}" wirklich löschen?`

    if (!confirm(message)) return

    try {
      // Delete associated options first
      if (optionCount > 0 && options) {
        const groupOptions = options.filter((o) => o.optionGroupId === group._id)
        for (const opt of groupOptions) {
          await removeOption({ id: opt._id })
        }
      }
      await removeGroup({ id: group._id })
      toast.success('Optionsgruppe gelöscht.')
    } catch (err) {
      console.error('Failed to delete option group:', err)
      toast.error('Fehler beim Löschen der Optionsgruppe.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Optionsgruppen</h1>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Optionsgruppe
        </Button>
      </div>

      {groups === undefined ? (
        <p className="text-muted-foreground">Laden...</p>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
          <Layers className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="text-lg font-semibold">Keine Optionsgruppen</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Erstellen Sie Ihre erste Optionsgruppe.
          </p>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Neue Optionsgruppe
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Auswahltyp</TableHead>
              <TableHead>Gilt für</TableHead>
              <TableHead className="text-center"># Optionen</TableHead>
              <TableHead>Sortierung</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group._id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>
                  <Badge variant={group.selectionType === 'SINGLE' ? 'default' : 'secondary'}>
                    {group.selectionType}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {getCategoryNames(group.appliesTo)}
                </TableCell>
                <TableCell className="text-center">
                  {optionCountMap.get(group._id) ?? 0}
                </TableCell>
                <TableCell>{group.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={group.isActive ? 'default' : 'outline'}>
                    {group.isActive ? 'Aktiv' : 'Inaktiv'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(group._id)}
                      title="Bearbeiten"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(group)}
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <OptionGroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        groupId={editingGroupId}
      />
    </div>
  )
}

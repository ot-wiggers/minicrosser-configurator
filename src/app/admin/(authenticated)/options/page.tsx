'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/modules/storage/db'
import { optionRepo } from '@/modules/storage'
import type { OptionRecord } from '@/modules/catalog/db-types'
import { OptionForm } from '@/components/admin/option-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ListChecks } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const ALL_GROUPS = '__all__'

export default function OptionsPage() {
  const options = useLiveQuery(() => db.options.orderBy('sortOrder').toArray())
  const optionGroups = useLiveQuery(() => db.optionGroups.orderBy('sortOrder').toArray())

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<OptionRecord | undefined>(undefined)
  const [filterGroupId, setFilterGroupId] = useState(ALL_GROUPS)

  // Build a lookup map for group names
  const groupMap = useMemo(() => {
    const map = new Map<string, string>()
    optionGroups?.forEach((g) => map.set(g.id, g.name))
    return map
  }, [optionGroups])

  // Build image URL cache for table thumbnails
  const [imagePreviews, setImagePreviews] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (!options) return

    const newPreviews = new Map<string, string>()
    const toRevoke: string[] = []

    options.forEach((opt) => {
      if (opt.imageBlob) {
        // Re-use existing URL if same option already has one
        const existing = imagePreviews.get(opt.id)
        if (existing) {
          newPreviews.set(opt.id, existing)
        } else {
          newPreviews.set(opt.id, URL.createObjectURL(opt.imageBlob))
        }
      }
    })

    // Revoke URLs that are no longer needed
    imagePreviews.forEach((url, id) => {
      if (!newPreviews.has(id)) {
        toRevoke.push(url)
      }
    })
    toRevoke.forEach((url) => URL.revokeObjectURL(url))

    setImagePreviews(newPreviews)

    return () => {
      // Cleanup on unmount
      newPreviews.forEach((url) => URL.revokeObjectURL(url))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  const filteredOptions = useMemo(() => {
    if (!options) return []
    if (filterGroupId === ALL_GROUPS) return options
    return options.filter((o) => o.optionGroupId === filterGroupId)
  }, [options, filterGroupId])

  function handleNew() {
    setEditingOption(undefined)
    setSheetOpen(true)
  }

  function handleEdit(opt: OptionRecord) {
    setEditingOption(opt)
    setSheetOpen(true)
  }

  async function handleDelete(opt: OptionRecord) {
    if (!confirm(`Option "${opt.name}" wirklich loschen?`)) return
    try {
      await optionRepo.delete(opt.id)
      toast.success('Option geloscht.')
    } catch {
      toast.error('Fehler beim Loschen.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Optionen</h1>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Option
        </Button>
      </div>

      {/* Filter by group */}
      <div className="mb-4 max-w-xs">
        <Select value={filterGroupId} onValueChange={setFilterGroupId}>
          <SelectTrigger>
            <SelectValue placeholder="Alle Gruppen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GROUPS}>Alle Gruppen</SelectItem>
            {optionGroups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Options Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Bild</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Gruppe</TableHead>
              <TableHead>Artikelnr.</TableHead>
              <TableHead className="text-right">Preis Netto</TableHead>
              <TableHead className="w-16 text-center">Standard</TableHead>
              <TableHead className="w-20 text-center">Status</TableHead>
              <TableHead className="w-24 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Keine Optionen vorhanden.
                </TableCell>
              </TableRow>
            ) : (
              filteredOptions.map((opt) => (
                <TableRow key={opt.id}>
                  {/* Image thumbnail */}
                  <TableCell>
                    {imagePreviews.get(opt.id) ? (
                      <img
                        src={imagePreviews.get(opt.id)}
                        alt={opt.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted" />
                    )}
                  </TableCell>

                  {/* Name */}
                  <TableCell className="font-medium">{opt.name}</TableCell>

                  {/* Group name */}
                  <TableCell className="text-muted-foreground">
                    {groupMap.get(opt.optionGroupId) ?? '-'}
                  </TableCell>

                  {/* Article No */}
                  <TableCell className="text-muted-foreground">{opt.articleNo}</TableCell>

                  {/* Price Net */}
                  <TableCell className="text-right">{formatCurrency(opt.priceNet)}</TableCell>

                  {/* Default diamond */}
                  <TableCell className="text-center">
                    {opt.isDefault && (
                      <span className="text-primary" title="Standard-Option">
                        &#9670;
                      </span>
                    )}
                  </TableCell>

                  {/* Active badge */}
                  <TableCell className="text-center">
                    <Badge variant={opt.isActive ? 'default' : 'secondary'}>
                      {opt.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(opt)}
                        title="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(opt)}
                        title="Loschen"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Option Form Sheet */}
      <OptionForm open={sheetOpen} onOpenChange={setSheetOpen} option={editingOption} />
    </div>
  )
}

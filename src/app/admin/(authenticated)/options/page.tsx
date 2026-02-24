'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { OptionForm } from '@/components/admin/option-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { Plus, Pencil, Trash2, ListChecks } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const ALL_GROUPS = '__all__'

export default function OptionsPage() {
  const options = useQuery(api.options.list)
  const optionGroups = useQuery(api.optionGroups.list)
  const removeOption = useMutation(api.options.remove)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingOptionId, setEditingOptionId] = useState<string | undefined>(undefined)
  const [filterGroupId, setFilterGroupId] = useState(ALL_GROUPS)

  // Build a lookup map for group names
  const groupMap = useMemo(() => {
    const map = new Map<string, string>()
    if (optionGroups) {
      for (const g of optionGroups) {
        map.set(g._id, g.name)
      }
    }
    return map
  }, [optionGroups])

  const filteredOptions = useMemo(() => {
    if (!options) return []
    if (filterGroupId === ALL_GROUPS) return options
    return options.filter((o) => o.optionGroupId === filterGroupId)
  }, [options, filterGroupId])

  function handleNew() {
    setEditingOptionId(undefined)
    setSheetOpen(true)
  }

  function handleEdit(optionId: string) {
    setEditingOptionId(optionId)
    setSheetOpen(true)
  }

  async function handleDelete(opt: any) {
    if (!confirm(`Option "${opt.name}" wirklich loschen?`)) return
    try {
      await removeOption({ id: opt._id })
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
            {optionGroups && optionGroups.map((g) => (
              <SelectItem key={g._id} value={g._id}>
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
              filteredOptions.map((opt: any) => (
                <TableRow key={opt._id}>
                  <TableCell>
                    {opt.imageUrl ? (
                      <ImageLightbox src={opt.imageUrl} alt={opt.name}>
                        <img
                          src={opt.imageUrl}
                          alt={opt.name}
                          className="h-8 w-8 rounded object-cover"
                        />
                      </ImageLightbox>
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{opt.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {groupMap.get(opt.optionGroupId) ?? '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{opt.articleNo}</TableCell>
                  <TableCell className="text-right">{formatCurrency(opt.priceNet)}</TableCell>
                  <TableCell className="text-center">
                    {opt.isDefault && (
                      <span className="text-primary" title="Standard-Option">
                        &#9670;
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={opt.isActive ? 'default' : 'secondary'}>
                      {opt.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(opt._id)}
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

      <OptionForm open={sheetOpen} onOpenChange={setSheetOpen} optionId={editingOptionId} />
    </div>
  )
}

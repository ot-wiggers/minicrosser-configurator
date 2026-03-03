'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { OptionForm } from '@/components/admin/option-form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { Plus, Pencil, Trash2, ListChecks, ArrowUp, ArrowDown, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const ALL_GROUPS = '__all__'

export default function OptionsPage() {
  const options = useQuery(api.options.list)
  const optionGroups = useQuery(api.optionGroups.list)
  const categories = useQuery(api.categories.list)
  const removeOption = useMutation(api.options.remove)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingOptionId, setEditingOptionId] = useState<string | undefined>(undefined)
  const [filterGroupId, setFilterGroupId] = useState(ALL_GROUPS)
  const [filterCategoryId, setFilterCategoryId] = useState('__all__')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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
    if (!options || !optionGroups) return []
    let result = [...options]

    // Group filter
    if (filterGroupId !== ALL_GROUPS) {
      result = result.filter((o) => o.optionGroupId === filterGroupId)
    }

    // Category filter
    if (filterCategoryId !== '__all__') {
      const applicableGroupIds = new Set(
        optionGroups
          .filter((g) => g.appliesTo.length === 0 || g.appliesTo.includes(filterCategoryId))
          .map((g) => g._id),
      )
      result = result.filter((o) => applicableGroupIds.has(o.optionGroupId))
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.skuCode.toLowerCase().includes(q) ||
          o.articleNo.toLowerCase().includes(q),
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number, bVal: string | number
      switch (sortField) {
        case 'name': aVal = a.name; bVal = b.name; break
        case 'skuCode': aVal = a.skuCode; bVal = b.skuCode; break
        case 'articleNo': aVal = a.articleNo; bVal = b.articleNo; break
        case 'priceNet': aVal = a.priceNet; bVal = b.priceNet; break
        case 'group': aVal = groupMap.get(a.optionGroupId) ?? ''; bVal = groupMap.get(b.optionGroupId) ?? ''; break
        default: aVal = a.name; bVal = b.name
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    return result
  }, [options, optionGroups, filterGroupId, filterCategoryId, searchQuery, sortField, sortDir, groupMap])

  function toggleSort(field: string) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ArrowUp className="ml-1 inline h-3 w-3" /> : <ArrowDown className="ml-1 inline h-3 w-3" />
  }

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

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suche nach Name, SKU, Artikelnr..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterGroupId} onValueChange={setFilterGroupId}>
          <SelectTrigger className="w-[200px]">
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
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Alle Kategorien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Alle Kategorien</SelectItem>
            {categories && categories.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.name}
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
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>
                Name<SortIcon field="name" />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('group')}>
                Gruppe<SortIcon field="group" />
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('articleNo')}>
                Artikelnr.<SortIcon field="articleNo" />
              </TableHead>
              <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('priceNet')}>
                Preis Netto<SortIcon field="priceNet" />
              </TableHead>
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
                  <TableCell className="text-right">
                    {opt.priceOnRequest ? <span className="text-muted-foreground">a.A.</span> : formatCurrency(opt.priceNet)}
                  </TableCell>
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

'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { ModelForm } from '@/components/admin/model-form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { Plus, Pencil, Trash2, Car } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function ModelsPage() {
  const modelsRaw = useQuery(api.baseModels.list)
  const models = useMemo(() => modelsRaw ?? [], [modelsRaw])
  const categoriesRaw = useQuery(api.categories.list)
  const categories = useMemo(() => categoriesRaw ?? [], [categoriesRaw])

  const removeModel = useMutation(api.baseModels.remove)

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editModelId, setEditModelId] = useState<string | undefined>()
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all')

  // Build a lookup map: categoryId -> category name
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const cat of categories) {
      map.set(cat._id, cat.name)
    }
    return map
  }, [categories])

  const filteredModels = useMemo(() => {
    if (filterCategoryId === 'all') return models
    return models.filter((m) => m.categoryId === filterCategoryId)
  }, [models, filterCategoryId])

  function handleNew() {
    setEditModelId(undefined)
    setSheetOpen(true)
  }

  function handleEdit(modelId: string) {
    setEditModelId(modelId)
    setSheetOpen(true)
  }

  async function handleDelete(model: any) {
    if (!confirm(`Modell "${model.name}" wirklich loschen?`)) return

    try {
      await removeModel({ id: model._id })
      toast.success('Modell geloscht.')
    } catch {
      toast.error('Fehler beim Loschen.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Modelle</h1>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Neues Modell
        </Button>
      </div>

      {/* Category Filter */}
      <div className="mb-4 max-w-xs">
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Alle Kategorien" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Kategorien</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredModels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Car className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {models.length === 0
              ? 'Noch keine Modelle vorhanden.'
              : 'Keine Modelle in dieser Kategorie.'}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Bild</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Artikelnr.</TableHead>
                <TableHead className="text-right">Preis Netto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.map((model) => (
                <TableRow key={model._id}>
                  <TableCell>
                    {model.imageUrl ? (
                      <ImageLightbox src={model.imageUrl} alt={model.name}>
                        <img
                          src={model.imageUrl}
                          alt={model.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      </ImageLightbox>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Car className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell>{categoryMap.get(model.categoryId) ?? '---'}</TableCell>
                  <TableCell>{model.articleNo}</TableCell>
                  <TableCell className="text-right">{formatCurrency(model.priceNet)}</TableCell>
                  <TableCell>
                    <Badge variant={model.isActive ? 'default' : 'secondary'}>
                      {model.isActive ? 'Aktiv' : 'Inaktiv'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(model._id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(model)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ModelForm open={sheetOpen} onOpenChange={setSheetOpen} modelId={editModelId} />
    </div>
  )
}

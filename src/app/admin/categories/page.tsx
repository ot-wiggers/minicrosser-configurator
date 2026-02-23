'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/modules/storage/db'
import { categoryRepo } from '@/modules/storage'
import type { CategoryRecord } from '@/modules/catalog/db-types'
import { CategoryForm } from '@/components/admin/category-form'
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
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react'

/** Hook that creates and manages Blob URLs for a list of categories. */
function useCategoryImageUrls(categories: CategoryRecord[] | undefined) {
  const imageUrls = useMemo(() => {
    const map = new Map<string, string>()
    if (!categories) return map
    for (const cat of categories) {
      if (cat.imageBlob) {
        map.set(cat.id, URL.createObjectURL(cat.imageBlob))
      }
    }
    return map
  }, [categories])

  // Revoke old URLs when the map changes or on unmount
  useEffect(() => {
    return () => {
      for (const url of imageUrls.values()) {
        URL.revokeObjectURL(url)
      }
    }
  }, [imageUrls])

  return imageUrls
}

export default function CategoriesPage() {
  const categories = useLiveQuery(() => db.categories.orderBy('sortOrder').toArray())
  const imageUrls = useCategoryImageUrls(categories)

  const [formOpen, setFormOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<CategoryRecord | undefined>(undefined)

  function handleCreate() {
    setEditCategory(undefined)
    setFormOpen(true)
  }

  function handleEdit(category: CategoryRecord) {
    setEditCategory(category)
    setFormOpen(true)
  }

  async function handleDelete(category: CategoryRecord) {
    const confirmed = window.confirm(
      `Kategorie "${category.name}" wirklich loeschen? Dieser Vorgang kann nicht rueckgaengig gemacht werden.`,
    )
    if (!confirmed) return

    try {
      await categoryRepo.delete(category.id)
      toast.success('Kategorie geloescht.')
    } catch (err) {
      console.error('Failed to delete category:', err)
      toast.error('Fehler beim Loeschen der Kategorie.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kategorien</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Neue Kategorie
        </Button>
      </div>

      {categories && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-12 text-muted-foreground">
          <FolderOpen className="h-10 w-10" />
          <p>Keine Kategorien vorhanden.</p>
          <Button variant="outline" size="sm" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Erste Kategorie erstellen
          </Button>
        </div>
      )}

      {categories && categories.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Bild</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-24">Sortierung</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28 text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => {
                const imgUrl = imageUrls.get(category.id)
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={category.name}
                          className="h-12 w-12 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted">
                          <FolderOpen className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={category.isActive ? 'default' : 'secondary'}>
                        {category.isActive ? 'Aktiv' : 'Inaktiv'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category)}
                          title="Bearbeiten"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category)}
                          title="Loeschen"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editCategory}
      />
    </div>
  )
}

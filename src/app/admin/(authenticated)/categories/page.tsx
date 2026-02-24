'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
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
import { ImageLightbox } from '@/components/ui/image-lightbox'
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react'

export default function CategoriesPage() {
  const categories = useQuery(api.categories.list)
  const removeCategory = useMutation(api.categories.remove)

  const [formOpen, setFormOpen] = useState(false)
  const [editCategoryId, setEditCategoryId] = useState<string | undefined>(undefined)

  function handleCreate() {
    setEditCategoryId(undefined)
    setFormOpen(true)
  }

  function handleEdit(categoryId: string) {
    setEditCategoryId(categoryId)
    setFormOpen(true)
  }

  async function handleDelete(cat: any) {
    const confirmed = window.confirm(
      `Kategorie "${cat.name}" wirklich loeschen? Dieser Vorgang kann nicht rueckgaengig gemacht werden.`,
    )
    if (!confirmed) return

    try {
      await removeCategory({ id: cat._id })
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
              {categories.map((category: any) => (
                <TableRow key={category._id}>
                  <TableCell>
                    {category.imageUrl ? (
                      <ImageLightbox src={category.imageUrl} alt={category.name}>
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="h-12 w-12 rounded-md border object-cover"
                        />
                      </ImageLightbox>
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
                        onClick={() => handleEdit(category._id)}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CategoryForm
        key={editCategoryId ?? 'new'}
        open={formOpen}
        onOpenChange={setFormOpen}
        categoryId={editCategoryId}
      />
    </div>
  )
}

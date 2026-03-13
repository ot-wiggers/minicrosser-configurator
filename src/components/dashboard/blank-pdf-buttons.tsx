'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { db } from '@/modules/storage/db'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BlankPdfCatalogData } from '@/modules/pdf/blank-generator'

export function BlankPdfButtons() {
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const categories = useOfflineQuery(
    api.categories.listActive,
    {},
    async () => {
      const all = await db.categories.filter((c) => c.isActive).sortBy('sortOrder')
      return all.map((c) => ({ ...c, _id: c.id, imageUrl: null })) as any
    },
  )
  const allBaseModels = useOfflineQuery(
    api.baseModels.list,
    {},
    async () => {
      const all = await db.baseModels.toArray()
      return all.map((m) => ({ ...m, _id: m.id })) as any
    },
  )
  const allOptionGroups = useOfflineQuery(
    api.optionGroups.list,
    {},
    async () => {
      const all = await db.optionGroups.toArray()
      return all.map((g) => ({ ...g, _id: g.id })) as any
    },
  )
  const allOptions = useOfflineQuery(
    api.options.list,
    {},
    async () => {
      const all = await db.options.toArray()
      return all.map((o) => ({ ...o, _id: o.id })) as any
    },
  )
  const allSettings = useOfflineQuery(
    api.settings.list,
    {},
    async () => {
      return await db.settings.toArray() as any
    },
  )

  const logoStorageId = allSettings?.find((s: any) => s.key === 'logoStorageId')?.value as string | undefined
  const logoUrl = useQuery(
    api.files.getUrl,
    logoStorageId ? { storageId: logoStorageId as Id<'_storage'> } : 'skip',
  )

  const handleDownload = async (categoryId: string, categoryName: string, categoryImageUrl?: string | null) => {
    if (!allBaseModels || !allOptionGroups || !allOptions) {
      toast.error('Katalogdaten werden noch geladen...')
      return
    }

    setGeneratingId(categoryId)
    try {
      const { generateBlankFormPdf } = await import('@/modules/pdf/blank-generator')

      // Build catalog data filtered for this category
      const catalogData: BlankPdfCatalogData = {
        baseModels: allBaseModels
          .filter((m: any) => m.categoryId === categoryId)
          .map((m: any) => ({
            articleNo: m.articleNo,
            name: m.name,
            priceNet: m.priceNet,
            priceGross: m.priceGross,
            isActive: m.isActive,
            sortOrder: m.sortOrder,
          })),
        optionGroups: allOptionGroups.map((g: any) => ({
          _id: g._id,
          name: g.name,
          selectionType: g.selectionType,
          isActive: g.isActive,
          sortOrder: g.sortOrder,
          appliesTo: g.appliesTo ?? [],
        })),
        options: allOptions.map((o: any) => ({
          optionGroupId: o.optionGroupId,
          articleNo: o.articleNo,
          name: o.name,
          priceNet: o.priceNet,
          priceGross: o.priceGross,
          isDefault: o.isDefault ?? false,
          isActive: o.isActive,
          sortOrder: o.sortOrder,
        })),
      }

      // Fetch logo and build settings for PDF
      let logoBytesForBlank: Uint8Array | undefined
      if (logoUrl) {
        try {
          const res = await fetch(logoUrl)
          logoBytesForBlank = new Uint8Array(await res.arrayBuffer())
        } catch {
          // Offline — proceed without logo
        }
      }
      const settingsMap = allSettings
        ? Object.fromEntries(allSettings.map((s: any) => [s.key, s.value]))
        : undefined

      // Fetch category image
      let categoryImageBytes: Uint8Array | undefined
      if (categoryImageUrl) {
        try {
          const res = await fetch(categoryImageUrl)
          categoryImageBytes = new Uint8Array(await res.arrayBuffer())
        } catch {
          // Offline — proceed without category image
        }
      }

      const pdfBytes = await generateBlankFormPdf(categoryId, catalogData, logoBytesForBlank, settingsMap, categoryImageBytes)
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Blanko-${categoryName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Blanko-PDF fuer ${categoryName} heruntergeladen`)
    } catch (err) {
      toast.error('PDF-Erstellung fehlgeschlagen')
      console.error(err)
    } finally {
      setGeneratingId(null)
    }
  }

  if (!categories || categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat: any) => (
        <Button
          key={cat._id}
          variant="outline"
          disabled={generatingId === cat._id}
          onClick={() => handleDownload(cat._id, cat.name, cat.imageUrl)}
        >
          {generatingId === cat._id ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Blanko: {cat.name}
        </Button>
      ))}
    </div>
  )
}

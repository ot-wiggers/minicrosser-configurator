'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BlankPdfCatalogData } from '@/modules/pdf/blank-generator'

export function BlankPdfButtons() {
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const categories = useQuery(api.categories.listActive)
  const allBaseModels = useQuery(api.baseModels.list)
  const allOptionGroups = useQuery(api.optionGroups.list)
  const allOptions = useQuery(api.options.list)

  const handleDownload = async (categoryId: string, categoryName: string) => {
    if (!allBaseModels || !allOptionGroups || !allOptions) {
      toast.error('Katalogdaten werden noch geladen...')
      return
    }

    setGeneratingId(categoryId)
    try {
      const { generateBlankFormPdf } = await import('@/modules/pdf/blank-generator')

      // Build catalog data filtered for this category
      const catalogData: BlankPdfCatalogData = {
        baseModels: (allBaseModels as any[])
          .filter((m: any) => m.categoryId === categoryId)
          .map((m: any) => ({
            articleNo: m.articleNo,
            name: m.name,
            priceNet: m.priceNet,
            priceGross: m.priceGross,
            isActive: m.isActive,
            sortOrder: m.sortOrder,
          })),
        optionGroups: (allOptionGroups as any[]).map((g: any) => ({
          _id: g._id,
          name: g.name,
          selectionType: g.selectionType,
          isActive: g.isActive,
          sortOrder: g.sortOrder,
          appliesTo: g.appliesTo ?? [],
        })),
        options: (allOptions as any[]).map((o: any) => ({
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

      const pdfBytes = await generateBlankFormPdf(categoryId, catalogData)
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

  if (!categories || (categories as any[]).length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {(categories as any[]).map((cat: any) => (
        <Button
          key={cat._id}
          variant="outline"
          disabled={generatingId === cat._id}
          onClick={() => handleDownload(cat._id, cat.name)}
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

'use client'

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/modules/storage/db'
import { generateBlankFormPdf } from '@/modules/pdf/blank-generator'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function BlankPdfButtons() {
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  const categories = useLiveQuery(async () => {
    const all = await db.categories.orderBy('sortOrder').toArray()
    return all.filter((c) => c.isActive)
  })

  const handleDownload = async (categoryId: string, categoryName: string) => {
    setGeneratingId(categoryId)
    try {
      const pdfBytes = await generateBlankFormPdf(categoryId)
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Blanko-${categoryName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Blanko-PDF für ${categoryName} heruntergeladen`)
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
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant="outline"
          disabled={generatingId === cat.id}
          onClick={() => handleDownload(cat.id, cat.name)}
        >
          {generatingId === cat.id ? (
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

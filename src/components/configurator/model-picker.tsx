'use client'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useConfiguratorStore } from '@/modules/configurator'
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { useOfflineImage } from '@/hooks/use-offline-image'
import { db } from '@/modules/storage/db'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { Car } from 'lucide-react'

function ModelImage({ model }: { model: any }) {
  const imgSrc = useOfflineImage(model.imageUrl, model._id, 'baseModels')
  if (imgSrc) {
    return <img src={imgSrc} alt={model.name} className="h-full w-full object-contain" />
  }
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Car className="h-12 w-12 text-muted-foreground/40" />
    </div>
  )
}

export function ModelPicker() {
  const { selectedCategory, selectedBaseModelId, setBaseModel } = useConfiguratorStore()

  const models = useOfflineQuery(
    api.baseModels.listActiveByCategory,
    selectedCategory ? { categoryId: selectedCategory as Id<"categories"> } : 'skip',
    async () => {
      if (!selectedCategory) return []
      const all = await db.baseModels
        .where('categoryId').equals(selectedCategory)
        .and((m) => m.isActive)
        .sortBy('sortOrder')
      return all.map((m) => ({ ...m, _id: m.id, imageUrl: null }))
    },
  )

  if (!selectedCategory || !models) return null

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Basisfahrzeug wählen</h2>
      <p className="mb-6 text-muted-foreground">Wählen Sie das passende Modell</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {models.map((model) => (
          <Card
            key={model._id}
            className={cn(
              'cursor-pointer overflow-hidden transition-all hover:border-primary/50 hover:shadow-md',
              selectedBaseModelId === model._id && 'border-primary ring-2 ring-primary/20',
            )}
            onClick={() => setBaseModel(model._id)}
          >
            <div className="aspect-video bg-muted">
              <ModelImage model={model} />
            </div>
            <CardContent className="p-4">
              <p className="font-semibold">{model.name}</p>
              {model.description && (
                <div
                  className="mt-1 text-sm text-muted-foreground prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4"
                  dangerouslySetInnerHTML={{ __html: model.description }}
                />
              )}
              <p className="mt-2 text-lg font-bold text-primary">
                ab {formatCurrency(model.priceNet)}{' '}
                <span className="text-sm font-normal text-muted-foreground">netto</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

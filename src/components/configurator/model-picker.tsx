'use client'

import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useConfiguratorStore } from '@/modules/configurator'
import { db } from '@/modules/storage/db'
import type { BaseModelRecord } from '@/modules/catalog/db-types'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { Car } from 'lucide-react'

function useImageUrls(models: BaseModelRecord[] | undefined) {
  const urlMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!models) return map
    for (const m of models) {
      if (m.imageBlob) {
        map.set(m.id, URL.createObjectURL(m.imageBlob))
      }
    }
    return map
  }, [models])

  useEffect(() => {
    return () => {
      for (const url of urlMap.values()) {
        URL.revokeObjectURL(url)
      }
    }
  }, [urlMap])

  return urlMap
}

export function ModelPicker() {
  const { selectedCategory, selectedBaseModelId, setBaseModel } = useConfiguratorStore()

  const models = useLiveQuery(
    async (): Promise<BaseModelRecord[]> => {
      if (!selectedCategory) return []
      const all = await db.baseModels
        .where('categoryId')
        .equals(selectedCategory.toLowerCase())
        .sortBy('sortOrder')
      return all.filter((m) => m.isActive)
    },
    [selectedCategory],
  )

  const imageUrls = useImageUrls(models)

  if (!selectedCategory || !models) return null

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Basisfahrzeug wählen</h2>
      <p className="mb-6 text-muted-foreground">Wählen Sie das passende Modell</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {models.map((model) => {
          const imageUrl = imageUrls.get(model.id)
          return (
            <Card
              key={model.id}
              className={cn(
                'cursor-pointer overflow-hidden transition-all hover:border-primary/50 hover:shadow-md',
                selectedBaseModelId === model.id && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => setBaseModel(model.id)}
            >
              <div className="aspect-video bg-muted">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={model.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Car className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <p className="font-semibold">{model.name}</p>
                {model.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{model.description}</p>
                )}
                <p className="mt-2 text-lg font-bold text-primary">
                  ab {formatCurrency(model.priceNet)}{' '}
                  <span className="text-sm font-normal text-muted-foreground">netto</span>
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

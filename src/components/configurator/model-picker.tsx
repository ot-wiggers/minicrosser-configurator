'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useConfiguratorStore } from '@/modules/configurator'
import { db } from '@/modules/storage/db'
import type { BaseModelRecord } from '@/modules/catalog/db-types'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { Package } from 'lucide-react'

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

  if (!selectedCategory || !models) return null

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Basisfahrzeug wählen</h2>
      <p className="mb-6 text-muted-foreground">Wählen Sie das passende Modell</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {models.map((model) => (
          <Card
            key={model.id}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
              selectedBaseModelId === model.id && 'border-primary ring-2 ring-primary/20',
            )}
            onClick={() => setBaseModel(model.id)}
          >
            <CardContent className="flex items-start gap-4 p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Package className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">{model.name}</p>
                {model.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{model.description}</p>
                )}
                <p className="mt-2 text-lg font-bold text-primary">
                  {formatCurrency(model.priceNet)}{' '}
                  <span className="text-sm font-normal text-muted-foreground">netto</span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

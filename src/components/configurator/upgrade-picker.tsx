'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useConfiguratorStore } from '@/modules/configurator'
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { useOfflineImage } from '@/hooks/use-offline-image'
import { db } from '@/modules/storage/db'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { Check, Car } from 'lucide-react'

function UpgradeModelImage({ model }: { model: any }) {
  const imgSrc = useOfflineImage(model.imageUrl, model._id, 'baseModels')
  if (imgSrc) {
    return <img src={imgSrc} alt={model.name} className="h-16 w-16 rounded-md object-cover" />
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
      <Car className="h-8 w-8 text-muted-foreground/40" />
    </div>
  )
}

function UpgradeCard({ model, isSelected, onSelect }: { model: any; isSelected: boolean; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const descRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = descRef.current
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight + 1)
    }
  }, [model.description])

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        isSelected && 'border-primary ring-2 ring-primary/20',
      )}
      onClick={onSelect}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={cn(
            'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>
        <UpgradeModelImage model={model} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {model.upgradeLabel || model.name}
          </p>
          {model.description && (
            <>
              <div
                ref={descRef}
                className={cn(
                  'mt-0.5 text-sm text-muted-foreground',
                  !expanded && 'line-clamp-2',
                )}
                dangerouslySetInnerHTML={{ __html: model.description }}
              />
              {isTruncated && (
                <button
                  type="button"
                  className="mt-1 text-xs text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded((prev) => !prev)
                  }}
                >
                  {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                </button>
              )}
            </>
          )}
        </div>
        <p className="shrink-0 text-right font-semibold">
          {model.priceOnRequest ? (
            'a.A.'
          ) : (
            <>
              {formatCurrency(model.priceNet)}
              <span className="block text-xs font-normal text-muted-foreground">netto</span>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

export function UpgradePicker() {
  const { selectedCategory, selectedBaseModelId, setBaseModel } = useConfiguratorStore()

  const models = useOfflineQuery(
    api.baseModels.listActiveByCategory,
    selectedCategory ? { categoryId: selectedCategory as Id<'categories'> } : 'skip',
    async () => {
      if (!selectedCategory) return []
      const all = await db.baseModels
        .where('categoryId')
        .equals(selectedCategory)
        .and((m) => m.isActive)
        .sortBy('sortOrder')
      return all.map((m) => ({ ...m, _id: m.id, imageUrl: null }))
    },
  )

  if (!selectedCategory || !models || models.length <= 1) return null

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">Modell-Upgrade</h3>
      <div className="space-y-2">
        {models.map((model) => (
          <UpgradeCard
            key={model._id}
            model={model}
            isSelected={selectedBaseModelId === model._id}
            onSelect={() => setBaseModel(model._id)}
          />
        ))}
      </div>
    </div>
  )
}

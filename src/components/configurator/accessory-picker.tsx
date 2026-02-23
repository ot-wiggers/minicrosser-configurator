'use client'

import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useConfiguratorStore } from '@/modules/configurator'
import { db } from '@/modules/storage/db'
import type { OptionGroupRecord, OptionRecord } from '@/modules/catalog/db-types'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import { Check, Circle } from 'lucide-react'

function useOptionImageUrls(
  groupsWithOptions: { group: OptionGroupRecord; items: OptionRecord[] }[] | undefined,
) {
  const urlMap = useMemo(() => {
    const map = new Map<string, string>()
    if (!groupsWithOptions) return map
    for (const { items } of groupsWithOptions) {
      for (const item of items) {
        if (item.imageBlob) {
          map.set(item.id, URL.createObjectURL(item.imageBlob))
        }
      }
    }
    return map
  }, [groupsWithOptions])

  useEffect(() => {
    return () => {
      for (const url of urlMap.values()) {
        URL.revokeObjectURL(url)
      }
    }
  }, [urlMap])

  return urlMap
}

function OptionThumbnail({ url }: { url?: string }) {
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      className="h-12 w-12 shrink-0 rounded-md border object-cover"
    />
  )
}

function SingleGroup({
  group,
  items,
  imageUrls,
}: {
  group: OptionGroupRecord
  items: OptionRecord[]
  imageUrls: Map<string, string>
}) {
  const { selectedOptions, toggleOption, removeOption } = useConfiguratorStore()

  // Find current selection for this group
  const currentSelection = items.find((item) => selectedOptions[item.id])

  function handleSelect(item: OptionRecord) {
    // For SINGLE groups: deselect current, select new
    if (currentSelection && currentSelection.id !== item.id) {
      removeOption(currentSelection.id)
    }

    if (currentSelection?.id === item.id) {
      removeOption(item.id)
    } else {
      toggleOption({
        optionItemId: item.id,
        skuCode: item.skuCode,
        quantity: 1,
      })
    }
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{group.name}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const isSelected = !!selectedOptions[item.id]
          return (
            <Card
              key={item.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                isSelected && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => handleSelect(item)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                  )}
                >
                  {isSelected && <Circle className="h-2 w-2 fill-white text-white" />}
                </div>
                <OptionThumbnail url={imageUrls.get(item.id)} />
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <p className="font-semibold">
                  {item.priceNet > 0 ? formatCurrency(item.priceNet) : 'Inklusive'}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function MultiGroup({
  group,
  items,
  imageUrls,
}: {
  group: OptionGroupRecord
  items: OptionRecord[]
  imageUrls: Map<string, string>
}) {
  const { selectedOptions, toggleOption, setOptionQuantity } = useConfiguratorStore()

  function handleToggle(item: OptionRecord) {
    toggleOption({
      optionItemId: item.id,
      skuCode: item.skuCode,
      quantity: 1,
    })
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{group.name}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const isSelected = !!selectedOptions[item.id]
          return (
            <Card
              key={item.id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                isSelected && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => handleToggle(item)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <OptionThumbnail url={imageUrls.get(item.id)} />
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                {isSelected && (
                  <Input
                    type="number"
                    min={1}
                    value={selectedOptions[item.id]?.quantity ?? 1}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setOptionQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                )}
                <p className="font-semibold">{formatCurrency(item.priceNet)}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function AccessoryPicker() {
  const { selectedCategory } = useConfiguratorStore()

  const groupsWithOptions = useLiveQuery(
    async () => {
      if (!selectedCategory) return []
      const categoryId = selectedCategory.toLowerCase()
      const allGroups = await db.optionGroups.orderBy('sortOrder').toArray()
      const applicableGroups = allGroups.filter(
        (g) => g.isActive && (g.appliesTo.length === 0 || g.appliesTo.includes(categoryId)),
      )

      const result: { group: OptionGroupRecord; items: OptionRecord[] }[] = []
      for (const group of applicableGroups) {
        const items = await db.options
          .where('optionGroupId')
          .equals(group.id)
          .sortBy('sortOrder')
        result.push({ group, items: items.filter((o) => o.isActive) })
      }
      return result
    },
    [selectedCategory],
  )

  const imageUrls = useOptionImageUrls(groupsWithOptions)

  if (!selectedCategory || !groupsWithOptions) return null

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Zubehör & Optionen</h2>
      <p className="mb-6 text-muted-foreground">Passen Sie Ihr Fahrzeug individuell an</p>
      <div className="space-y-6">
        {groupsWithOptions.map(({ group, items }, idx) => (
          <div key={group.id}>
            {idx > 0 && <Separator className="mb-6" />}
            {group.selectionType === 'SINGLE' ? (
              <SingleGroup group={group} items={items} imageUrls={imageUrls} />
            ) : (
              <MultiGroup group={group} items={items} imageUrls={imageUrls} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

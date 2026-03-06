'use client'

import { api } from '../../../convex/_generated/api'
import { useConfiguratorStore } from '@/modules/configurator'
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { useOfflineImage } from '@/hooks/use-offline-image'
import { db } from '@/modules/storage/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import { Check, Circle } from 'lucide-react'
import { UpgradePicker } from './upgrade-picker'

function OptionThumbnail({ url, optionId }: { url?: string | null; optionId: string }) {
  const imgSrc = useOfflineImage(url ?? null, optionId, 'options')
  if (!imgSrc) return null
  return (
    <img
      src={imgSrc}
      alt=""
      className="h-12 w-12 shrink-0 rounded-md border object-cover"
    />
  )
}

function SingleGroup({
  group,
  items,
}: {
  group: any
  items: any[]
}) {
  const { selectedOptions, toggleOption, removeOption, setOptionInputValue } = useConfiguratorStore()

  // Find current selection for this group
  const currentSelection = items.find((item) => selectedOptions[item._id])

  function handleSelect(item: any) {
    // For SINGLE groups: deselect current, select new
    if (currentSelection && currentSelection._id !== item._id) {
      removeOption(currentSelection._id)
    }

    if (currentSelection?._id === item._id) {
      removeOption(item._id)
    } else {
      toggleOption({
        optionItemId: item._id,
        skuCode: item.skuCode,
        articleNo: item.articleNo,
        name: item.name,
        priceNet: item.priceNet,
        quantity: 1,
        priceOnRequest: item.priceOnRequest || undefined,
      })
    }
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{group.name}</h3>
      <div className="space-y-2">
        {items.map((item: any) => {
          const isSelected = !!selectedOptions[item._id]
          return (
            <Card
              key={item._id}
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
                <OptionThumbnail url={item.imageUrl} optionId={item._id} />
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <p className="font-semibold">
                  {item.priceOnRequest
                    ? 'a.A.'
                    : item.priceNet > 0
                      ? formatCurrency(item.priceNet)
                      : 'Inklusive'}
                </p>
              </CardContent>
              {isSelected && item.requiresInput?.enabled && (
                <div className="border-t px-4 pb-3 pt-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {item.requiresInput.label}
                  </label>
                  <Input
                    placeholder={item.requiresInput.label}
                    value={selectedOptions[item._id]?.inputValue ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setOptionInputValue(item._id, e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              )}
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
}: {
  group: any
  items: any[]
}) {
  const { selectedOptions, toggleOption, setOptionQuantity, setOptionInputValue } = useConfiguratorStore()

  function handleToggle(item: any) {
    toggleOption({
      optionItemId: item._id,
      skuCode: item.skuCode,
      articleNo: item.articleNo,
      name: item.name,
      priceNet: item.priceNet,
      quantity: 1,
      priceOnRequest: item.priceOnRequest || undefined,
    })
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{group.name}</h3>
      <div className="space-y-2">
        {items.map((item: any) => {
          const isSelected = !!selectedOptions[item._id]
          return (
            <Card
              key={item._id}
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
                <OptionThumbnail url={item.imageUrl} optionId={item._id} />
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
                    value={selectedOptions[item._id]?.quantity ?? 1}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setOptionQuantity(item._id, parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                )}
                <p className="font-semibold">
                  {item.priceOnRequest
                    ? 'a.A.'
                    : item.priceNet > 0
                      ? formatCurrency(item.priceNet)
                      : 'Inklusive'}
                </p>
              </CardContent>
              {isSelected && item.requiresInput?.enabled && (
                <div className="border-t px-4 pb-3 pt-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {item.requiresInput.label}
                  </label>
                  <Input
                    placeholder={item.requiresInput.label}
                    value={selectedOptions[item._id]?.inputValue ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setOptionInputValue(item._id, e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

interface AccessoryPickerProps {
  phase: 'VEHICLE_CONFIG' | 'ACCESSORY'
}

export function AccessoryPicker({ phase }: AccessoryPickerProps) {
  const { selectedCategory, selectedBaseModelId, setStep } = useConfiguratorStore()

  const groupsWithOptions = useOfflineQuery(
    api.optionGroups.listWithOptionsForCategory,
    selectedCategory ? { categoryId: selectedCategory, baseModelId: selectedBaseModelId ?? undefined } : 'skip',
    async () => {
      if (!selectedCategory) return []
      const groups = await db.optionGroups
        .filter((g) => g.isActive)
        .sortBy('sortOrder')
      const applicable = groups.filter(
        (g) => g.appliesTo.length === 0 || g.appliesTo.includes(selectedCategory),
      )
      const result = []
      for (const group of applicable) {
        const items = await db.options
          .where('optionGroupId').equals(group.id)
          .and((o) => o.isActive)
          .sortBy('sortOrder')
        result.push({
          group: { ...group, _id: group.id },
          items: items.map((o) => ({ ...o, _id: o.id, imageUrl: null })),
        })
      }
      return result
    },
  )

  const filteredGroups = groupsWithOptions?.filter(({ group }) => {
    const groupPhase = group.phase || 'ACCESSORY'
    return groupPhase === phase
  })

  if (!selectedCategory || !filteredGroups) return null

  const heading = phase === 'VEHICLE_CONFIG'
    ? 'Fahrzeug Konfiguration'
    : 'Zurüstung & Zubehör'
  const subheading = phase === 'VEHICLE_CONFIG'
    ? 'Wählen Sie Modell-Upgrade und Fahrzeugausstattung'
    : 'Passen Sie Ihr Fahrzeug individuell an'

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">{heading}</h2>
      <p className="mb-6 text-muted-foreground">{subheading}</p>
      <div className="space-y-6">
        {phase === 'VEHICLE_CONFIG' && <UpgradePicker />}
        {filteredGroups.map(({ group, items }, idx: number) => (
          <div key={group._id}>
            <Separator className="mb-6" />
            {group.selectionType === 'SINGLE' ? (
              <SingleGroup group={group} items={items} />
            ) : (
              <MultiGroup group={group} items={items} />
            )}
          </div>
        ))}
      </div>
      {phase === 'VEHICLE_CONFIG' && (
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setStep(2)}>
            Weiter zu Zurüstung & Zubehör
          </Button>
        </div>
      )}
    </div>
  )
}

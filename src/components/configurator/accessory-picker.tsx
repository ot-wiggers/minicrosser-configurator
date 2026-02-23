'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useConfiguratorStore } from '@/modules/configurator'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import { Check, Circle } from 'lucide-react'

function OptionThumbnail({ url }: { url?: string | null }) {
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
}: {
  group: any
  items: any[]
}) {
  const { selectedOptions, toggleOption, removeOption } = useConfiguratorStore()

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
                <OptionThumbnail url={item.imageUrl} />
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
}: {
  group: any
  items: any[]
}) {
  const { selectedOptions, toggleOption, setOptionQuantity } = useConfiguratorStore()

  function handleToggle(item: any) {
    toggleOption({
      optionItemId: item._id,
      skuCode: item.skuCode,
      articleNo: item.articleNo,
      name: item.name,
      priceNet: item.priceNet,
      quantity: 1,
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
                <OptionThumbnail url={item.imageUrl} />
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

  const groupsWithOptions = useQuery(
    api.optionGroups.listWithOptionsForCategory,
    selectedCategory ? { categoryId: selectedCategory } : 'skip',
  )

  if (!selectedCategory || !groupsWithOptions) return null

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Zubehör & Optionen</h2>
      <p className="mb-6 text-muted-foreground">Passen Sie Ihr Fahrzeug individuell an</p>
      <div className="space-y-6">
        {groupsWithOptions.map(({ group, items }, idx: number) => (
          <div key={group._id}>
            {idx > 0 && <Separator className="mb-6" />}
            {group.selectionType === 'SINGLE' ? (
              <SingleGroup group={group} items={items} />
            ) : (
              <MultiGroup group={group} items={items} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

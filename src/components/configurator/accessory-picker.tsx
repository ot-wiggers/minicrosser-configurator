'use client'

import { useConfiguratorStore } from '@/modules/configurator'
import {
  loadCatalog,
  getOptionGroupsForCategory,
  getOptionItemsForGroup,
  getSkuByCode,
} from '@/modules/catalog'
import type { OptionGroup, OptionItem } from '@/modules/catalog/types'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import { Check, Circle } from 'lucide-react'

function SingleGroup({
  group,
  items,
}: {
  group: OptionGroup
  items: OptionItem[]
}) {
  const { selectedOptions, toggleOption, removeOption } = useConfiguratorStore()
  const catalog = loadCatalog()

  // Find current selection for this group
  const currentSelection = items.find((item) => selectedOptions[item.id])

  function handleSelect(item: OptionItem) {
    const sku = getSkuByCode(catalog, item.sku_code)
    if (!sku) return

    // For SINGLE groups: deselect current, select new
    if (currentSelection && currentSelection.id !== item.id) {
      removeOption(currentSelection.id)
    }

    if (currentSelection?.id === item.id) {
      removeOption(item.id)
    } else {
      toggleOption({
        optionItemId: item.id,
        skuCode: item.sku_code,
        quantity: 1,
      })
    }
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{group.name}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const sku = getSkuByCode(catalog, item.sku_code)
          if (!sku) return null
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
                <div className="flex-1">
                  <p className="font-medium">{sku.name}</p>
                  {sku.description && (
                    <p className="text-sm text-muted-foreground">{sku.description}</p>
                  )}
                </div>
                <p className="font-semibold">
                  {sku.price_net > 0 ? formatCurrency(sku.price_net) : 'Inklusive'}
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
  group: OptionGroup
  items: OptionItem[]
}) {
  const { selectedOptions, toggleOption, setOptionQuantity } = useConfiguratorStore()
  const catalog = loadCatalog()

  function handleToggle(item: OptionItem) {
    const sku = getSkuByCode(catalog, item.sku_code)
    if (!sku) return
    toggleOption({
      optionItemId: item.id,
      skuCode: item.sku_code,
      quantity: 1,
    })
  }

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{group.name}</h3>
      <div className="space-y-2">
        {items.map((item) => {
          const sku = getSkuByCode(catalog, item.sku_code)
          if (!sku) return null
          const isSelected = !!selectedOptions[item.id]
          const isQty = group.selection_type === 'QTY'
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
                <div className="flex-1">
                  <p className="font-medium">{sku.name}</p>
                  {sku.description && (
                    <p className="text-sm text-muted-foreground">{sku.description}</p>
                  )}
                </div>
                {isQty && isSelected && (
                  <Input
                    type="number"
                    min={1}
                    value={selectedOptions[item.id]?.quantity ?? 1}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setOptionQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                )}
                <p className="font-semibold">{formatCurrency(sku.price_net)}</p>
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
  const catalog = loadCatalog()

  if (!selectedCategory) return null

  const groups = getOptionGroupsForCategory(catalog, selectedCategory)

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Zubehör & Optionen</h2>
      <p className="mb-6 text-muted-foreground">Passen Sie Ihr Fahrzeug individuell an</p>
      <div className="space-y-6">
        {groups.map((group, idx) => {
          const items = getOptionItemsForGroup(catalog, group.id)
          return (
            <div key={group.id}>
              {idx > 0 && <Separator className="mb-6" />}
              {group.selection_type === 'SINGLE' ? (
                <SingleGroup group={group} items={items} />
              ) : (
                <MultiGroup group={group} items={items} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

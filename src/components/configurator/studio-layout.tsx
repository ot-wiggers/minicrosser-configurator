'use client'

import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useConfiguratorStore } from '@/modules/configurator'
import { calculatePricingFromItems } from '@/modules/pricing'
import { cn, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Car, Check, Circle, Minus, Package, Plus } from 'lucide-react'
import { ViewToggle } from './view-toggle'

// ── Types ──────────────────────────────────────────────────
interface StudioLayoutProps {
  onCreateDocument: () => void
  onViewChange: (view: 'stepper' | 'studio') => void
}

// ── Color helpers ──────────────────────────────────────────
const ACCENT = '#ffcf00'
const PRIMARY_DARK = '#2b373d'

function isColorGroup(groupName: string): boolean {
  return /farbe|color/i.test(groupName)
}

// ── Product Image Panel (left) ─────────────────────────────
function ProductImagePanel({ baseModel }: { baseModel: any }) {
  if (!baseModel) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {baseModel.imageUrl ? (
          <img
            src={baseModel.imageUrl}
            alt={baseModel.name}
            className="h-full w-full object-cover transition-opacity duration-300"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Car className="h-20 w-20 text-muted-foreground/30" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Color Swatch Group ─────────────────────────────────────
function ColorSwatchGroup({ group, items }: { group: any; items: any[] }) {
  const { selectedOptions, toggleOption, removeOption } = useConfiguratorStore()
  const currentSelection = items.find((item) => selectedOptions[item._id])

  function handleSelect(item: any) {
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
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {group.name}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item: any) => {
          const isSelected = !!selectedOptions[item._id]
          return (
            <button
              key={item._id}
              className={cn(
                'relative flex items-center gap-2.5 rounded-lg border-2 p-2.5 text-left transition-all hover:shadow-sm',
                isSelected ? 'border-[#ffcf00] bg-[#ffcf00]/5' : 'border-border hover:border-border/80',
              )}
              onClick={() => handleSelect(item)}
            >
              {/* Color circle or thumbnail */}
              <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border bg-muted">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gray-400" />
                )}
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.priceNet > 0 ? `+ ${formatCurrency(item.priceNet)}` : 'Inklusive'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Single Option Group (radio-style cards) ────────────────
function SingleOptionGroup({ group, items }: { group: any; items: any[] }) {
  const { selectedOptions, toggleOption, removeOption } = useConfiguratorStore()
  const currentSelection = items.find((item) => selectedOptions[item._id])

  function handleSelect(item: any) {
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
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {group.name}
      </h3>
      <div className="space-y-2">
        {items.map((item: any) => {
          const isSelected = !!selectedOptions[item._id]
          return (
            <button
              key={item._id}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all hover:shadow-sm',
                isSelected ? 'border-[#ffcf00] bg-[#ffcf00]/5' : 'border-border hover:border-border/80',
              )}
              onClick={() => handleSelect(item)}
            >
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  isSelected ? 'border-[#ffcf00] bg-[#ffcf00]' : 'border-muted-foreground/30',
                )}
              >
                {isSelected && <Circle className="h-2 w-2 fill-white text-white" />}
              </div>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md border object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              <span className="shrink-0 text-sm font-semibold">
                {item.priceNet > 0 ? formatCurrency(item.priceNet) : 'Inklusive'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Multi Option Group (checkbox-style cards) ──────────────
function MultiOptionGroup({ group, items }: { group: any; items: any[] }) {
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
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {group.name}
      </h3>
      <div className="space-y-2">
        {items.map((item: any) => {
          const isSelected = !!selectedOptions[item._id]
          const qty = selectedOptions[item._id]?.quantity ?? 1
          return (
            <div
              key={item._id}
              className={cn(
                'flex items-center gap-3 rounded-lg border-2 p-3 transition-all',
                isSelected ? 'border-[#ffcf00] bg-[#ffcf00]/5' : 'border-border hover:border-border/80',
              )}
            >
              <button
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                  isSelected ? 'border-[#ffcf00] bg-[#ffcf00]' : 'border-muted-foreground/30',
                )}
                onClick={() => handleToggle(item)}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </button>
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-md border object-cover"
                />
              )}
              <button className="min-w-0 flex-1 text-left" onClick={() => handleToggle(item)}>
                <p className="font-medium">{item.name}</p>
                {item.description && (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                )}
              </button>
              {isSelected && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setOptionQuantity(item._id, Math.max(1, qty - 1))}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setOptionQuantity(item._id, parseInt(e.target.value) || 1)}
                    className="h-7 w-14 text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setOptionQuantity(item._id, qty + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <span className="shrink-0 text-sm font-semibold">
                {formatCurrency(item.priceNet)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Studio Layout ─────────────────────────────────────
export function StudioLayout({ onCreateDocument, onViewChange }: StudioLayoutProps) {
  const { documentType, selectedCategory, selectedBaseModelId, selectedOptions } =
    useConfiguratorStore()

  const baseModel = useQuery(
    api.baseModels.getById,
    selectedBaseModelId ? { id: selectedBaseModelId as Id<'baseModels'> } : 'skip',
  )

  const groupsWithOptions = useQuery(
    api.optionGroups.listWithOptionsForCategory,
    selectedCategory ? { categoryId: selectedCategory } : 'skip',
  )

  const pricing = useMemo(() => {
    if (!baseModel) return null
    const optionItems = Object.values(selectedOptions).map((opt) => ({
      skuCode: opt.skuCode,
      articleNo: opt.articleNo,
      name: opt.name,
      priceNet: opt.priceNet,
      quantity: opt.quantity || 1,
    }))
    return calculatePricingFromItems(baseModel, optionItems)
  }, [baseModel, selectedOptions])

  if (!baseModel || !groupsWithOptions) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
        <Package className="mr-2 h-5 w-5" />
        Laden...
      </div>
    )
  }

  const buttonLabel = documentType === 'QUOTE' ? 'Angebot erstellen' : 'Bestellung erstellen'

  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col">
      {/* Main content: image left, config right */}
      <div className="flex flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Left: Product image */}
        <div className="w-full lg:w-[58%]">
          <div className="sticky top-20">
            <ProductImagePanel baseModel={baseModel} />
          </div>
        </div>

        {/* Right: Configuration panel */}
        <div className="w-full lg:w-[42%]">
          {/* Model info header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">{baseModel.name}</h2>
            {baseModel.description && (
              <p className="mt-1 text-muted-foreground">{baseModel.description}</p>
            )}
            <p className="mt-2 text-xl font-bold" style={{ color: ACCENT }}>
              ab {formatCurrency(baseModel.priceNet)}{' '}
              <span className="text-sm font-normal text-muted-foreground">netto</span>
            </p>
          </div>

          <Separator className="mb-6" />

          {/* Option groups */}
          <div className="space-y-6">
            {groupsWithOptions.map(({ group, items }: { group: any; items: any[] }) => {
              if (isColorGroup(group.name) && group.selectionType === 'SINGLE') {
                return <ColorSwatchGroup key={group._id} group={group} items={items} />
              }
              if (group.selectionType === 'SINGLE') {
                return <SingleOptionGroup key={group._id} group={group} items={items} />
              }
              return <MultiOptionGroup key={group._id} group={group} items={items} />
            })}
          </div>
        </div>
      </div>

      {/* Sticky footer bar */}
      <div
        className="sticky bottom-0 -mx-4 mt-8 flex items-center justify-between gap-4 px-4 py-3 md:-mx-6 md:px-6 lg:rounded-t-xl"
        style={{ backgroundColor: PRIMARY_DARK }}
      >
        <ViewToggle view="studio" onViewChange={onViewChange} />

        <div className="flex items-center gap-6">
          {pricing && (
            <div className="text-right text-white">
              <p className="text-xs uppercase tracking-wider text-white/60">Gesamtpreis brutto</p>
              <p className="text-xl font-bold">{formatCurrency(pricing.totalGross)}</p>
            </div>
          )}
          <Button
            size="lg"
            className="font-bold"
            style={{ backgroundColor: ACCENT, color: PRIMARY_DARK }}
            onClick={onCreateDocument}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

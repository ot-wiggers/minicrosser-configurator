'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useConfiguratorStore } from '@/modules/configurator'
import { calculatePricingFromItems } from '@/modules/pricing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart } from 'lucide-react'
import { useMemo } from 'react'

interface CartSidebarProps {
  onCreateDocument: () => void
}

export function CartSidebar({ onCreateDocument }: CartSidebarProps) {
  const { documentType, selectedBaseModelId, selectedOptions } = useConfiguratorStore()

  const baseModel = useQuery(
    api.baseModels.getById,
    selectedBaseModelId ? { id: selectedBaseModelId as Id<"baseModels"> } : 'skip',
  )

  // Calculate pricing from store data (selectedOptions already contains pricing info)
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

  if (!pricing) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
          <ShoppingCart className="mb-3 h-8 w-8" />
          <p className="text-sm">Bitte wählen Sie ein Basisfahrzeug</p>
        </CardContent>
      </Card>
    )
  }

  const buttonLabel = documentType === 'QUOTE' ? 'Angebot erstellen' : 'Bestellung erstellen'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5" />
          Zusammenfassung
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pricing.lineItems.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="flex-1">
              {item.name}
              {item.quantity > 1 && ` x${item.quantity}`}
            </span>
            <span className="font-medium">{formatCurrency(item.totalNet)}</span>
          </div>
        ))}

        <Separator />

        <div className="flex justify-between text-sm">
          <span>Netto</span>
          <span className="font-medium">{formatCurrency(pricing.totalNet)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>MwSt. 19%</span>
          <span>{formatCurrency(pricing.vatAmount)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-base font-bold">
          <span>Brutto</span>
          <span className="text-primary">{formatCurrency(pricing.totalGross)}</span>
        </div>

        <Button className="mt-4 w-full" size="lg" onClick={onCreateDocument}>
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

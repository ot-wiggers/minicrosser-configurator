'use client'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useConfiguratorStore } from '@/modules/configurator'
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { db } from '@/modules/storage/db'
import { calculatePricingFromItems } from '@/modules/pricing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ShoppingCart, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

interface CartSidebarProps {
  onCreateDocument: () => void
}

export function CartSidebar({ onCreateDocument }: CartSidebarProps) {
  const { documentType, selectedBaseModelId, selectedOptions, customLineItems, addCustomLineItem, removeCustomLineItem } = useConfiguratorStore()

  const baseModel = useOfflineQuery(
    api.baseModels.getById,
    selectedBaseModelId ? { id: selectedBaseModelId as Id<"baseModels"> } : 'skip',
    async () => {
      if (!selectedBaseModelId) return null
      const m = await db.baseModels.get(selectedBaseModelId)
      if (!m) return null
      return { ...m, _id: m.id, imageUrl: null }
    },
  )

  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customSku, setCustomSku] = useState('')
  const [customArticleNo, setCustomArticleNo] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customQty, setCustomQty] = useState('1')

  function handleAddCustomItem() {
    const price = parseFloat(customPrice)
    if (!customName.trim() || isNaN(price)) return
    addCustomLineItem({
      name: customName.trim(),
      skuCode: customSku.trim() || undefined,
      articleNo: customArticleNo.trim() || undefined,
      priceNet: price,
      quantity: parseInt(customQty) || 1,
    })
    setCustomName('')
    setCustomSku('')
    setCustomArticleNo('')
    setCustomPrice('')
    setCustomQty('1')
    setShowCustomForm(false)
  }

  // Calculate pricing from store data (selectedOptions already contains pricing info)
  const pricing = useMemo(() => {
    if (!baseModel) return null

    const optionItems = Object.values(selectedOptions).map((opt) => ({
      skuCode: opt.skuCode,
      articleNo: opt.articleNo,
      name: opt.name,
      priceNet: opt.priceNet,
      quantity: opt.quantity || 1,
      priceOnRequest: opt.priceOnRequest,
    }))

    const customItems = customLineItems.map((item) => ({
      skuCode: item.skuCode || '',
      articleNo: item.articleNo || '',
      name: item.name,
      priceNet: item.priceNet,
      quantity: item.quantity,
    }))

    return calculatePricingFromItems(baseModel, [...optionItems, ...customItems])
  }, [baseModel, selectedOptions, customLineItems])

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
            <span className="font-medium">
              {item.priceOnRequest ? 'a.A.' : formatCurrency(item.totalNet)}
            </span>
          </div>
        ))}

        {/* Custom line items */}
        {customLineItems.length > 0 && (
          <>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground">Individuelle Positionen</p>
            {customLineItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="flex-1">
                  {item.name}
                  {item.quantity > 1 && ` x${item.quantity}`}
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{formatCurrency(item.priceNet * item.quantity)}</span>
                  <button
                    onClick={() => removeCustomLineItem(item.id)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Add custom line item */}
        {showCustomForm ? (
          <div className="space-y-2 rounded-md border p-3">
            <Input
              placeholder="Bezeichnung *"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="h-8 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="SKU (optional)"
                value={customSku}
                onChange={(e) => setCustomSku(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Art.-Nr. (optional)"
                value={customArticleNo}
                onChange={(e) => setCustomArticleNo(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Netto-Preis *"
                type="number"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Menge"
                type="number"
                min="1"
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleAddCustomItem}>
                Hinzufügen
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCustomForm(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowCustomForm(true)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Individuelle Position
          </Button>
        )}

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
        {pricing.hasOnRequestItems && (
          <p className="text-xs text-muted-foreground">* zzgl. Positionen auf Anfrage</p>
        )}

        <Button className="mt-4 w-full" size="lg" onClick={onCreateDocument}>
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  )
}

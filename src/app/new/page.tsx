'use client'

import { useState } from 'react'
import { useConfiguratorStore } from '@/modules/configurator'
import { Stepper } from '@/components/configurator/stepper'
import { CategoryPicker } from '@/components/configurator/category-picker'
import { ModelPicker } from '@/components/configurator/model-picker'
import { AccessoryPicker } from '@/components/configurator/accessory-picker'
import { CartSidebar } from '@/components/configurator/cart-sidebar'
import { CustomerFormDialog } from '@/components/configurator/customer-form-dialog'

export default function ConfiguratorPage() {
  const { currentStep, documentType } = useConfiguratorStore()
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)

  const title = documentType === 'QUOTE' ? 'Neues Angebot' : 'Neue Bestellung'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>

      <Stepper />

      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          {currentStep === 0 && <CategoryPicker />}
          {currentStep === 1 && <ModelPicker />}
          {currentStep === 2 && <AccessoryPicker />}
        </div>

        {currentStep >= 1 && (
          <div className="w-full lg:w-80">
            <div className="sticky top-20">
              <CartSidebar onCreateDocument={() => setShowCustomerDialog(true)} />
            </div>
          </div>
        )}
      </div>

      <CustomerFormDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
      />
    </div>
  )
}

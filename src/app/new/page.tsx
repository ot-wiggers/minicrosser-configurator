'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useConfiguratorStore } from '@/modules/configurator'
import { Stepper } from '@/components/configurator/stepper'
import { CategoryPicker } from '@/components/configurator/category-picker'
import { ModelPicker } from '@/components/configurator/model-picker'
import { AccessoryPicker } from '@/components/configurator/accessory-picker'
import { CartSidebar } from '@/components/configurator/cart-sidebar'
import { CustomerFormDialog } from '@/components/configurator/customer-form-dialog'
import { StudioLayout } from '@/components/configurator/studio-layout'
import { ViewToggle } from '@/components/configurator/view-toggle'

const STORAGE_KEY = 'configuratorView'

export default function ConfiguratorPage() {
  const { currentStep, documentType } = useConfiguratorStore()
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const searchParams = useSearchParams()

  const [view, setView] = useState<'stepper' | 'studio'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'studio' || stored === 'stepper') return stored
    }
    return 'stepper'
  })

  // Check URL param on mount
  useEffect(() => {
    const urlView = searchParams.get('view')
    if (urlView === 'studio' || urlView === 'stepper') {
      setView(urlView)
      localStorage.setItem(STORAGE_KEY, urlView)
    }
  }, [searchParams])

  function handleViewChange(newView: 'stepper' | 'studio') {
    setView(newView)
    localStorage.setItem(STORAGE_KEY, newView)
  }

  // Studio only available after model is selected
  const canShowStudio = currentStep >= 2
  const showStudio = view === 'studio' && canShowStudio

  const title = documentType === 'QUOTE' ? 'Neues Angebot' : 'Neue Bestellung'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {canShowStudio && (
          <ViewToggle view={view} onViewChange={handleViewChange} />
        )}
      </div>

      {showStudio ? (
        <StudioLayout
          onCreateDocument={() => setShowCustomerDialog(true)}
          onViewChange={handleViewChange}
        />
      ) : (
        <>
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
        </>
      )}

      <CustomerFormDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
      />
    </div>
  )
}

'use client'

import { useCatalogInit } from '@/modules/catalog/use-catalog-init'

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const { isReady, error } = useCatalogInit()

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Fehler beim Laden des Katalogs: {error}</p>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Katalog wird geladen...</p>
      </div>
    )
  }

  return <>{children}</>
}

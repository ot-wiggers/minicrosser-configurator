'use client'

import { useEffect, useState } from 'react'
import { migrateCatalogToDb } from './migration'

export function useCatalogInit() {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    migrateCatalogToDb()
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Catalog migration failed:', err)
        setError(err.message)
      })
  }, [])

  return { isReady, error }
}

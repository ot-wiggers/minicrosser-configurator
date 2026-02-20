import type { Catalog } from './types'
import catalogData from '@/data/catalog.json'

let cachedCatalog: Catalog | null = null

export function loadCatalog(): Catalog {
  if (!cachedCatalog) {
    cachedCatalog = catalogData as Catalog
  }
  return cachedCatalog
}

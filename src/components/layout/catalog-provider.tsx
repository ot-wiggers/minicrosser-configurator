'use client'

/**
 * CatalogProvider — previously blocked rendering until Dexie was seeded from catalog.json.
 * With Convex as the source of truth, this is now a simple passthrough.
 * Kept for compatibility; will be removed in Phase 8 cleanup.
 */
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

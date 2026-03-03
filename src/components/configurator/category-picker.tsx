'use client'

import { api } from '../../../convex/_generated/api'
import { useConfiguratorStore } from '@/modules/configurator'
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { useOfflineImage } from '@/hooks/use-offline-image'
import { db } from '@/modules/storage/db'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Bike, Car, Weight, Home, type LucideIcon, Package } from 'lucide-react'

// Map category names to icons for visual flair
const ICON_MAP: Record<string, LucideIcon> = {
  dreirad: Bike,
  trike: Bike,
  vierrad: Car,
  quad: Car,
  'heavy-duty': Weight,
  hd: Weight,
  kabine: Home,
  cabin: Home,
}

function getIconForCategory(name: string): LucideIcon {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon
  }
  return Package
}

function CategoryImage({ cat, fallbackIcon }: { cat: any; fallbackIcon: React.ReactNode }) {
  const imgSrc = useOfflineImage(cat.imageUrl, cat._id, 'categories')
  if (imgSrc) {
    return <img src={imgSrc} alt={cat.name} className="h-10 w-10 rounded object-cover" />
  }
  return <>{fallbackIcon}</>
}

export function CategoryPicker() {
  const { selectedCategory, setCategoryWithDefaultModel } = useConfiguratorStore()

  const allModels = useOfflineQuery(
    api.baseModels.list,
    {},
    async () => {
      const all = await db.baseModels.toArray()
      return all.map((m) => ({ ...m, _id: m.id, imageUrl: null }))
    },
  )

  const categories = useOfflineQuery(
    api.categories.listActive,
    {},
    async () => {
      const all = await db.categories.filter((c) => c.isActive).sortBy('sortOrder')
      return all.map((c) => ({ ...c, _id: c.id, imageUrl: null }))
    },
  )

  if (!categories) {
    return (
      <div>
        <h2 className="mb-2 text-xl font-semibold">Kategorie wählen</h2>
        <p className="text-muted-foreground">Lade Kategorien...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Kategorie wählen</h2>
      <p className="mb-6 text-muted-foreground">Welcher Fahrzeugtyp passt am besten?</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((cat) => {
          const Icon = getIconForCategory(cat.name)
          return (
            <Card
              key={cat._id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
                selectedCategory === cat._id && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => {
                const defaultModel = allModels?.find(
                  (m) => m.categoryId === cat._id && m.isDefault && m.isActive,
                )
                setCategoryWithDefaultModel(cat._id, defaultModel?._id ?? null)
              }}
            >
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <CategoryImage cat={cat} fallbackIcon={<Icon className="h-10 w-10 text-primary" />} />
                <div>
                  <p className="font-semibold">{cat.name}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

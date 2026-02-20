'use client'

import { useConfiguratorStore } from '@/modules/configurator'
import type { VariantCategory } from '@/modules/catalog/types'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Bike, Car, Weight, Home } from 'lucide-react'

const categories: {
  value: VariantCategory
  label: string
  description: string
  icon: typeof Bike
}[] = [
  { value: 'TRIKE', label: 'Dreirad', description: 'Wendig und kompakt', icon: Bike },
  { value: 'QUAD', label: 'Vierrad', description: 'Stabil für jedes Gelände', icon: Car },
  { value: 'HD', label: 'Heavy-Duty', description: 'Bis 300 kg Belastung', icon: Weight },
  { value: 'CABIN', label: 'Kabine', description: 'Wetterfest und geschützt', icon: Home },
]

export function CategoryPicker() {
  const { selectedCategory, setCategory } = useConfiguratorStore()

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">Kategorie wählen</h2>
      <p className="mb-6 text-muted-foreground">Welcher Fahrzeugtyp passt am besten?</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {categories.map((cat) => (
          <Card
            key={cat.value}
            className={cn(
              'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
              selectedCategory === cat.value && 'border-primary ring-2 ring-primary/20',
            )}
            onClick={() => setCategory(cat.value)}
          >
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <cat.icon className="h-10 w-10 text-primary" />
              <div>
                <p className="font-semibold">{cat.label}</p>
                <p className="text-sm text-muted-foreground">{cat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/modules/storage/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, Car, Layers, ListChecks } from 'lucide-react'

export default function AdminDashboard() {
  const categoryCount = useLiveQuery(() => db.categories.count())
  const modelCount = useLiveQuery(() => db.baseModels.count())
  const groupCount = useLiveQuery(() => db.optionGroups.count())
  const optionCount = useLiveQuery(() => db.options.count())

  const stats = [
    { label: 'Kategorien', value: categoryCount, icon: FolderOpen },
    { label: 'Modelle', value: modelCount, icon: Car },
    { label: 'Optionsgruppen', value: groupCount, icon: Layers },
    { label: 'Optionen', value: optionCount, icon: ListChecks },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value ?? '...'}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

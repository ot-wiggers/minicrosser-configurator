'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, Car, Layers, ListChecks } from 'lucide-react'

export default function AdminDashboard() {
  const categories = useQuery(api.categories.list)
  const models = useQuery(api.baseModels.list)
  const groups = useQuery(api.optionGroups.list)
  const options = useQuery(api.options.list)

  const stats = [
    { label: 'Kategorien', value: categories?.length, icon: FolderOpen },
    { label: 'Modelle', value: models?.length, icon: Car },
    { label: 'Optionsgruppen', value: groups?.length, icon: Layers },
    { label: 'Optionen', value: options?.length, icon: ListChecks },
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

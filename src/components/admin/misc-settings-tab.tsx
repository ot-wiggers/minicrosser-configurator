'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { RefreshCw, Upload, Download, Loader2 } from 'lucide-react'

export function MiscSettingsTab() {
  const [syncing, setSyncing] = useState<'to-prod' | 'to-dev' | null>(null)

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? ''
  const isDev = convexUrl.includes('.cloud/dev') || convexUrl.includes('localhost')
  const environmentLabel = isDev ? 'Development' : 'Production'

  async function handleSync(direction: 'to-prod' | 'to-dev') {
    setSyncing(direction)
    try {
      // TODO: Implement Convex export/import sync
      // This will use the Convex CLI or HTTP API to:
      // 1. Export data from source environment
      // 2. Import data to target environment
      toast.info('Synchronisation wird in einer zukünftigen Version implementiert.')
    } catch {
      toast.error('Synchronisation fehlgeschlagen.')
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Convex Synchronisation
          </CardTitle>
          <CardDescription>
            Daten zwischen Development und Production synchronisieren.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Aktuelle Umgebung:</span>
            <Badge variant={isDev ? 'secondary' : 'default'}>{environmentLabel}</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => handleSync('to-prod')}
              disabled={syncing !== null}
            >
              {syncing === 'to-prod' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Dev nach Prod übertragen
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSync('to-dev')}
              disabled={syncing !== null}
            >
              {syncing === 'to-dev' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Prod nach Dev übertragen
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Achtung: Beim Kopieren werden bestehende Daten in der Zielumgebung überschrieben.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

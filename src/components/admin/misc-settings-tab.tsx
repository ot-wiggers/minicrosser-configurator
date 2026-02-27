'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { RefreshCw, Upload, Download, Loader2, CheckCircle2, XCircle, Info } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { syncEnvironments, type SyncResult } from '@/app/admin/actions/sync'
import { useAuthStore } from '@/modules/auth/auth-store'

type SyncDirection = 'to-prod' | 'to-dev'

export function MiscSettingsTab() {
  const [syncing, setSyncing] = useState<SyncDirection | null>(null)
  const [confirmDirection, setConfirmDirection] = useState<SyncDirection | null>(null)
  const [result, setResult] = useState<SyncResult | null>(null)
  const token = useAuthStore((s) => s.token)

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? ''
  const isDev = convexUrl.includes('energetic-dachshund')
  const environmentLabel = isDev ? 'Development' : 'Production'

  async function handleSync(direction: SyncDirection) {
    setConfirmDirection(null)
    setResult(null)
    setSyncing(direction)

    try {
      if (!token) {
        toast.error('Nicht angemeldet. Bitte erneut einloggen.')
        return
      }

      const syncResult = await syncEnvironments(direction, token)

      if (syncResult.success) {
        toast.success('Synchronisation erfolgreich abgeschlossen.')
      } else {
        toast.error(syncResult.error ?? 'Synchronisation fehlgeschlagen.')
      }

      setResult(syncResult)
    } catch {
      toast.error('Synchronisation fehlgeschlagen.')
    } finally {
      setSyncing(null)
    }
  }

  const directionLabels: Record<SyncDirection, { label: string; source: string; target: string }> = {
    'to-prod': { label: 'Dev nach Prod', source: 'Development', target: 'Production' },
    'to-dev': { label: 'Prod nach Dev', source: 'Production', target: 'Development' },
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
            Katalogdaten und Einstellungen zwischen Development und Production synchronisieren.
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
              onClick={() => setConfirmDirection('to-prod')}
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
              onClick={() => setConfirmDirection('to-dev')}
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

          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="text-xs text-blue-800 dark:text-blue-300">
                <p className="font-medium">Was wird synchronisiert:</p>
                <p>Kategorien, Modelle, Optionsgruppen, Optionen und Einstellungen.</p>
                <p className="mt-1 font-medium">Was wird NICHT synchronisiert:</p>
                <p>Benutzer, Dokumente, Kunden und Bilder.</p>
              </div>
            </div>
          </div>

          {/* Sync result display */}
          {result && (
            <div
              className={`rounded-md border p-4 ${
                result.success
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                  : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="font-medium text-sm">
                  {result.success ? 'Synchronisation erfolgreich' : 'Synchronisation fehlgeschlagen'}
                </span>
              </div>

              {result.success && result.catalog && (
                <div className="space-y-1 text-xs">
                  <SyncResultRow label="Kategorien" data={result.catalog.categories} />
                  <SyncResultRow label="Optionsgruppen" data={result.catalog.optionGroups} />
                  <SyncResultRow label="Modelle" data={result.catalog.baseModels} />
                  <SyncResultRow label="Optionen" data={result.catalog.options} />
                  {result.settingsCount !== undefined && (
                    <p className="text-green-800 dark:text-green-300">
                      Einstellungen: {result.settingsCount} synchronisiert
                    </p>
                  )}
                  {result.catalog.errors.length > 0 && (
                    <div className="mt-2 text-amber-700 dark:text-amber-400">
                      <p className="font-medium">Warnungen ({result.catalog.errors.length}):</p>
                      {result.catalog.errors.slice(0, 5).map((err, i) => (
                        <p key={i}>
                          {err.entity} &quot;{err.name}&quot;: {err.message}
                        </p>
                      ))}
                      {result.catalog.errors.length > 5 && (
                        <p>... und {result.catalog.errors.length - 5} weitere</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!result.success && result.error && (
                <p className="text-xs text-red-700 dark:text-red-300">{result.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDirection !== null} onOpenChange={(open) => !open && setConfirmDirection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Synchronisation bestätigen</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Daten werden von <strong>{confirmDirection ? directionLabels[confirmDirection].source : ''}</strong> nach{' '}
                  <strong>{confirmDirection ? directionLabels[confirmDirection].target : ''}</strong> kopiert.
                </p>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Bestehende Katalogdaten und Einstellungen in der Zielumgebung werden überschrieben!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => confirmDirection && handleSync(confirmDirection)}
            >
              Ja, synchronisieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SyncResultRow({ label, data }: { label: string; data: { created: number; updated: number } }) {
  return (
    <p className="text-green-800 dark:text-green-300">
      {label}: {data.created} neu, {data.updated} aktualisiert
    </p>
  )
}

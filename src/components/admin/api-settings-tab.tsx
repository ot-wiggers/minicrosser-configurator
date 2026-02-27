'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

const API_SETTING_KEYS = [
  'resendApiKey',
  'resendFromEmail',
  'resendFromName',
  'brevoApiKey',
  'brevoFromEmail',
  'brevoFromName',
] as const

type ApiSettingKey = (typeof API_SETTING_KEYS)[number]

export function ApiSettingsTab() {
  const settings = useQuery(api.settings.list)
  const setMany = useMutation(api.settings.setMany)

  const [values, setValues] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings && !initialized) {
      const map: Record<string, string> = {}
      for (const rec of settings) {
        if (API_SETTING_KEYS.includes(rec.key as ApiSettingKey)) {
          map[rec.key] = String(rec.value)
        }
      }
      setValues(map)
      setInitialized(true)
    }
  }, [settings, initialized])

  function update(key: ApiSettingKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const entries = API_SETTING_KEYS.map((key) => ({
        key,
        value: values[key] ?? '',
      }))
      await setMany({ entries })
      toast.success('API-Einstellungen gespeichert.')
    } catch {
      toast.error('Fehler beim Speichern.')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
    return <p className="text-sm text-muted-foreground">Lade Einstellungen...</p>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resend</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="resendApiKey">API-Key</Label>
            <Input
              id="resendApiKey"
              type="password"
              value={values.resendApiKey ?? ''}
              onChange={(e) => update('resendApiKey', e.target.value)}
              placeholder="re_..."
            />
          </div>
          <div>
            <Label htmlFor="resendFromEmail">Absender E-Mail</Label>
            <Input
              id="resendFromEmail"
              type="email"
              value={values.resendFromEmail ?? ''}
              onChange={(e) => update('resendFromEmail', e.target.value)}
              placeholder="noreply@minicrosser.info"
            />
          </div>
          <div>
            <Label htmlFor="resendFromName">Absender Name</Label>
            <Input
              id="resendFromName"
              value={values.resendFromName ?? ''}
              onChange={(e) => update('resendFromName', e.target.value)}
              placeholder="Mini Crosser"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brevo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="brevoApiKey">API-Key</Label>
            <Input
              id="brevoApiKey"
              type="password"
              value={values.brevoApiKey ?? ''}
              onChange={(e) => update('brevoApiKey', e.target.value)}
              placeholder="xkeysib-..."
            />
          </div>
          <div>
            <Label htmlFor="brevoFromEmail">Absender E-Mail</Label>
            <Input
              id="brevoFromEmail"
              type="email"
              value={values.brevoFromEmail ?? ''}
              onChange={(e) => update('brevoFromEmail', e.target.value)}
              placeholder="noreply@minicrosser.info"
            />
          </div>
          <div>
            <Label htmlFor="brevoFromName">Absender Name</Label>
            <Input
              id="brevoFromName"
              value={values.brevoFromName ?? ''}
              onChange={(e) => update('brevoFromName', e.target.value)}
              placeholder="Mini Crosser"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Speichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}

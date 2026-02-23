'use client'

import { useEffect, useState } from 'react'
import { settingsRepo } from '@/modules/storage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

const SETTING_KEYS = [
  'companyName',
  'companyStreet',
  'companyZip',
  'companyCity',
  'companyPhone',
  'companyFax',
  'companyEmail',
  'companyWeb',
  'vatRate',
  'pdfColorPrimary',
  'pdfColorAccent',
  'bankName1',
  'bankIban1',
  'bankBic1',
] as const

type SettingKey = (typeof SETTING_KEYS)[number]

export function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const all = await settingsRepo.getAll()
        const map: Record<string, string> = {}
        for (const rec of all) {
          map[rec.key] = String(rec.value)
        }
        // Convert stored decimal vatRate to percentage for display
        if (map.vatRate !== undefined) {
          const decimal = parseFloat(map.vatRate)
          if (!isNaN(decimal)) {
            map.vatRate = String(Math.round(decimal * 100))
          }
        }
        setValues(map)
      } catch {
        toast.error('Einstellungen konnten nicht geladen werden.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function update(key: SettingKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      for (const key of SETTING_KEYS) {
        const raw = values[key] ?? ''
        if (key === 'vatRate') {
          // Store as decimal (e.g. 19 -> 0.19)
          const pct = parseFloat(raw)
          await settingsRepo.set(key, isNaN(pct) ? 0 : pct / 100)
        } else {
          await settingsRepo.set(key, raw)
        }
      }
      toast.success('Einstellungen gespeichert.')
    } catch {
      toast.error('Fehler beim Speichern der Einstellungen.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade Einstellungen...</p>
  }

  return (
    <div className="space-y-6">
      {/* ---- Firma ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Firma</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="companyName">Firmenname</Label>
            <Input
              id="companyName"
              value={values.companyName ?? ''}
              onChange={(e) => update('companyName', e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="companyStreet">Strasse</Label>
            <Input
              id="companyStreet"
              value={values.companyStreet ?? ''}
              onChange={(e) => update('companyStreet', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="companyZip">PLZ</Label>
            <Input
              id="companyZip"
              value={values.companyZip ?? ''}
              onChange={(e) => update('companyZip', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="companyCity">Ort</Label>
            <Input
              id="companyCity"
              value={values.companyCity ?? ''}
              onChange={(e) => update('companyCity', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="companyPhone">Telefon</Label>
            <Input
              id="companyPhone"
              type="tel"
              value={values.companyPhone ?? ''}
              onChange={(e) => update('companyPhone', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="companyFax">Fax</Label>
            <Input
              id="companyFax"
              type="tel"
              value={values.companyFax ?? ''}
              onChange={(e) => update('companyFax', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="companyEmail">E-Mail</Label>
            <Input
              id="companyEmail"
              type="email"
              value={values.companyEmail ?? ''}
              onChange={(e) => update('companyEmail', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="companyWeb">Webseite</Label>
            <Input
              id="companyWeb"
              type="url"
              value={values.companyWeb ?? ''}
              onChange={(e) => update('companyWeb', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ---- Steuern ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Steuern</CardTitle>
        </CardHeader>
        <CardContent className="max-w-xs">
          <Label htmlFor="vatRate">MwSt-Satz (%)</Label>
          <Input
            id="vatRate"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={values.vatRate ?? ''}
            onChange={(e) => update('vatRate', e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Wird als Dezimalzahl gespeichert (z.B. 19 % = 0.19)
          </p>
        </CardContent>
      </Card>

      {/* ---- PDF-Design ---- */}
      <Card>
        <CardHeader>
          <CardTitle>PDF-Design</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pdfColorPrimary">Primärfarbe</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="pdfColorPrimaryPicker"
                value={values.pdfColorPrimary || '#000000'}
                onChange={(e) => update('pdfColorPrimary', e.target.value)}
                className="h-10 w-10 shrink-0 cursor-pointer rounded border p-0.5"
              />
              <Input
                id="pdfColorPrimary"
                value={values.pdfColorPrimary ?? ''}
                placeholder="#000000"
                onChange={(e) => update('pdfColorPrimary', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pdfColorAccent">Akzentfarbe</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="pdfColorAccentPicker"
                value={values.pdfColorAccent || '#000000'}
                onChange={(e) => update('pdfColorAccent', e.target.value)}
                className="h-10 w-10 shrink-0 cursor-pointer rounded border p-0.5"
              />
              <Input
                id="pdfColorAccent"
                value={values.pdfColorAccent ?? ''}
                placeholder="#000000"
                onChange={(e) => update('pdfColorAccent', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Bank ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Bank</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="bankName1">Bankname</Label>
            <Input
              id="bankName1"
              value={values.bankName1 ?? ''}
              onChange={(e) => update('bankName1', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bankIban1">IBAN</Label>
            <Input
              id="bankIban1"
              value={values.bankIban1 ?? ''}
              onChange={(e) => update('bankIban1', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="bankBic1">BIC</Label>
            <Input
              id="bankBic1"
              value={values.bankBic1 ?? ''}
              onChange={(e) => update('bankBic1', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Speichert...' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}

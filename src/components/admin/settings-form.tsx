'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PdfPreview } from '@/components/admin/pdf-preview'
import { toast } from 'sonner'
import { Save, ChevronDown } from 'lucide-react'

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
  // Extended PDF settings
  'pdfFontSizeBody',
  'pdfFontSizeHeading',
  'pdfFontSizeFooter',
  'pdfHeaderHeight',
  'pdfAccentStripeWidth',
  'pdfMarginTop',
  'pdfMarginBottom',
  'pdfMarginLeft',
  'pdfMarginRight',
  'pdfHeaderLine1',
  'pdfHeaderLine2',
  'pdfHeaderLine3',
  'pdfSlogan',
] as const

type SettingKey = (typeof SETTING_KEYS)[number]

export function SettingsForm() {
  const settings = useQuery(api.settings.list)
  const setMany = useMutation(api.settings.setMany)

  const [values, setValues] = useState<Record<string, string>>({})
  const [initialized, setInitialized] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAdvancedPdf, setShowAdvancedPdf] = useState(false)

  // Initialize form values when settings load
  useEffect(() => {
    if (settings && !initialized) {
      const map: Record<string, string> = {}
      for (const rec of settings as any[]) {
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
      setInitialized(true)
    }
  }, [settings, initialized])

  function update(key: SettingKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const entries: Array<{ key: string; value: string | number }> = []
      for (const key of SETTING_KEYS) {
        const raw = values[key] ?? ''
        if (key === 'vatRate') {
          const pct = parseFloat(raw)
          entries.push({ key, value: isNaN(pct) ? 0 : pct / 100 })
        } else if (
          key.startsWith('pdfFontSize') ||
          key.startsWith('pdfHeader') && key === 'pdfHeaderHeight' ||
          key === 'pdfAccentStripeWidth' ||
          key.startsWith('pdfMargin')
        ) {
          // Store numeric PDF settings as numbers
          const n = parseFloat(raw)
          if (!isNaN(n)) {
            entries.push({ key, value: n })
          } else {
            entries.push({ key, value: raw })
          }
        } else {
          entries.push({ key, value: raw })
        }
      }
      await setMany({ entries: entries as any })
      toast.success('Einstellungen gespeichert.')
    } catch {
      toast.error('Fehler beim Speichern der Einstellungen.')
    } finally {
      setSaving(false)
    }
  }

  if (!settings) {
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
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pdfColorPrimary">Primaerfarbe</Label>
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
                  placeholder="#1E3A5F"
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
                  placeholder="#D4A843"
                  onChange={(e) => update('pdfColorAccent', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Custom Header Lines */}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="pdfSlogan">Slogan / Untertitel</Label>
              <Input
                id="pdfSlogan"
                value={values.pdfSlogan ?? ''}
                placeholder="Ihr Spezialist fuer Elektromobile"
                onChange={(e) => update('pdfSlogan', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pdfHeaderLine1">Header Zeile 1 (ueberschreibt Adresszeile)</Label>
              <Input
                id="pdfHeaderLine1"
                value={values.pdfHeaderLine1 ?? ''}
                placeholder="Leer = Standard-Adresszeile"
                onChange={(e) => update('pdfHeaderLine1', e.target.value)}
              />
            </div>
          </div>

          {/* Advanced PDF Settings */}
          <Collapsible open={showAdvancedPdf} onOpenChange={setShowAdvancedPdf}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                Erweiterte PDF-Einstellungen
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedPdf ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="pdfFontSizeBody">Schriftgroesse Text</Label>
                  <Input
                    id="pdfFontSizeBody"
                    type="number"
                    min={6}
                    max={14}
                    step={0.5}
                    value={values.pdfFontSizeBody ?? '9'}
                    onChange={(e) => update('pdfFontSizeBody', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pdfFontSizeHeading">Schriftgroesse Ueberschrift</Label>
                  <Input
                    id="pdfFontSizeHeading"
                    type="number"
                    min={8}
                    max={18}
                    step={0.5}
                    value={values.pdfFontSizeHeading ?? '11'}
                    onChange={(e) => update('pdfFontSizeHeading', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pdfFontSizeFooter">Schriftgroesse Fusszeile</Label>
                  <Input
                    id="pdfFontSizeFooter"
                    type="number"
                    min={5}
                    max={10}
                    step={0.5}
                    value={values.pdfFontSizeFooter ?? '6.5'}
                    onChange={(e) => update('pdfFontSizeFooter', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pdfHeaderHeight">Header-Hoehe (pt)</Label>
                  <Input
                    id="pdfHeaderHeight"
                    type="number"
                    min={40}
                    max={120}
                    value={values.pdfHeaderHeight ?? '70'}
                    onChange={(e) => update('pdfHeaderHeight', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pdfAccentStripeWidth">Akzentstreifen-Breite (pt)</Label>
                  <Input
                    id="pdfAccentStripeWidth"
                    type="number"
                    min={0}
                    max={20}
                    value={values.pdfAccentStripeWidth ?? '8'}
                    onChange={(e) => update('pdfAccentStripeWidth', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <Label htmlFor="pdfMarginTop">Rand oben (pt)</Label>
                  <Input
                    id="pdfMarginTop"
                    type="number"
                    min={20}
                    max={100}
                    value={values.pdfMarginTop ?? '50'}
                    onChange={(e) => update('pdfMarginTop', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pdfMarginBottom">Rand unten (pt)</Label>
                  <Input
                    id="pdfMarginBottom"
                    type="number"
                    min={20}
                    max={100}
                    value={values.pdfMarginBottom ?? '60'}
                    onChange={(e) => update('pdfMarginBottom', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pdfMarginLeft">Rand links (pt)</Label>
                  <Input
                    id="pdfMarginLeft"
                    type="number"
                    min={20}
                    max={100}
                    value={values.pdfMarginLeft ?? '50'}
                    onChange={(e) => update('pdfMarginLeft', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pdfMarginRight">Rand rechts (pt)</Label>
                  <Input
                    id="pdfMarginRight"
                    type="number"
                    min={20}
                    max={100}
                    value={values.pdfMarginRight ?? '50'}
                    onChange={(e) => update('pdfMarginRight', e.target.value)}
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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

      {/* ---- PDF Live Preview ---- */}
      <PdfPreview settingsMap={values} />
    </div>
  )
}

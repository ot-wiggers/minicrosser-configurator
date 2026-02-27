# Admin-Dashboard Restructuring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add bidirectional links between dashboards, and restructure admin settings into 5 tabs (PDF Designer, API-Schnittstellen, Benutzer, Import/Export, Sonstiges).

**Architecture:** Convert the flat settings page into a tabbed layout using the existing shadcn `Tabs` component. Move Benutzer and Import/Export from standalone routes into settings tabs. Add new API and Misc tabs. Cross-link both dashboards.

**Tech Stack:** Next.js 16 (App Router), React 19, shadcn/ui Tabs, Zustand auth store, Convex settings API.

---

### Task 1: Add Admin link to Mitarbeiter-Dashboard

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Add the admin link button**

In `src/app/page.tsx`, add the `Shield` and `Link` imports and a button visible only for admins. Replace the header `div` (lines 28-39) with:

```tsx
import { FilePlus2, ShoppingCart, LogOut, Shield } from 'lucide-react'
```

And in the header area, wrap the logout button in a flex container and add the admin link before it:

```tsx
<div className="flex items-center gap-2">
  {user.role === 'admin' && (
    <Link href="/admin">
      <Button variant="outline" size="sm">
        <Shield className="mr-2 h-4 w-4" />
        Admin-Bereich
      </Button>
    </Link>
  )}
  <Button variant="ghost" size="sm" onClick={clearSession}>
    <LogOut className="mr-2 h-4 w-4" />
    Abmelden
  </Button>
</div>
```

`Link` is already imported at line 2.

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add admin link to employee dashboard (admin-only)"
```

---

### Task 2: Add Konfigurator link to Admin Sidebar

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx`

**Step 1: Add the back-link**

In `src/components/admin/admin-sidebar.tsx`, add `ArrowLeft` to the lucide imports (it's already imported as `ArrowLeftRight`, add `ArrowLeft` separately).

Add a "Konfigurator" link above the nav section, right after the header `div` (after line 61). Insert this before the `<nav>` element:

```tsx
<div className="px-2 mb-2">
  <Link
    href="/"
    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
  >
    <ArrowLeft className="h-4 w-4" />
    Konfigurator
  </Link>
</div>
```

Add `ArrowLeft` to the import:

```tsx
import {
  LayoutDashboard,
  FolderOpen,
  Car,
  Layers,
  Settings,
  ListChecks,
  Users,
  Contact,
  ArrowLeftRight,
  ArrowLeft,
  LogOut,
} from 'lucide-react'
```

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/admin/admin-sidebar.tsx
git commit -m "feat: add Konfigurator back-link to admin sidebar"
```

---

### Task 3: Remove Benutzer and Import/Export from Sidebar

**Files:**
- Modify: `src/components/admin/admin-sidebar.tsx`

**Step 1: Remove sidebar entries**

In `src/components/admin/admin-sidebar.tsx`, remove these two entries from the `navItems` array:

```tsx
// REMOVE these two lines:
{ href: '/admin/import-export', label: 'Import/Export', icon: ArrowLeftRight },
{ href: '/admin/users', label: 'Benutzer', icon: Users },
```

The resulting `navItems` should be:

```tsx
const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Kategorien', icon: FolderOpen },
  { href: '/admin/models', label: 'Modelle', icon: Car },
  { href: '/admin/option-groups', label: 'Optionsgruppen', icon: Layers },
  { href: '/admin/options', label: 'Optionen', icon: ListChecks },
  { href: '/admin/customers', label: 'Kunden', icon: Contact },
  { href: '/admin/settings', label: 'Einstellungen', icon: Settings },
]
```

Also remove the now-unused imports `Users`, `ArrowLeftRight` from the lucide import.

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/admin/admin-sidebar.tsx
git commit -m "feat: remove Benutzer and Import/Export from sidebar (moved to settings tabs)"
```

---

### Task 4: Create ApiSettingsTab component

**Files:**
- Create: `src/components/admin/api-settings-tab.tsx`

**Step 1: Create the component**

Create `src/components/admin/api-settings-tab.tsx`:

```tsx
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
```

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds (component not mounted yet, but no import errors).

**Step 3: Commit**

```bash
git add src/components/admin/api-settings-tab.tsx
git commit -m "feat: create ApiSettingsTab component for Resend and Brevo config"
```

---

### Task 5: Create MiscSettingsTab component

**Files:**
- Create: `src/components/admin/misc-settings-tab.tsx`

**Step 1: Create the component**

Create `src/components/admin/misc-settings-tab.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { RefreshCw, ArrowRight, Loader2 } from 'lucide-react'

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
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Dev → Prod kopieren
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSync('to-dev')}
              disabled={syncing !== null}
            >
              {syncing === 'to-dev' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              )}
              Prod → Dev kopieren
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
```

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/admin/misc-settings-tab.tsx
git commit -m "feat: create MiscSettingsTab component with Convex sync placeholder"
```

---

### Task 6: Refactor Settings page into tabbed layout

**Files:**
- Modify: `src/app/admin/(authenticated)/settings/page.tsx`

**Step 1: Rewrite the settings page with tabs**

Replace the entire content of `src/app/admin/(authenticated)/settings/page.tsx` with:

```tsx
'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SettingsForm } from '@/components/admin/settings-form'
import { ApiSettingsTab } from '@/components/admin/api-settings-tab'
import { MiscSettingsTab } from '@/components/admin/misc-settings-tab'
import UsersContent from '@/app/admin/(authenticated)/users/page'
import ImportExportContent from '@/app/admin/(authenticated)/import-export/page'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Einstellungen</h1>
      <Tabs defaultValue="pdf">
        <TabsList className="mb-6">
          <TabsTrigger value="pdf">PDF Designer</TabsTrigger>
          <TabsTrigger value="api">API-Schnittstellen</TabsTrigger>
          <TabsTrigger value="users">Benutzer</TabsTrigger>
          <TabsTrigger value="import-export">Import / Export</TabsTrigger>
          <TabsTrigger value="misc">Sonstiges</TabsTrigger>
        </TabsList>
        <TabsContent value="pdf">
          <SettingsForm />
        </TabsContent>
        <TabsContent value="api">
          <ApiSettingsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersContent />
        </TabsContent>
        <TabsContent value="import-export">
          <ImportExportContent />
        </TabsContent>
        <TabsContent value="misc">
          <MiscSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

**Important note:** This initially imports the Users and ImportExport page components directly as `default` exports. This works because Next.js page components are just React components. However, we need to verify that the relative import paths resolve correctly within the `(authenticated)` route group.

If the direct import causes issues (because they're Next.js pages with metadata exports), we'll need to extract the content into separate components. See Task 7 for the fallback approach.

**Step 2: Verify build**

```bash
npx next build
```

If build fails due to page import issues, proceed to Task 7. If build succeeds, skip Task 7.

**Step 3: Commit (only if build succeeds)**

```bash
git add src/app/admin/\(authenticated\)/settings/page.tsx
git commit -m "feat: restructure settings page with 5 tabs"
```

---

### Task 7: Extract Users and ImportExport into standalone components (if needed)

**Only do this task if Task 6 build fails due to page imports.**

**Files:**
- Create: `src/components/admin/users-tab.tsx`
- Create: `src/components/admin/import-export-tab.tsx`
- Modify: `src/app/admin/(authenticated)/settings/page.tsx`
- Modify: `src/app/admin/(authenticated)/users/page.tsx`
- Modify: `src/app/admin/(authenticated)/import-export/page.tsx`

**Step 1: Extract UsersTab component**

Create `src/components/admin/users-tab.tsx` by copying the entire content of `src/app/admin/(authenticated)/users/page.tsx` but:
- Rename the export from `UsersPage` to `UsersTab`
- Make it a named export instead of default
- Fix relative import paths (change `../../../../../convex/` to `../../../convex/`)

**Step 2: Extract ImportExportTab component**

Create `src/components/admin/import-export-tab.tsx` by copying the entire content of `src/app/admin/(authenticated)/import-export/page.tsx` but:
- Rename from `ImportExportPage` to `ImportExportTab`
- Make it a named export instead of default
- Fix relative import paths (change `../../../../../convex/` to `../../../convex/`)

**Step 3: Update the settings page imports**

In `src/app/admin/(authenticated)/settings/page.tsx`, replace the page imports:

```tsx
import { UsersTab } from '@/components/admin/users-tab'
import { ImportExportTab } from '@/components/admin/import-export-tab'
```

And update the TabsContent:

```tsx
<TabsContent value="users">
  <UsersTab />
</TabsContent>
<TabsContent value="import-export">
  <ImportExportTab />
</TabsContent>
```

**Step 4: Simplify the old page routes to redirect**

Update `src/app/admin/(authenticated)/users/page.tsx` to redirect to settings:

```tsx
import { redirect } from 'next/navigation'

export default function UsersPage() {
  redirect('/admin/settings')
}
```

Update `src/app/admin/(authenticated)/import-export/page.tsx` similarly:

```tsx
import { redirect } from 'next/navigation'

export default function ImportExportPage() {
  redirect('/admin/settings')
}
```

This ensures any bookmarked URLs still work.

**Step 5: Verify build**

```bash
npx next build
```

Expected: Build succeeds.

**Step 6: Commit**

```bash
git add src/components/admin/users-tab.tsx src/components/admin/import-export-tab.tsx src/app/admin/\(authenticated\)/settings/page.tsx src/app/admin/\(authenticated\)/users/page.tsx src/app/admin/\(authenticated\)/import-export/page.tsx
git commit -m "feat: extract Users and ImportExport into tab components with redirects"
```

---

### Task 8: Final verification

**Step 1: Clean build**

```bash
npx next build
```

Expected: Build succeeds with no errors.

**Step 2: Verify all files**

Check that:
- `src/app/page.tsx` has admin link (visible only for `role === 'admin'`)
- `src/components/admin/admin-sidebar.tsx` has Konfigurator link and no Benutzer/Import-Export entries
- `src/app/admin/(authenticated)/settings/page.tsx` renders 5 tabs
- `src/components/admin/api-settings-tab.tsx` exists with Resend + Brevo fields
- `src/components/admin/misc-settings-tab.tsx` exists with sync buttons
- Old routes either redirect or are removed

**Step 3: Manual smoke test (dev server)**

```bash
npm run dev
```

Test:
1. Login as employee → no Admin link visible
2. Login as admin → Admin-Bereich button visible, click navigates to `/admin`
3. In admin sidebar → "Konfigurator" link at top, click navigates to `/`
4. In admin sidebar → no "Benutzer" or "Import/Export" entries
5. Click "Einstellungen" → 5 tabs visible
6. Tab "PDF Designer" → existing settings form
7. Tab "API-Schnittstellen" → Resend + Brevo inputs
8. Tab "Benutzer" → user management
9. Tab "Import / Export" → import/export functionality
10. Tab "Sonstiges" → Convex sync section

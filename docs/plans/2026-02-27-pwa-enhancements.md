# PWA Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the PWA setup with proper icons, full offline navigation, and an install button.

**Architecture:** Extend the existing `@ducanh2912/next-pwa` plugin config with caching strategies and fallbacks. Add a `useInstallPrompt` hook using the `beforeinstallprompt` browser event. Create a `~offline` fallback page for the App Router convention.

**Tech Stack:** Next.js 16 (App Router), `@ducanh2912/next-pwa` v10, React 19, Tailwind CSS v4, Lucide React icons.

---

### Task 1: Update manifest.json

**Files:**
- Modify: `public/manifest.json`

**Step 1: Update the manifest**

Replace the full contents of `public/manifest.json` with:

```json
{
  "id": "/",
  "name": "Mini Crosser Konfigurator",
  "short_name": "MC Konfigurator",
  "description": "Angebots- und Bestellkonfigurator für Mini Crosser",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#1E3A5F",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Changes: Added `id`, `scope`, and a maskable icon entry.

**Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "feat(pwa): add id, scope, and maskable icon to manifest"
```

---

### Task 2: Generate icon files

**Files:**
- Create: `public/icons/icon-maskable-512.png`
- Create: `public/icons/apple-touch-icon.png`

**Step 1: Generate maskable icon**

The maskable icon must have the Mini Crosser logo centered with at least 10% padding on all sides (safe zone). Use the existing `public/icons/icon-512.png` as the source.

Generate a 512x512 PNG with the logo centered within an 80% inner area and the background filled with `#1E3A5F` (the theme color). Use ImageMagick or a similar tool:

```bash
magick public/icons/icon-512.png -gravity center -background '#1E3A5F' -extent 512x512 public/icons/icon-maskable-512.png
```

If `magick` is not available, manually create the icon by adding padding to the existing icon using any image editor. The key requirement: the meaningful content must fit within the center 80% circle of the image.

**Step 2: Generate Apple touch icon**

Resize the existing 512px icon to 180x180 for Apple devices:

```bash
magick public/icons/icon-512.png -resize 180x180 public/icons/apple-touch-icon.png
```

If `magick` is not available, resize manually in any image editor to exactly 180x180px.

**Step 3: Commit**

```bash
git add public/icons/icon-maskable-512.png public/icons/apple-touch-icon.png
git commit -m "feat(pwa): add maskable icon and apple-touch-icon"
```

---

### Task 3: Add Apple meta tags to layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: Update the metadata and add apple-touch-icon**

In `src/app/layout.tsx`, update the `metadata` export to add Apple-specific meta tags and the apple-touch-icon link:

```typescript
export const metadata: Metadata = {
  title: 'Mini Crosser Konfigurator',
  description: 'Angebots- und Bestellkonfigurator für Mini Crosser Fahrzeuge',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MC Konfigurator',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}
```

This uses Next.js built-in metadata API — no manual `<meta>` or `<link>` tags needed. Next.js will generate:
- `<meta name="apple-mobile-web-app-capable" content="yes">`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
- `<meta name="apple-mobile-web-app-title" content="MC Konfigurator">`
- `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(pwa): add Apple web app meta tags and touch icon"
```

---

### Task 4: Create offline fallback page

**Files:**
- Create: `src/app/~offline/page.tsx`

**Important:** The `@ducanh2912/next-pwa` plugin for App Router expects the offline page at `app/~offline/page.tsx` (not `app/offline/page.tsx`). The `~` prefix is the convention this plugin uses.

**Step 1: Create the offline page**

Create `src/app/~offline/page.tsx`:

```tsx
import { WifiOff } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-6 px-4 text-center">
      <WifiOff className="h-16 w-16 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Offline</h1>
        <p className="text-muted-foreground">
          Diese Seite ist gerade nicht verfügbar.
        </p>
        <p className="text-sm text-muted-foreground">
          Der Konfigurator und bereits besuchte Seiten sind weiterhin verfügbar.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Zum Dashboard
      </Link>
    </div>
  )
}
```

This is a Server Component (no `'use client'`). It uses the same `min-h-[calc(100vh-3.5rem)]` pattern as the main layout for consistent height.

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds, `~offline` route is included.

**Step 3: Commit**

```bash
git add src/app/~offline/page.tsx
git commit -m "feat(pwa): add offline fallback page"
```

---

### Task 5: Configure caching strategies in next.config.ts

**Files:**
- Modify: `next.config.ts`

**Step 1: Update the PWA configuration**

Replace the contents of `next.config.ts` with:

```typescript
import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  fallbacks: {
    document: '/~offline',
  },
  cacheOnFrontendNav: true,
  aggressiveFrontEndNavCaching: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts',
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'images',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
    ],
  },
})

const nextConfig: NextConfig = {
  turbopack: {},
}

export default withPWA(nextConfig)
```

Key configuration:
- `fallbacks.document`: Points to `~offline` page when a page fetch fails.
- `cacheOnFrontendNav: true`: Caches pages during client-side navigation.
- `aggressiveFrontEndNavCaching: true`: More aggressive front-end nav caching.
- `extendDefaultRuntimeCaching: true`: Keeps default caching AND adds our custom rules.
- Custom `runtimeCaching`: CacheFirst for Google Fonts and images (long-lived static assets).
- The plugin's defaults already handle JS/CSS with CacheFirst and pages with NetworkFirst.

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds. `public/sw.js` and `public/workbox-*.js` are generated.

**Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(pwa): configure caching strategies and offline fallback"
```

---

### Task 6: Create useInstallPrompt hook

**Files:**
- Create: `src/hooks/use-install-prompt.ts`

**Step 1: Create the hook**

Create `src/hooks/use-install-prompt.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    function handleAppInstalled() {
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  return {
    canInstall: deferredPrompt !== null,
    promptInstall,
  }
}
```

How it works:
- Captures `beforeinstallprompt` event (Chrome/Edge/Android). iOS doesn't fire this event, so `canInstall` stays false on iOS.
- Checks `display-mode: standalone` to detect if already installed.
- Listens for `appinstalled` to clean up after successful install.
- `promptInstall()` triggers the native browser install dialog.

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds with no type errors.

**Step 3: Commit**

```bash
git add src/hooks/use-install-prompt.ts
git commit -m "feat(pwa): add useInstallPrompt hook"
```

---

### Task 7: Add install button to TopBar

**Files:**
- Modify: `src/components/layout/top-bar.tsx`

**Step 1: Add the install button**

Update `src/components/layout/top-bar.tsx` to import and use the install prompt hook. Add a `Download` button between the nav and the right side:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { OnlineIndicator } from './online-indicator'
import { cn } from '@/lib/utils'
import { LayoutDashboard, SendHorizonal, Download } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/use-install-prompt'

export function TopBar() {
  const pathname = usePathname()
  const outbox = useQuery(api.outbox.listPending)
  const pendingCount = outbox?.length ?? 0
  const { canInstall, promptInstall } = useInstallPrompt()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { href: '/outbox', label: 'Outbox', icon: SendHorizonal, badge: pendingCount },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Mini Crosser
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {canInstall && (
            <button
              onClick={promptInstall}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Download className="h-4 w-4" />
              Installieren
            </button>
          )}
          <OnlineIndicator />
        </div>
      </div>
    </header>
  )
}
```

Changes:
- Import `Download` from lucide-react and `useInstallPrompt` from hooks.
- Call `useInstallPrompt()` in the component.
- Wrap `OnlineIndicator` in a flex container and add install button before it.
- Button only renders when `canInstall` is true (never on iOS, gone after install).

**Step 2: Verify build**

```bash
npx next build
```

Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/components/layout/top-bar.tsx
git commit -m "feat(pwa): add install button to TopBar"
```

---

### Task 8: Add generated SW files to .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Check current .gitignore**

Read `.gitignore` and check if `sw.js`, `workbox-*.js`, and `swe-worker-*.js` are already excluded.

**Step 2: Add SW entries if missing**

Append to `.gitignore`:

```
# PWA service worker (generated at build time)
public/sw.js
public/sw.js.map
public/workbox-*.js
public/workbox-*.js.map
public/swe-worker-*.js
public/swe-worker-*.js.map
```

These files are generated by `next build` and should not be committed.

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add PWA service worker files to gitignore"
```

---

### Task 9: Final verification

**Step 1: Clean build**

```bash
rm -f public/sw.js public/sw.js.map public/workbox-*.js public/workbox-*.js.map
npx next build
```

Expected: Build succeeds. Verify these files were generated:
- `public/sw.js`
- `public/workbox-*.js`

**Step 2: Verify manifest is valid**

Open `public/manifest.json` and confirm it has `id`, `scope`, 3 icon entries (192, 512, maskable-512).

**Step 3: Verify all new files exist**

- `public/icons/icon-maskable-512.png`
- `public/icons/apple-touch-icon.png`
- `src/hooks/use-install-prompt.ts`
- `src/app/~offline/page.tsx`

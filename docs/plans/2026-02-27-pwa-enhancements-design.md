# PWA Enhancements Design

## Context

The Mini Crosser Konfigurator already has a basic PWA setup:
- `@ducanh2912/next-pwa` configured in `next.config.ts`
- `manifest.json` with name, basic icons (192, 512)
- Offline data layer via Dexie/IndexedDB (CacheSync component)
- Online/offline detection (useOnlineStatus hook, OnlineIndicator)
- Outbox system for queuing emails when offline

## Goals

1. Complete PWA features (maskable icons, Apple support, manifest gaps)
2. Full offline navigation (all app routes cached by service worker)
3. Install button in the TopBar

## Target Platforms

Both iOS (iPad/iPhone) and Android equally important.

## Approach

Extend existing `@ducanh2912/next-pwa` configuration (Ansatz A). No need for manual service worker — the plugin covers all requirements.

---

## 1. Manifest & Icons

### manifest.json updates

- Add `id: "/"` for stable PWA identity
- Add `scope: "/"`
- Add maskable icon entry: `icon-maskable-512.png` (512x512, `purpose: "maskable"`)
- Keep existing icons as-is (192, 512 with implicit `purpose: "any"`)

### New icon files

- `public/icons/icon-maskable-512.png` — 512x512, centered icon with safe-zone padding (min 10% border)
- `public/icons/apple-touch-icon.png` — 180x180

### Apple meta tags in layout.tsx

Add to metadata/head:
- `apple-mobile-web-app-capable: yes`
- `apple-mobile-web-app-status-bar-style: default`
- `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`

---

## 2. Offline Caching & Fallback

### next.config.ts — caching strategies

Configure `@ducanh2912/next-pwa` with:

1. **App Shell (HTML pages)**: `NetworkFirst` — tries network first, falls back to cache. All visited pages become available offline. New routes are cached on first visit.
2. **Static assets (JS, CSS, fonts, images)**: `CacheFirst` — loaded once, always served from cache.
3. **API calls (Convex)**: NOT cached by service worker. Dexie/IndexedDB via CacheSync handles this already.
4. **Offline fallback**: Plugin's `fallbacks` option points to `/offline` page.

### Offline fallback page

New file: `src/app/offline/page.tsx`
- WifiOff icon
- Message: "Offline — Diese Seite ist gerade nicht verfügbar"
- Hint: "Der Konfigurator und bereits besuchte Seiten sind weiterhin verfügbar"
- Button to navigate back to home

---

## 3. Install Prompt

### Hook: useInstallPrompt

New file: `src/hooks/use-install-prompt.ts`
- Captures `beforeinstallprompt` browser event
- Exposes `canInstall` (boolean) and `promptInstall()` (function)
- Returns `canInstall: false` when already in standalone mode or after installation
- On iOS (no `beforeinstallprompt` support), `canInstall` stays false — users install via Safari's "Add to Home Screen"

### TopBar integration

Modify: `src/components/layout/top-bar.tsx`
- New button with Lucide `Download` icon, placed right of OnlineIndicator
- Only visible when `canInstall === true`
- Click calls `promptInstall()`, button disappears after install
- Subtle styling consistent with existing TopBar design

---

## Files to create/modify

### New files
- `public/icons/icon-maskable-512.png`
- `public/icons/apple-touch-icon.png`
- `src/hooks/use-install-prompt.ts`
- `src/app/offline/page.tsx`

### Modified files
- `public/manifest.json`
- `next.config.ts`
- `src/app/layout.tsx`
- `src/components/layout/top-bar.tsx`

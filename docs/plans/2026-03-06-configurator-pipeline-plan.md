# Konfigurator UX + Pipeline/Kanban Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 7 UX improvements: remove upgrade auto-advance, full-height product images, category step in studio nav, larger category thumbnails, option image lightbox, Pipeline/Kanban board replacing outbox + document list.

**Architecture:** Frontend-only changes for points 1-5 (Zustand store fix, CSS changes, component wrapping). Pipeline/Kanban (points 6-7) adds one new Convex query and three new React components, replacing the DocumentList and OutboxTable.

**Tech Stack:** Next.js 16, React 19, Convex, Zustand, Tailwind CSS v4, Lucide icons, shadcn/ui

---

### Task 1: Remove upgrade auto-advance in setBaseModel

**Files:**
- Modify: `src/modules/configurator/store.ts:72`

**Step 1: Remove `currentStep: 2` from setBaseModel**

In `src/modules/configurator/store.ts`, line 72, change:

```ts
setBaseModel: (id) => set({ selectedBaseModelId: id, currentStep: 2 }),
```

to:

```ts
setBaseModel: (id) => set({ selectedBaseModelId: id }),
```

This stops the configurator from auto-advancing to step 2 (Zuruestung) when a base model is selected. The user must manually click "Weiter" or the step pill.

**Step 2: Verify**

Start the dev server. Go to `/new`, select a category, then select a different base model. Confirm the view stays on "Fahrzeug Konfiguration" (step 1) instead of jumping to "Zuruestung & Zubehoer" (step 2).

**Step 3: Commit**

```bash
git add src/modules/configurator/store.ts
git commit -m "fix: remove auto-advance to step 2 when selecting base model"
```

---

### Task 2: Full-height product images in Studio view

**Files:**
- Modify: `src/components/configurator/studio-layout.tsx:63-69`

**Step 1: Update ProductImagePanel image container**

In `src/components/configurator/studio-layout.tsx`, in the `ProductImagePanel` function, find this block (around line 62-70):

```tsx
<div className="aspect-[4/3] overflow-hidden rounded-xl bg-muted">
  {mainImage ? (
    <img
      key={mainImage.id}
      src={mainImage.url}
      alt={baseModel.name}
      className="h-full w-full object-cover animate-in fade-in duration-300"
    />
```

Replace with:

```tsx
<div className="overflow-hidden rounded-xl bg-muted">
  {mainImage ? (
    <img
      key={mainImage.id}
      src={mainImage.url}
      alt={baseModel.name}
      className="max-h-[60vh] w-full object-contain animate-in fade-in duration-300"
    />
```

Changes:
- Remove `aspect-[4/3]` — no fixed aspect ratio
- `object-cover` → `object-contain` — show full image without cropping
- `h-full` → `max-h-[60vh]` — limit max height to 60% of viewport

**Step 2: Verify**

Check the studio view with a product image. The full image should be visible without cropping, centered within the container.

**Step 3: Commit**

```bash
git add src/components/configurator/studio-layout.tsx
git commit -m "fix: show full product images without cropping in studio view"
```

---

### Task 3: Add category step to Studio navigation

**Files:**
- Modify: `src/components/configurator/studio-layout.tsx:626-647`
- Modify: `src/app/new/page.tsx:44`

**Step 1: Add "Kategorie" pill to studio step navigation**

In `studio-layout.tsx`, find the step navigation block (around line 626-647):

```tsx
{/* Step navigation */}
<div className="mb-4 flex gap-2">
  <button
    className={cn(
      'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
      currentStep === 1 ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
    )}
    style={currentStep === 1 ? { backgroundColor: ACCENT, color: PRIMARY_DARK } : undefined}
    onClick={() => setStep(1)}
  >
    Fahrzeug Konfiguration
  </button>
  <button
    className={cn(
      'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
      currentStep === 2 ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
    )}
    style={currentStep === 2 ? { backgroundColor: ACCENT, color: PRIMARY_DARK } : undefined}
    onClick={() => setStep(2)}
  >
    Zurüstung & Zubehör
  </button>
</div>
```

Replace with:

```tsx
{/* Step navigation */}
<div className="mb-4 flex gap-2">
  <button
    className={cn(
      'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
      currentStep === 0 ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
    )}
    style={currentStep === 0 ? { backgroundColor: ACCENT, color: PRIMARY_DARK } : undefined}
    onClick={() => setStep(0)}
  >
    Kategorie
  </button>
  <button
    className={cn(
      'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
      currentStep === 1 ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
    )}
    style={currentStep === 1 ? { backgroundColor: ACCENT, color: PRIMARY_DARK } : undefined}
    onClick={() => setStep(1)}
  >
    Fahrzeug Konfiguration
  </button>
  <button
    className={cn(
      'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
      currentStep === 2 ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
    )}
    style={currentStep === 2 ? { backgroundColor: ACCENT, color: PRIMARY_DARK } : undefined}
    onClick={() => setStep(2)}
  >
    Zurüstung & Zubehör
  </button>
</div>
```

**Step 2: Show Studio view from step 0**

In `src/app/new/page.tsx`, line 44, change:

```ts
const canShowStudio = currentStep >= 1
```

to:

```ts
const canShowStudio = currentStep >= 0
```

**Step 3: Handle category step content in StudioLayout**

In `studio-layout.tsx`, the `StudioLayout` component needs to show CategoryPicker when `currentStep === 0`. Add the import at the top:

```tsx
import { CategoryPicker } from './category-picker'
```

Then in the main content area of `StudioLayout`, wrap the existing config panel content so it only shows when `currentStep >= 1`. Find the right-side panel content (starting around line 586):

```tsx
{/* Right: Configuration panel */}
<div className="w-full lg:w-[42%]">
```

After this div opening, wrap the model info header + options in a condition:

```tsx
{/* Right: Configuration panel */}
<div className="w-full lg:w-[42%]">
  {currentStep === 0 ? (
    <CategoryPicker />
  ) : (
    <>
      {/* Model info header */}
      <div className="mb-6">
        ...existing model info content...
      </div>

      <Separator className="mb-6" />

      {/* Step navigation */}
      ...existing step navigation...

      {/* Option groups */}
      ...existing option groups...
    </>
  )}
</div>
```

Also, don't render the left image panel when on category step. Wrap the left panel:

```tsx
{currentStep >= 1 && (
  <div className="w-full lg:w-[58%]">
    <div className="sticky top-20">
      <ProductImagePanel baseModel={baseModel} colorImages={colorImages ?? undefined} />
    </div>
  </div>
)}
```

And make the right panel full-width on category step:

```tsx
<div className={cn("w-full", currentStep >= 1 && "lg:w-[42%]")}>
```

**Important:** The StudioLayout component has an early return `if (!baseModel || !groupsWithOptions)` that blocks rendering when no model is selected (i.e., step 0 after category change but before model data loads). Move the category step check BEFORE this guard. Restructure:

```tsx
// Show category picker on step 0 even without base model loaded
if (currentStep === 0) {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] flex-col">
      <div className="flex flex-1 flex-col gap-6">
        <div className="w-full">
          <CategoryPicker />
        </div>
      </div>
      <div
        className="sticky bottom-0 -mx-4 mt-8 flex items-center justify-between gap-4 px-4 py-3 md:-mx-6 md:px-6 lg:rounded-t-xl"
        style={{ backgroundColor: PRIMARY_DARK }}
      >
        <ViewToggle view="studio" onViewChange={onViewChange} />
        <div />
      </div>
    </div>
  )
}

if (!baseModel || !groupsWithOptions) {
  return (
    <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">
      <Package className="mr-2 h-5 w-5" />
      Laden...
    </div>
  )
}
```

**Step 4: Verify**

1. Go to `/new?view=studio` — should show Category picker
2. Select a category — should show Fahrzeug Konfiguration (step 1)
3. Click "Kategorie" pill — should go back to category selection
4. The step navigation should show 3 pills: Kategorie, Fahrzeug Konfiguration, Zuruestung

**Step 5: Commit**

```bash
git add src/components/configurator/studio-layout.tsx src/app/new/page.tsx
git commit -m "feat: add category as first step in studio navigation"
```

---

### Task 4: Larger category images

**Files:**
- Modify: `src/components/configurator/category-picker.tsx:35`

**Step 1: Increase category image size**

In `src/components/configurator/category-picker.tsx`, line 35, change:

```tsx
return <img src={imgSrc} alt={cat.name} className="h-10 w-10 rounded object-cover" />
```

to:

```tsx
return <img src={imgSrc} alt={cat.name} className="h-16 w-16 rounded object-cover" />
```

Also update the fallback icon size. In the component usage (around line 92), change the `Icon` usage:

```tsx
<CategoryImage cat={cat} fallbackIcon={<Icon className="h-10 w-10 text-primary" />} />
```

to:

```tsx
<CategoryImage cat={cat} fallbackIcon={<Icon className="h-16 w-16 text-primary" />} />
```

**Step 2: Commit**

```bash
git add src/components/configurator/category-picker.tsx
git commit -m "fix: increase category image size from 40px to 64px"
```

---

### Task 5: Lightbox for option preview images

**Files:**
- Modify: `src/components/configurator/accessory-picker.tsx:16-26`
- Modify: `src/components/configurator/studio-layout.tsx:227-232,308-312`

**Step 1: Wrap accessory-picker thumbnails with ImageLightbox**

In `src/components/configurator/accessory-picker.tsx`, add the import:

```tsx
import { ImageLightbox } from '@/components/ui/image-lightbox'
```

Find the `OptionThumbnail` component (lines 16-26):

```tsx
function OptionThumbnail({ url, optionId }: { url?: string | null; optionId: string }) {
  const imgSrc = useOfflineImage(url ?? null, optionId, 'options')
  if (!imgSrc) return null
  return (
    <img
      src={imgSrc}
      alt=""
      className="h-12 w-12 shrink-0 rounded-md border object-cover"
    />
  )
}
```

Replace with:

```tsx
function OptionThumbnail({ url, optionId }: { url?: string | null; optionId: string }) {
  const imgSrc = useOfflineImage(url ?? null, optionId, 'options')
  if (!imgSrc) return null
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ImageLightbox src={imgSrc} alt="Option Vorschau">
        <img
          src={imgSrc}
          alt=""
          className="h-12 w-12 shrink-0 rounded-md border object-cover"
        />
      </ImageLightbox>
    </div>
  )
}
```

The `e.stopPropagation()` on the wrapper div prevents the card click handler from firing when clicking the thumbnail.

**Step 2: Wrap studio-layout thumbnails with ImageLightbox**

In `studio-layout.tsx`, add the import:

```tsx
import { ImageLightbox } from '@/components/ui/image-lightbox'
```

In `SingleOptionGroup`, find the thumbnail img (around line 227-232):

```tsx
{item.imageUrl && (
  <img
    src={item.imageUrl}
    alt=""
    className="h-10 w-10 shrink-0 rounded-md border object-cover"
  />
)}
```

Replace with:

```tsx
{item.imageUrl && (
  <div onClick={(e) => e.stopPropagation()}>
    <ImageLightbox src={item.imageUrl} alt={item.name}>
      <img
        src={item.imageUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-md border object-cover"
      />
    </ImageLightbox>
  </div>
)}
```

Do the same in `MultiOptionGroup` (around line 308-312):

```tsx
{item.imageUrl && (
  <img
    src={item.imageUrl}
    alt=""
    className="h-10 w-10 shrink-0 rounded-md border object-cover"
  />
)}
```

Replace with:

```tsx
{item.imageUrl && (
  <div onClick={(e) => e.stopPropagation()}>
    <ImageLightbox src={item.imageUrl} alt={item.name}>
      <img
        src={item.imageUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-md border object-cover"
      />
    </ImageLightbox>
  </div>
)}
```

**Step 3: Verify**

Click on an option thumbnail in both the stepper (accessory-picker) and studio views. A lightbox dialog should open showing the full image. Clicking the card outside the thumbnail should still toggle the option selection.

**Step 4: Commit**

```bash
git add src/components/configurator/accessory-picker.tsx src/components/configurator/studio-layout.tsx
git commit -m "feat: add lightbox for option preview images"
```

---

### Task 6: Convex query for pipeline data with email status

**Files:**
- Modify: `convex/documents.ts`

**Step 1: Add `listForPipeline` query**

Add this new query to `convex/documents.ts`:

```ts
export const listForPipeline = query({
  args: {
    createdBy: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    let docs
    if (args.createdBy) {
      docs = await ctx.db
        .query('documents')
        .withIndex('by_createdBy', (q) => q.eq('createdBy', args.createdBy))
        .collect()
    } else {
      docs = await ctx.db.query('documents').order('desc').collect()
    }

    // For each document, get latest outbox status and latest email event
    const results = []
    for (const doc of docs) {
      const outboxEntries = await ctx.db
        .query('outbox')
        .withIndex('by_documentId', (q) => q.eq('documentId', doc._id))
        .collect()

      // Get the latest outbox entry
      const latestOutbox = outboxEntries.length > 0
        ? outboxEntries.sort((a, b) => b._creationTime - a._creationTime)[0]
        : null

      // Get latest email event for this document
      const emailEvents = await ctx.db
        .query('emailEvents')
        .withIndex('by_documentId', (q) => q.eq('documentId', doc._id))
        .collect()
      const latestEvent = emailEvents.length > 0
        ? emailEvents.sort((a, b) => b.timestamp - a.timestamp)[0]
        : null

      results.push({
        ...doc,
        emailStatus: latestOutbox?.status ?? null,
        emailEvent: latestEvent?.eventType ?? null,
        emailError: latestOutbox?.status === 'FAILED' ? latestOutbox.lastError : null,
      })
    }

    return results
  },
})
```

Also add a query to count failed outbox entries:

```ts
export const countFailedEmails = query({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query('outbox')
      .withIndex('by_status', (q) => q.eq('status', 'FAILED'))
      .collect()
    return failed.length
  },
})
```

Note: This new query is in `convex/documents.ts` but `countFailedEmails` should go in `convex/outbox.ts`.

**Step 2: Add countFailedEmails to outbox.ts**

In `convex/outbox.ts`, add:

```ts
export const countFailed = query({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query('outbox')
      .withIndex('by_status', (q) => q.eq('status', 'FAILED'))
      .collect()
    return failed.length
  },
})

export const retryAllFailed = mutation({
  args: {},
  handler: async (ctx) => {
    const failed = await ctx.db
      .query('outbox')
      .withIndex('by_status', (q) => q.eq('status', 'FAILED'))
      .collect()
    for (const entry of failed) {
      await ctx.db.patch(entry._id, { status: 'PENDING', attempts: 0, lastError: undefined })
    }
    return failed.length
  },
})
```

**Step 3: Commit**

```bash
git add convex/documents.ts convex/outbox.ts
git commit -m "feat: add pipeline query with email status and retry-all mutation"
```

---

### Task 7: PipelineCard component

**Files:**
- Create: `src/components/documents/pipeline-card.tsx`

**Step 1: Create the pipeline card component**

```tsx
'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Mail, MailCheck, MailOpen, MailX, Clock } from 'lucide-react'

const typeLabel: Record<string, string> = {
  QUOTE: 'Angebot',
  ORDER: 'Bestellung',
}

const statusLabel: Record<string, string> = {
  DRAFT: 'Entwurf',
  FINAL: 'Final',
  SENT: 'Versendet',
  FOLLOW_UP: 'Nachfassen',
  ACCEPTED: 'Angenommen',
  DECLINED: 'Abgelehnt',
  EXPIRED: 'Abgelaufen',
  ARCHIVED: 'Archiviert',
}

function EmailStatusIcon({ emailStatus, emailEvent }: { emailStatus: string | null; emailEvent: string | null }) {
  if (emailStatus === 'FAILED') {
    return <MailX className="h-4 w-4 text-destructive" />
  }
  if (emailEvent === 'opened' || emailEvent === 'clicked') {
    return <MailOpen className="h-4 w-4 text-green-600" />
  }
  if (emailEvent === 'delivered') {
    return <MailCheck className="h-4 w-4 text-blue-600" />
  }
  if (emailEvent === 'bounced') {
    return <MailX className="h-4 w-4 text-orange-500" />
  }
  if (emailStatus === 'SENT') {
    return <Mail className="h-4 w-4 text-muted-foreground" />
  }
  if (emailStatus === 'PENDING') {
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }
  return null
}

interface PipelineCardProps {
  doc: {
    _id: string
    documentNo: string
    documentType: string
    status: string
    customer: { company: string; firstName: string; lastName: string }
    pricing: { totalGross: number }
    _creationTime: number
    sentAt?: number
    emailStatus: string | null
    emailEvent: string | null
    emailError: string | null
    createdByName?: string
  }
}

export function PipelineCard({ doc }: PipelineCardProps) {
  return (
    <Link href={`/documents/${doc._id}`}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-medium">{doc.documentNo}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {typeLabel[doc.documentType]}
                </Badge>
                <EmailStatusIcon emailStatus={doc.emailStatus} emailEvent={doc.emailEvent} />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {doc.customer.company || `${doc.customer.firstName} ${doc.customer.lastName}`}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold">
              {formatCurrency(doc.pricing.totalGross)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(doc.sentAt ?? doc._creationTime)}</span>
            {doc.createdByName && <span>{doc.createdByName}</span>}
          </div>
          {doc.emailError && (
            <p className="mt-1 truncate text-xs text-destructive">{doc.emailError}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/documents/pipeline-card.tsx
git commit -m "feat: add PipelineCard component for kanban board"
```

---

### Task 8: PipelineFailedBanner component

**Files:**
- Create: `src/components/documents/pipeline-failed-banner.tsx`

**Step 1: Create the failed emails banner**

```tsx
'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export function PipelineFailedBanner() {
  const failedCount = useQuery(api.outbox.countFailed)
  const retryAll = useMutation(api.outbox.retryAllFailed)
  const [retrying, setRetrying] = useState(false)

  if (!failedCount || failedCount === 0) return null

  async function handleRetry() {
    setRetrying(true)
    try {
      const count = await retryAll()
      toast.success(`${count} E-Mail(s) werden erneut gesendet...`)
    } catch {
      toast.error('Fehler beim erneuten Senden')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4" />
        <span>
          {failedCount} E-Mail{failedCount > 1 ? 's' : ''} fehlgeschlagen
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs"
        onClick={handleRetry}
        disabled={retrying}
      >
        <RefreshCw className="mr-1 h-3 w-3" />
        {retrying ? 'Wird gesendet...' : 'Alle erneut senden'}
      </Button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/documents/pipeline-failed-banner.tsx
git commit -m "feat: add PipelineFailedBanner for failed email notifications"
```

---

### Task 9: PipelineBoard component

**Files:**
- Create: `src/components/documents/pipeline-board.tsx`

**Step 1: Create the kanban board**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useAuthStore } from '@/modules/auth/auth-store'
import { PipelineCard } from './pipeline-card'
import { PipelineFailedBanner } from './pipeline-failed-banner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'

const PIPELINE_COLUMNS = [
  {
    id: 'draft',
    label: 'Entwurf',
    statuses: ['DRAFT', 'FINAL'],
    color: 'bg-slate-100 dark:bg-slate-800/50',
  },
  {
    id: 'sent',
    label: 'Versendet',
    statuses: ['SENT'],
    color: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    id: 'followup',
    label: 'Nachfassen',
    statuses: ['FOLLOW_UP'],
    color: 'bg-orange-50 dark:bg-orange-900/20',
  },
  {
    id: 'done',
    label: 'Erledigt',
    statuses: ['ACCEPTED', 'DECLINED', 'EXPIRED'],
    color: 'bg-green-50 dark:bg-green-900/20',
  },
] as const

export function PipelineBoard() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [showAll, setShowAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [doneExpanded, setDoneExpanded] = useState(false)

  // Query pipeline data — filter by user if not admin or if "Meine" is selected
  const createdByFilter = isAdmin && showAll
    ? undefined
    : (user?._id as Id<'users'> | undefined)

  const pipelineDocs = useQuery(api.documents.listForPipeline, {
    createdBy: createdByFilter,
  })

  // Filter by search query
  const filteredDocs = useMemo(() => {
    if (!pipelineDocs) return []
    if (!searchQuery.trim()) return pipelineDocs
    const lower = searchQuery.toLowerCase()
    return pipelineDocs.filter(
      (d: any) =>
        d.documentNo?.toLowerCase().includes(lower) ||
        d.customer.company?.toLowerCase().includes(lower) ||
        d.customer.lastName?.toLowerCase().includes(lower),
    )
  }, [pipelineDocs, searchQuery])

  // Group documents by column
  const columns = useMemo(() => {
    return PIPELINE_COLUMNS.map((col) => ({
      ...col,
      docs: filteredDocs.filter((d: any) => col.statuses.includes(d.status)),
    }))
  }, [filteredDocs])

  // Exclude ARCHIVED from pipeline (they don't appear anywhere)
  // ARCHIVED docs are filtered out because they're not in any column's statuses

  return (
    <div>
      <PipelineFailedBanner />

      {/* Controls */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Suche nach Dokumentnummer, Firma, Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8', !showAll && 'bg-background shadow-sm')}
              onClick={() => setShowAll(false)}
            >
              Meine
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8', showAll && 'bg-background shadow-sm')}
              onClick={() => setShowAll(true)}
            >
              Alle
            </Button>
          </div>
        )}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => (
          <div key={col.id} className={cn('rounded-lg p-3', col.color)}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {col.id === 'done' && (
                  <button onClick={() => setDoneExpanded(!doneExpanded)} className="text-muted-foreground">
                    {doneExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                )}
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {col.docs.length}
                </Badge>
              </div>
            </div>
            {col.id === 'done' && !doneExpanded ? (
              <p className="text-xs text-muted-foreground">
                {col.docs.length} Dokument{col.docs.length !== 1 ? 'e' : ''}
              </p>
            ) : (
              <div className="space-y-2">
                {col.docs.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">Keine Dokumente</p>
                ) : (
                  col.docs.map((doc: any) => (
                    <PipelineCard key={doc._id} doc={doc} />
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/documents/pipeline-board.tsx
git commit -m "feat: add PipelineBoard kanban component"
```

---

### Task 10: Replace DocumentList with PipelineBoard on dashboard

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Replace the import and usage**

In `src/app/page.tsx`, replace the DocumentList import:

```tsx
import { DocumentList } from '@/components/documents/document-list'
```

with:

```tsx
import { PipelineBoard } from '@/components/documents/pipeline-board'
```

Then in the JSX, replace:

```tsx
<div>
  <h2 className="mb-4 text-xl font-semibold">Letzte Dokumente</h2>
  <DocumentList />
</div>
```

with:

```tsx
<div>
  <h2 className="mb-4 text-xl font-semibold">Pipeline</h2>
  <PipelineBoard />
</div>
```

**Step 2: Verify**

Go to the dashboard (`/`). Instead of the old document list with Offen/Alle/Archiviert tabs, you should see 4 kanban columns: Entwurf, Versendet, Nachfassen, Erledigt. Each card shows document number, customer, amount, date, and email status icon.

- If admin: "Meine/Alle" toggle should appear
- If there are failed emails: a red banner should show at the top
- "Erledigt" column should be collapsed by default

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace document list with pipeline kanban board on dashboard"
```

---

### Task 11: Remove outbox page

**Files:**
- Delete: `src/app/outbox/page.tsx`
- Note: Keep `src/components/outbox/outbox-table.tsx` for now (it may still be referenced elsewhere, can be cleaned up later)

**Step 1: Delete the outbox page**

```bash
rm src/app/outbox/page.tsx
```

If the directory `src/app/outbox/` is now empty, remove it too:

```bash
rmdir src/app/outbox/ 2>/dev/null || true
```

**Step 2: Check for references to /outbox in the codebase**

Search for any links or references to `/outbox` in the code. If found (e.g., in navigation), remove them. The admin sidebar (`admin-sidebar.tsx`) does NOT have an outbox link, so that's fine.

Check top-bar or other navigation components for outbox links and remove them.

**Step 3: Verify**

Navigate to `/outbox` — should show 404. Dashboard should work fine with the new PipelineBoard.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove outbox page (replaced by pipeline board)"
```

---

### Task 12: Final deploy

**Step 1: Deploy Convex**

```bash
npx convex deploy --yes
```

This deploys the new `listForPipeline` query, `countFailed` query, and `retryAllFailed` mutation.

**Step 2: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

**Step 3: Verify on production**

1. Dashboard shows Pipeline/Kanban with 4 columns
2. Studio view shows 3 navigation pills (Kategorie, Fahrzeug Konfiguration, Zuruestung)
3. Product images show full height in studio
4. Category images are larger (64px)
5. Option thumbnails open in lightbox on click
6. Selecting a base model does NOT auto-advance to step 2

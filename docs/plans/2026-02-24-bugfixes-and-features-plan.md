# Bugfixes & Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 critical bugs (empty edit forms, session loss, document display errors), then implement 4 smaller features (auto customer numbers, marketing consent, digital signatures, image lightbox).

**Architecture:** Next.js 16 PWA with Convex Cloud backend (real-time queries/mutations), Zustand auth store with localStorage persistence, pdf-lib for PDF generation.

**Tech Stack:** Next.js (App Router), Convex, React, Zustand, shadcn/ui, pdf-lib, signature_pad (new)

---

## Phase 1: Bug Fixes

### Task 1: Fix empty category edit form

The `CategoryForm` uses `useEffect` to populate fields when editing, but opens empty because there's no `key` prop to force remount when switching between items. The form component reuses state from the previous render.

**Files:**
- Modify: `src/app/admin/(authenticated)/categories/page.tsx:136`
- Verify: `src/components/admin/category-form.tsx` (already has correct useEffect pattern)

**Step 1: Add key prop to CategoryForm**

In `src/app/admin/(authenticated)/categories/page.tsx`, change line 136 from:

```tsx
<CategoryForm
  open={formOpen}
  onOpenChange={setFormOpen}
  categoryId={editCategoryId}
/>
```

to:

```tsx
<CategoryForm
  key={editCategoryId ?? 'new'}
  open={formOpen}
  onOpenChange={setFormOpen}
  categoryId={editCategoryId}
/>
```

**Step 2: Verify the fix**

Run: `npx tsc --noEmit`
Expected: 0 errors

Manual test: Open admin categories page, click edit on a category, verify fields are populated.

**Step 3: Commit**

```bash
git add src/app/admin/(authenticated)/categories/page.tsx
git commit -m "fix: add key prop to CategoryForm to force remount on edit"
```

---

### Task 2: Fix empty model edit form

`ModelForm` wraps `ModelFormInner` with `key={modelId ?? 'new'}` (line 313), which forces remount. But `ModelFormInner` uses `useState(() => { if (model) { ... } })` — a lazy initializer that runs on mount. On mount, the Convex `useQuery` hasn't returned yet, so `model` is `undefined` and the form initializes empty. There's no `useEffect` to populate later.

**Files:**
- Modify: `src/components/admin/model-form.tsx:43-70`

**Step 1: Add useEffect to populate form when model loads**

In `src/components/admin/model-form.tsx`, add `useEffect` import and a new effect after the `useState` declarations (after line 75):

First, add `useEffect` to the import on line 1 (it currently only imports `useState`):

```tsx
import { useState, useEffect } from 'react'
```

Then add this effect after line 75 (after the `grossOverridden` useState):

```tsx
// Populate form when model data loads (query is async)
useEffect(() => {
  if (model) {
    setForm({
      categoryId: model.categoryId,
      skuCode: model.skuCode,
      articleNo: model.articleNo,
      name: model.name,
      description: model.description ?? '',
      priceNet: model.priceNet,
      priceGross: model.priceGross,
      sortOrder: model.sortOrder,
      isActive: model.isActive,
      imageStorageId: model.imageStorageId as string | undefined,
    })
    const calculated = Math.round(model.priceNet * VAT_RATE * 100) / 100
    setGrossOverridden(Math.abs(model.priceGross - calculated) > 0.01)
  }
}, [model])
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/admin/model-form.tsx
git commit -m "fix: populate model form when query data loads"
```

---

### Task 3: Fix empty option edit form

Same root cause as Task 2. `OptionFormInner` uses `useState(option?.xxx ?? '')` which evaluates to default on mount because `option` is `undefined` while the query loads. No `useEffect` to update.

**Files:**
- Modify: `src/components/admin/option-form.tsx:25-48`

**Step 1: Add useEffect to populate form when option loads**

Add `useEffect` to the import on line 1:

```tsx
import { useState, useEffect } from 'react'
```

Then add this effect after the `imageStorageId` useState (after line 48):

```tsx
// Populate form when option data loads (query is async)
useEffect(() => {
  if (option) {
    setOptionGroupId(option.optionGroupId)
    setSkuCode(option.skuCode)
    setArticleNo(option.articleNo)
    setName(option.name)
    setDescription(option.description ?? '')
    setPriceNet(String(option.priceNet))
    setPriceGross(String(option.priceGross))
    setSortOrder(String(option.sortOrder))
    setIsActive(option.isActive)
    setIsDefault(option.isDefault)
    setImageStorageId(option.imageStorageId as string | undefined)
  }
}, [option])
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/admin/option-form.tsx
git commit -m "fix: populate option form when query data loads"
```

---

### Task 4: Fix session loss on admin page refresh

`AuthGuard` only checks Zustand localStorage state. It never calls `validateSession` on the server. After hydration, the localStorage state is stale — the component briefly shows the page, then redirects.

**Files:**
- Modify: `src/components/admin/auth-guard.tsx` (full rewrite, 27 lines → ~55 lines)

**Step 1: Rewrite auth-guard with server-side session validation**

Replace the entire content of `src/components/admin/auth-guard.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthStore } from '@/modules/auth/auth-store'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Guards admin routes — requires authenticated admin role.
 * Validates the session server-side on mount to prevent stale localStorage.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, user, clearSession } = useAuthStore()
  const router = useRouter()
  const validateSession = useAction(api.auth.validateSession)
  const [validating, setValidating] = useState(true)

  useEffect(() => {
    async function validate() {
      // No local session at all → redirect immediately
      if (!isAuthenticated || !token || !user) {
        router.replace('/admin/login')
        return
      }

      // Non-admin in local state → redirect
      if (user.role !== 'admin') {
        router.replace('/')
        return
      }

      // Validate session on the server
      try {
        const serverUser = await validateSession({ token })
        if (!serverUser || serverUser.role !== 'admin') {
          clearSession()
          router.replace('/admin/login')
          return
        }
      } catch {
        clearSession()
        router.replace('/admin/login')
        return
      }

      setValidating(false)
    }

    validate()
  }, []) // Run once on mount only

  if (validating) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/admin/auth-guard.tsx
git commit -m "fix: validate admin session server-side on mount"
```

---

### Task 5: Fix document number "undefined" and date "Invalid Date"

`document-list.tsx` line 84: `formatDate(doc._creationTime)` passes a `number` (Unix timestamp from Convex) but `formatDate` only accepts `string | Date`. Also, `doc.documentNo` may be missing from some old records.

**Files:**
- Modify: `src/lib/utils.ts:15` (formatDate signature)
- Modify: `src/components/documents/document-list.tsx:71,84`

**Step 1: Extend formatDate to accept number**

In `src/lib/utils.ts`, change line 15 from:

```ts
export function formatDate(date: string | Date): string {
```

to:

```ts
export function formatDate(date: string | Date | number): string {
```

**Step 2: Add fallback for documentNo in document-list**

In `src/components/documents/document-list.tsx`, change line 71 from:

```tsx
<span className="font-mono font-medium">{doc.documentNo}</span>
```

to:

```tsx
<span className="font-mono font-medium">{doc.documentNo ?? '\u2014'}</span>
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/lib/utils.ts src/components/documents/document-list.tsx
git commit -m "fix: formatDate accepts number, documentNo fallback to em-dash"
```

---

## Phase 3: Smaller Features

### Task 6: Auto-generate customer numbers (K-10001, K-10002, ...)

Currently customer numbers are optional manual input. They should be auto-generated server-side using the existing `sequences` table.

**Files:**
- Modify: `convex/customers.ts:54-69` (create mutation)
- Modify: `convex/customers.ts:107-143` (findOrCreate mutation)
- Modify: `src/components/configurator/customer-form-dialog.tsx:444-451` (customerNumber field)

**Step 1: Add auto-generation to customers.create mutation**

In `convex/customers.ts`, replace the `create` mutation (lines 54-69) with:

```ts
export const create = mutation({
  args: {
    company: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    street: v.optional(v.string()),
    zip: v.optional(v.string()),
    city: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    customerNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let customerNumber = args.customerNumber
    if (!customerNumber) {
      // Auto-generate: K-10001, K-10002, ...
      const seq = await ctx.db
        .query('sequences')
        .withIndex('by_key', (q) => q.eq('key', 'customer-seq'))
        .first()
      const nextVal = seq ? seq.value + 1 : 10001
      if (seq) {
        await ctx.db.patch(seq._id, { value: nextVal })
      } else {
        await ctx.db.insert('sequences', { key: 'customer-seq', value: nextVal })
      }
      customerNumber = `K-${nextVal}`
    }
    return ctx.db.insert('customers', { ...args, customerNumber })
  },
})
```

**Step 2: Add auto-generation to findOrCreate**

In `convex/customers.ts`, replace the `findOrCreate` mutation (lines 107-144) with:

```ts
export const findOrCreate = mutation({
  args: {
    company: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    street: v.optional(v.string()),
    zip: v.optional(v.string()),
    city: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    contactPerson: v.optional(v.string()),
    customerNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Try to find by email first
    if (args.email) {
      const existing = await ctx.db
        .query('customers')
        .withIndex('by_email', (q) => q.eq('email', args.email))
        .first()
      if (existing) return existing._id
    }

    // Try by customer number
    if (args.customerNumber) {
      const existing = await ctx.db
        .query('customers')
        .withIndex('by_customerNumber', (q) =>
          q.eq('customerNumber', args.customerNumber),
        )
        .first()
      if (existing) return existing._id
    }

    // Auto-generate customer number for new customers
    const seq = await ctx.db
      .query('sequences')
      .withIndex('by_key', (q) => q.eq('key', 'customer-seq'))
      .first()
    const nextVal = seq ? seq.value + 1 : 10001
    if (seq) {
      await ctx.db.patch(seq._id, { value: nextVal })
    } else {
      await ctx.db.insert('sequences', { key: 'customer-seq', value: nextVal })
    }
    const customerNumber = `K-${nextVal}`

    return ctx.db.insert('customers', { ...args, customerNumber })
  },
})
```

**Step 3: Make customerNumber field readonly in customer-form-dialog**

In `src/components/configurator/customer-form-dialog.tsx`, change lines 444-451 (the customerNumber input) from:

```tsx
<div className="grid gap-2">
  <Label htmlFor="customerNumber">{fieldLabels.customerNumber}</Label>
  <Input
    id="customerNumber"
    value={customer.customerNumber}
    onChange={(e) => updateField('customerNumber', e.target.value)}
  />
</div>
```

to:

```tsx
<div className="grid gap-2">
  <Label htmlFor="customerNumber">{fieldLabels.customerNumber}</Label>
  <Input
    id="customerNumber"
    value={customer.customerNumber}
    onChange={(e) => updateField('customerNumber', e.target.value)}
    readOnly={!customer.customerNumber}
    placeholder="Wird automatisch vergeben"
    className={!customer.customerNumber ? 'bg-muted text-muted-foreground' : ''}
  />
</div>
```

**Step 4: Deploy and verify**

Run: `npx convex dev --once && npx tsc --noEmit`
Expected: Successful deploy, 0 TypeScript errors

**Step 5: Commit**

```bash
git add convex/customers.ts src/components/configurator/customer-form-dialog.tsx
git commit -m "feat: auto-generate customer numbers (K-10001, K-10002, ...)"
```

---

### Task 7: Marketing consent checkbox

Add a checkbox for newsletter/marketing consent at the end of the customer form dialog. Store consent + timestamp on the customer record.

**Files:**
- Modify: `convex/schema.ts:121-135` (customers table)
- Modify: `convex/customers.ts` (add fields to create/findOrCreate/update args)
- Modify: `src/components/configurator/customer-form-dialog.tsx` (add checkbox before submit)

**Step 1: Add schema fields**

In `convex/schema.ts`, add two fields to the customers table (after line 131, before the closing `})`):

```ts
    marketingConsent: v.optional(v.boolean()),
    marketingConsentDate: v.optional(v.number()),
```

**Step 2: Add fields to customers.create and findOrCreate args**

In `convex/customers.ts`, add these two args to both the `create` and `findOrCreate` mutations (after the `customerNumber` arg):

```ts
    marketingConsent: v.optional(v.boolean()),
    marketingConsentDate: v.optional(v.number()),
```

**Step 3: Add checkbox to customer-form-dialog**

In `src/components/configurator/customer-form-dialog.tsx`, add a state variable after `notes` state (line 100):

```tsx
const [marketingConsent, setMarketingConsent] = useState(false)
```

Add the checkbox UI before the notes textarea (before the `<div className="grid gap-2">` for notes around line 463). Insert this block:

```tsx
<div className="flex items-start gap-3 rounded-md border p-3">
  <input
    type="checkbox"
    id="marketingConsent"
    checked={marketingConsent}
    onChange={(e) => setMarketingConsent(e.target.checked)}
    className="mt-0.5 h-4 w-4 accent-primary"
  />
  <Label htmlFor="marketingConsent" className="text-sm font-normal leading-snug cursor-pointer">
    Ich stimme dem Erhalt von Newslettern und Marketinginformationen zu
  </Label>
</div>
```

In both `handleCreate` and `handleUpdate`, pass the consent data when calling `findOrCreateCustomer`. Add these fields to the findOrCreateCustomer call:

```ts
marketingConsent: marketingConsent || undefined,
marketingConsentDate: marketingConsent ? Date.now() : undefined,
```

**Step 4: Deploy and verify**

Run: `npx convex dev --once && npx tsc --noEmit`
Expected: Successful deploy, 0 TypeScript errors

**Step 5: Commit**

```bash
git add convex/schema.ts convex/customers.ts src/components/configurator/customer-form-dialog.tsx
git commit -m "feat: add marketing consent checkbox to customer form"
```

---

### Task 8: Signature field for orders

Add a digital signature canvas to the customer form dialog when `documentType === 'ORDER'`. Store as PNG in Convex file storage. Show empty signature line in PDF when no digital signature is provided.

**Files:**
- Install: `signature_pad` npm package
- Create: `src/components/configurator/signature-pad.tsx`
- Modify: `convex/schema.ts:58-110` (documents table)
- Modify: `src/components/configurator/customer-form-dialog.tsx`

**Step 1: Install signature_pad**

Run: `npm install signature_pad`

**Step 2: Add signatureStorageId to documents schema**

In `convex/schema.ts`, add a field to the documents table (after `notes` on line 104):

```ts
    signatureStorageId: v.optional(v.id('_storage')),
```

**Step 3: Create SignaturePad component**

Create `src/components/configurator/signature-pad.tsx`:

```tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import SignaturePadLib from 'signature_pad'
import { Button } from '@/components/ui/button'
import { Undo2, Trash2 } from 'lucide-react'

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void
}

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    })

    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty())
      onChange(pad.toDataURL('image/png'))
    })

    padRef.current = pad

    // Resize canvas to container
    function resizeCanvas() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
      pad.clear()
      setIsEmpty(true)
      onChange(null)
    }

    resizeCanvas()

    return () => {
      pad.off()
    }
  }, [onChange])

  function handleClear() {
    padRef.current?.clear()
    setIsEmpty(true)
    onChange(null)
  }

  function handleUndo() {
    const pad = padRef.current
    if (!pad) return
    const data = pad.toData()
    if (data.length > 0) {
      data.pop()
      pad.fromData(data)
      setIsEmpty(pad.isEmpty())
      onChange(pad.isEmpty() ? null : pad.toDataURL('image/png'))
    }
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border bg-white">
        <canvas
          ref={canvasRef}
          className="h-32 w-full cursor-crosshair touch-none"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={isEmpty}
        >
          <Undo2 className="mr-1 h-3 w-3" />
          Rückgängig
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Löschen
        </Button>
      </div>
    </div>
  )
}
```

**Step 4: Add signature to customer-form-dialog**

In `src/components/configurator/customer-form-dialog.tsx`:

Add import at the top:

```tsx
import { SignaturePad } from '@/components/configurator/signature-pad'
```

Add state after `marketingConsent` state:

```tsx
const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
```

Add the signature pad UI after the marketing consent checkbox, wrapped in a condition:

```tsx
{documentType === 'ORDER' && (
  <div className="grid gap-2">
    <Label>Unterschrift Kunde</Label>
    <SignaturePad onChange={setSignatureDataUrl} />
  </div>
)}
```

In `handleCreate` and `handleUpdate`, after creating the document, if `signatureDataUrl` is not null, upload the signature to Convex storage and patch the document. This requires adding a file upload mutation. For simplicity, store the data URL in the document notes or as a separate storage upload.

> **Note:** The actual Convex file upload integration (converting data URL to blob, uploading via `generateUploadUrl`, patching document with `signatureStorageId`) will be implemented when the PDF template (Phase 2) is built. For now, the UI component and schema field are in place.

**Step 5: Deploy and verify**

Run: `npx convex dev --once && npx tsc --noEmit`
Expected: Successful deploy, 0 TypeScript errors

**Step 6: Commit**

```bash
git add convex/schema.ts src/components/configurator/signature-pad.tsx src/components/configurator/customer-form-dialog.tsx package.json package-lock.json
git commit -m "feat: add signature pad for orders (UI + schema)"
```

---

### Task 9: Image lightbox for preview thumbnails

Add a reusable lightbox component based on shadcn Dialog. Click on any thumbnail in admin tables or configurator to see a full-size image.

**Files:**
- Create: `src/components/ui/image-lightbox.tsx`
- Modify: `src/app/admin/(authenticated)/categories/page.tsx` (category thumbnails)
- Modify: `src/app/admin/(authenticated)/models/page.tsx` (model thumbnails)
- Modify: `src/app/admin/(authenticated)/options/page.tsx` (option thumbnails)

**Step 1: Create ImageLightbox component**

Create `src/components/ui/image-lightbox.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

interface ImageLightboxProps {
  src: string
  alt: string
  children: React.ReactNode // The thumbnail trigger
}

export function ImageLightbox({ src, alt, children }: ImageLightboxProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-zoom-in"
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
          <VisuallyHidden>
            <DialogTitle>{alt}</DialogTitle>
          </VisuallyHidden>
          <img
            src={src}
            alt={alt}
            className="max-h-[85vh] w-full rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
```

**Step 2: Wire up in categories page**

In `src/app/admin/(authenticated)/categories/page.tsx`, add import:

```tsx
import { ImageLightbox } from '@/components/ui/image-lightbox'
```

Wrap the category thumbnail image (lines 89-94). Change from:

```tsx
<img
  src={category.imageUrl}
  alt={category.name}
  className="h-12 w-12 rounded-md border object-cover"
/>
```

to:

```tsx
<ImageLightbox src={category.imageUrl} alt={category.name}>
  <img
    src={category.imageUrl}
    alt={category.name}
    className="h-12 w-12 rounded-md border object-cover"
  />
</ImageLightbox>
```

**Step 3: Wire up in models page**

In `src/app/admin/(authenticated)/models/page.tsx`, add import:

```tsx
import { ImageLightbox } from '@/components/ui/image-lightbox'
```

Wrap the model thumbnail image (lines 129-133). Change from:

```tsx
<img
  src={model.imageUrl}
  alt={model.name}
  className="h-10 w-10 rounded object-cover"
/>
```

to:

```tsx
<ImageLightbox src={model.imageUrl} alt={model.name}>
  <img
    src={model.imageUrl}
    alt={model.name}
    className="h-10 w-10 rounded object-cover"
  />
</ImageLightbox>
```

**Step 4: Wire up in options page**

In `src/app/admin/(authenticated)/options/page.tsx`, add import:

```tsx
import { ImageLightbox } from '@/components/ui/image-lightbox'
```

Wrap the option thumbnail image (lines 119-123). Change from:

```tsx
<img
  src={opt.imageUrl}
  alt={opt.name}
  className="h-8 w-8 rounded object-cover"
/>
```

to:

```tsx
<ImageLightbox src={opt.imageUrl} alt={opt.name}>
  <img
    src={opt.imageUrl}
    alt={opt.name}
    className="h-8 w-8 rounded object-cover"
  />
</ImageLightbox>
```

**Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/components/ui/image-lightbox.tsx src/app/admin/(authenticated)/categories/page.tsx src/app/admin/(authenticated)/models/page.tsx src/app/admin/(authenticated)/options/page.tsx
git commit -m "feat: add image lightbox for admin table thumbnails"
```

---

## Remaining Phases (separate plans)

The following phases are larger efforts and should be planned separately after Phase 1 + Phase 3 are complete:

- **Phase 2: PDF Template** — Full redesign after corporate Briefbogen. Requires logo asset, extended settings fields, 3-column footer. Estimated 4-6 hours.
- **Phase 4: Polestar Configurator Layout** — Two-column studio view with color cards, sticky footer. Estimated 4-6 hours.
- **Phase 5: Color Variant Images** — New `colorVariantImages` table, admin upload per model+color, configurator image switching. Estimated 2-3 hours.

---

## Verification Checklist

After all tasks are complete:

1. `npx tsc --noEmit` — 0 errors
2. `npx convex dev --once` — successful deploy
3. Admin: Edit a category → fields populated
4. Admin: Edit a model → fields populated
5. Admin: Edit an option → fields populated
6. Admin: Refresh page → stays logged in (no redirect)
7. Documents: List shows correct dates and document numbers
8. Configurator: Create quote → customer gets auto-number K-10001+
9. Configurator: Order flow → signature pad visible
10. Configurator: Marketing consent checkbox visible
11. Admin tables: Click thumbnail → lightbox opens with full image

# Customer Enhancements + Offline Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add customer categories (business/private), notes, admin-configurable quick-action checklists, and fix the offline mode for Studio view + Blanko PDF.

**Architecture:** Four independent workstreams touching the Convex schema, customer mutations, admin UI, and frontend offline hooks. The offline fix is a targeted change — `studio-layout.tsx` uses raw `useQuery` instead of `useOfflineQuery`, and `blank-pdf-buttons.tsx` does the same. CacheSync already populates Dexie correctly.

**Tech Stack:** Convex (schema, mutations, queries), React 19, Next.js 16 App Router, Dexie (IndexedDB), Tailwind CSS v4, shadcn/ui components

---

## Task 1: Schema — Add customerType + notes to customers table

**Files:**
- Modify: `convex/schema.ts:170-186`

**Step 1: Add new fields to customers table**

In `convex/schema.ts`, update the customers table definition (line 170-186):

```typescript
// ── Customers ────────────────────────────────────────────
customers: defineTable({
  customerType: v.union(v.literal('business'), v.literal('private')),
  company: v.optional(v.string()),  // was: v.string() — now optional for private customers
  firstName: v.string(),
  lastName: v.string(),
  street: v.optional(v.string()),
  zip: v.optional(v.string()),
  city: v.optional(v.string()),
  email: v.string(),
  phone: v.optional(v.string()),
  contactPerson: v.optional(v.string()),
  customerNumber: v.optional(v.string()),
  marketingConsent: v.optional(v.boolean()),
  marketingConsentDate: v.optional(v.number()),
  notes: v.optional(v.string()),
})
  .index('by_email', ['email'])
  .index('by_customerNumber', ['customerNumber'])
  .index('by_company', ['company']),
```

Key changes:
- Add `customerType: v.union(v.literal('business'), v.literal('private'))`
- Change `company` from `v.string()` to `v.optional(v.string())` (private customers may not have a company)
- Add `notes: v.optional(v.string())`

**Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add customerType and notes to customers schema"
```

---

## Task 2: Schema — Add customerActions + customerActionItems tables

**Files:**
- Modify: `convex/schema.ts` (add after customers table)

**Step 1: Add new tables**

Add these two tables right after the customers table definition in `convex/schema.ts`:

```typescript
// ── Customer Actions (admin-configurable checklists) ─────
customerActions: defineTable({
  label: v.string(),
  description: v.optional(v.string()),
  sortOrder: v.number(),
  isActive: v.boolean(),
}).index('by_sortOrder', ['sortOrder']),

customerActionItems: defineTable({
  customerId: v.id('customers'),
  actionId: v.id('customerActions'),
  checked: v.boolean(),
  checkedAt: v.optional(v.number()),
  checkedBy: v.optional(v.id('users')),
  note: v.optional(v.string()),
})
  .index('by_customer', ['customerId'])
  .index('by_customer_action', ['customerId', 'actionId']),
```

**Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add customerActions and customerActionItems tables"
```

---

## Task 3: Backend — Update customer mutations for new fields

**Files:**
- Modify: `convex/customers.ts`

**Step 1: Update create mutation args**

In `convex/customers.ts`, update the `create` mutation args (line 55-67) to include:

```typescript
args: {
  customerType: v.union(v.literal('business'), v.literal('private')),
  company: v.optional(v.string()),
  firstName: v.string(),
  lastName: v.string(),
  street: v.optional(v.string()),
  zip: v.optional(v.string()),
  city: v.optional(v.string()),
  email: v.string(),
  phone: v.optional(v.string()),
  contactPerson: v.optional(v.string()),
  customerNumber: v.optional(v.string()),
  marketingConsent: v.optional(v.boolean()),
  marketingConsentDate: v.optional(v.number()),
  notes: v.optional(v.string()),
},
```

**Step 2: Update update mutation args**

In the `update` mutation (line 89-101), add:

```typescript
customerType: v.optional(v.union(v.literal('business'), v.literal('private'))),
company: v.optional(v.string()),  // already exists
// ... existing fields ...
notes: v.optional(v.string()),
```

**Step 3: Update findOrCreate mutation args**

In the `findOrCreate` mutation (line 124-137), add `customerType` with a default:

```typescript
args: {
  customerType: v.optional(v.union(v.literal('business'), v.literal('private'))),
  company: v.optional(v.string()),  // change from v.string() to v.optional
  // ... rest stays the same ...
},
handler: async (ctx, args) => {
  // ... existing logic ...
  // When creating, default customerType to 'business'
  return ctx.db.insert('customers', {
    ...args,
    customerType: args.customerType ?? 'business',
    company: args.company ?? '',
    customerNumber,
  })
},
```

**Step 4: Update search to also search by customerType display**

In the `search` query (line 38-51), the existing search logic will work as-is since it searches company/name/email. No change needed.

**Step 5: Commit**

```bash
git add convex/customers.ts
git commit -m "feat: update customer mutations for customerType and notes"
```

---

## Task 4: Backend — Create customerActions CRUD

**Files:**
- Create: `convex/customerActions.ts`

**Step 1: Write the full file**

```typescript
import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query('customerActions').withIndex('by_sortOrder').collect()
  },
})

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query('customerActions').withIndex('by_sortOrder').collect()
    return all.filter((a) => a.isActive)
  },
})

export const create = mutation({
  args: {
    label: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('customerActions', args)
  },
})

export const update = mutation({
  args: {
    id: v.id('customerActions'),
    label: v.optional(v.string()),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) updates[key] = value
    }
    await ctx.db.patch(id, updates)
  },
})

export const remove = mutation({
  args: { id: v.id('customerActions') },
  handler: async (ctx, args) => {
    // Also delete all action items referencing this action
    const items = await ctx.db
      .query('customerActionItems')
      .filter((q) => q.eq(q.field('actionId'), args.id))
      .collect()
    for (const item of items) {
      await ctx.db.delete(item._id)
    }
    await ctx.db.delete(args.id)
  },
})
```

**Step 2: Commit**

```bash
git add convex/customerActions.ts
git commit -m "feat: add customerActions CRUD queries and mutations"
```

---

## Task 5: Backend — Create customerActionItems CRUD

**Files:**
- Create: `convex/customerActionItems.ts`

**Step 1: Write the full file**

```typescript
import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const listByCustomer = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('customerActionItems')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .collect()
  },
})

export const toggle = mutation({
  args: {
    customerId: v.id('customers'),
    actionId: v.id('customerActions'),
    checked: v.boolean(),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('customerActionItems')
      .withIndex('by_customer_action', (q) =>
        q.eq('customerId', args.customerId).eq('actionId', args.actionId),
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        checked: args.checked,
        checkedAt: args.checked ? Date.now() : undefined,
        checkedBy: args.checked ? args.userId : undefined,
      })
    } else {
      await ctx.db.insert('customerActionItems', {
        customerId: args.customerId,
        actionId: args.actionId,
        checked: args.checked,
        checkedAt: args.checked ? Date.now() : undefined,
        checkedBy: args.checked ? args.userId : undefined,
      })
    }
  },
})

export const resetForCustomer = mutation({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query('customerActionItems')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .collect()
    for (const item of items) {
      await ctx.db.patch(item._id, {
        checked: false,
        checkedAt: undefined,
        checkedBy: undefined,
      })
    }
  },
})

export const countByCustomer = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query('customerActionItems')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .collect()
    const checked = items.filter((i) => i.checked).length
    return { checked, total: items.length }
  },
})
```

**Step 2: Commit**

```bash
git add convex/customerActionItems.ts
git commit -m "feat: add customerActionItems toggle/reset/count mutations"
```

---

## Task 6: Backend — Seed default customer actions

**Files:**
- Create: `convex/seedCustomerActions.ts`

**Step 1: Write seed mutation**

```typescript
import { mutation } from './_generated/server'

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('customerActions').first()
    if (existing) return // Already seeded

    const defaults = [
      { label: 'Katalog zuschicken', description: 'Produktkatalog per Post oder E-Mail zusenden', sortOrder: 1, isActive: true },
      { label: 'Marketingmaterial senden', description: 'Flyer, Broschueren oder Infomaterial zusenden', sortOrder: 2, isActive: true },
      { label: 'Probefahrt vereinbaren', description: 'Termin fuer eine Probefahrt absprechen', sortOrder: 3, isActive: true },
      { label: 'Rueckruf vereinbaren', description: 'Telefonischen Rueckruf terminieren', sortOrder: 4, isActive: true },
      { label: 'Finanzierungsangebot erstellen', description: 'Finanzierungsoptionen zusammenstellen', sortOrder: 5, isActive: true },
      { label: 'Wartungsvertrag anbieten', description: 'Informationen zu Wartungsvertraegen bereitstellen', sortOrder: 6, isActive: true },
    ]

    for (const action of defaults) {
      await ctx.db.insert('customerActions', action)
    }
  },
})
```

**Step 2: Commit**

```bash
git add convex/seedCustomerActions.ts
git commit -m "feat: add seed mutation for default customer actions"
```

---

## Task 7: Backend — Backfill existing customers with customerType

**Files:**
- Create: `convex/migrations/backfillCustomerType.ts`

**Step 1: Write migration**

```typescript
import { mutation } from '../_generated/server'

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query('customers').collect()
    let updated = 0
    for (const customer of customers) {
      if (!(customer as any).customerType) {
        await ctx.db.patch(customer._id, { customerType: 'business' as const })
        updated++
      }
    }
    return { updated, total: customers.length }
  },
})
```

**Step 2: Commit**

```bash
mkdir -p convex/migrations
git add convex/migrations/backfillCustomerType.ts
git commit -m "feat: add migration to backfill customerType on existing customers"
```

---

## Task 8: Deploy schema + run migrations

**Step 1: Deploy Convex**

```bash
npx convex deploy --yes
```

**Step 2: Run backfill migration (via Convex dashboard or CLI)**

Run `migrations:backfillCustomerType:run` once to set all existing customers to `"business"`.

**Step 3: Run seed (via Convex dashboard or CLI)**

Run `seedCustomerActions:seed` once to create default actions.

**Step 4: Commit (no file changes — deployment confirmation)**

---

## Task 9: Frontend — Update customer form with customerType toggle + notes

**Files:**
- Modify: `src/components/admin/customer-form.tsx`

**Step 1: Add customerType and notes state**

Add to the state declarations (after line 44):

```typescript
const [customerType, setCustomerType] = useState<'business' | 'private'>('business')
const [notes, setNotes] = useState('')
```

**Step 2: Load customerType and notes from existing customer**

In the `useEffect` (line 48-74), add:

```typescript
setCustomerType((customer as any).customerType ?? 'business')
setNotes((customer as any).notes ?? '')
```

And in the reset branch:

```typescript
setCustomerType('business')
setNotes('')
```

**Step 3: Add customerType toggle UI**

Add at the very top of the form (before the company field), a toggle group:

```tsx
<div className="space-y-2">
  <Label>Kundentyp</Label>
  <div className="flex gap-2">
    <Button
      type="button"
      variant={customerType === 'business' ? 'default' : 'outline'}
      size="sm"
      className="flex-1"
      onClick={() => setCustomerType('business')}
    >
      Geschaeftlich
    </Button>
    <Button
      type="button"
      variant={customerType === 'private' ? 'default' : 'outline'}
      size="sm"
      className="flex-1"
      onClick={() => setCustomerType('private')}
    >
      Privat
    </Button>
  </div>
</div>
```

**Step 4: Make company field conditional**

Change the company field: if `customerType === 'private'`, remove `required` and change label to "Firma (optional)":

```tsx
<div className="space-y-2">
  <Label htmlFor="customer-company">
    {customerType === 'business' ? 'Firma *' : 'Firma (optional)'}
  </Label>
  <Input
    id="customer-company"
    value={company}
    onChange={(e) => setCompany(e.target.value)}
    placeholder="Mustermann GmbH"
    required={customerType === 'business'}
  />
</div>
```

**Step 5: Hide contactPerson for private customers**

Wrap the contactPerson field:

```tsx
{customerType === 'business' && (
  <div className="space-y-2">
    <Label htmlFor="customer-contactPerson">Ansprechpartner</Label>
    <Input ... />
  </div>
)}
```

**Step 6: Add notes textarea**

Add after the contactPerson field:

```tsx
<div className="space-y-2">
  <Label htmlFor="customer-notes">Notizen</Label>
  <textarea
    id="customer-notes"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="Notizen zum Kunden..."
    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    rows={3}
  />
</div>
```

**Step 7: Update validation in handleSubmit**

Change the company validation (line 82-85):

```typescript
if (customerType === 'business' && !trimmedCompany) {
  toast.error('Bitte eine Firma eingeben.')
  return
}
```

**Step 8: Pass new fields to mutations**

In the create and update calls, add `customerType`, `notes`, and ensure `company` can be empty string:

```typescript
await createCustomer({
  customerType,
  company: trimmedCompany || '',
  // ... existing fields ...
  notes: notes.trim() || undefined,
})
```

Same for `updateCustomer`.

**Step 9: Commit**

```bash
git add src/components/admin/customer-form.tsx
git commit -m "feat: add customerType toggle and notes to customer form"
```

---

## Task 10: Frontend — Admin settings for customer actions

**Files:**
- Create: `src/components/admin/customer-actions-settings.tsx`

**Step 1: Write the component**

This follows the existing admin form pattern (Sheet-based, similar to `category-form.tsx`). Build a simple list with add/edit/delete functionality:

- List all customer actions from `api.customerActions.list`
- Each row: label, description, sort order, active toggle, edit/delete buttons
- "Neue Aktion" button opens inline form or Sheet
- Use `useMutation(api.customerActions.create/update/remove)`

The component should be structured as:

```tsx
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'

// Full CRUD UI for customer action definitions
// List + inline add/edit form
```

**Step 2: Integrate into admin dashboard**

Add a new tab or section in the admin settings page that renders `<CustomerActionsSettings />`. Look at how existing admin tabs are structured and follow the same pattern.

**Step 3: Commit**

```bash
git add src/components/admin/customer-actions-settings.tsx
git commit -m "feat: add admin UI for managing customer actions"
```

---

## Task 11: Frontend — Customer actions checklist component

**Files:**
- Create: `src/components/customers/customer-actions-checklist.tsx`

**Step 1: Write the component**

A reusable component that shows all active actions for a given customer with checkboxes:

```tsx
'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/modules/auth/auth-store'
import { formatDate } from '@/lib/utils'

interface CustomerActionsChecklistProps {
  customerId: string
}

export function CustomerActionsChecklist({ customerId }: CustomerActionsChecklistProps) {
  const actions = useQuery(api.customerActions.listActive)
  const items = useQuery(api.customerActionItems.listByCustomer, {
    customerId: customerId as Id<'customers'>,
  })
  const toggle = useMutation(api.customerActionItems.toggle)
  const reset = useMutation(api.customerActionItems.resetForCustomer)
  const { user } = useAuthStore()

  // ... render checklist with each action as a checkbox row
  // Show checkedAt + checkedBy name when checked
  // "Alle zuruecksetzen" button calls reset mutation
}
```

**Step 2: Commit**

```bash
mkdir -p src/components/customers
git add src/components/customers/customer-actions-checklist.tsx
git commit -m "feat: add customer actions checklist component"
```

---

## Task 12: Frontend — Integrate checklist into customer detail view

**Files:**
- Modify: The component where customer details are shown (likely accessed from pipeline card click → `/documents/[id]` page, or a customer detail dialog)

**Step 1: Find and modify the customer detail view**

Search for where customer data is displayed in detail (document detail page or customer detail). Add the `<CustomerActionsChecklist customerId={customer._id} />` component below the customer information section.

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: integrate customer actions checklist into customer detail"
```

---

## Task 13: Frontend — Pipeline card action badge

**Files:**
- Modify: `src/components/documents/pipeline-card.tsx`
- Modify: `convex/documents.ts` (listForPipeline query to include action counts)

**Step 1: Add action count to pipeline query**

In `convex/documents.ts`, the `listForPipeline` query already enriches documents. Add a step that counts customer action items for each document's customer:

For each document with a `customerId`, query `customerActionItems` by customer and compute `{checked, total}`.

**Step 2: Show badge in pipeline card**

In `pipeline-card.tsx`, add after the customer name line (line 92-94):

```tsx
{doc.actionCount && doc.actionCount.total > 0 && (
  <span className="text-xs text-muted-foreground">
    {doc.actionCount.checked}/{doc.actionCount.total} erledigt
  </span>
)}
```

**Step 3: Commit**

```bash
git add src/components/documents/pipeline-card.tsx convex/documents.ts
git commit -m "feat: show customer action progress badge on pipeline cards"
```

---

## Task 14: Offline Fix — Studio layout uses useOfflineQuery

**Files:**
- Modify: `src/components/configurator/studio-layout.tsx`

**Step 1: Identify the bug**

The root cause is confirmed: `studio-layout.tsx` uses raw `useQuery` (line 4, 515, 520, 544) instead of `useOfflineQuery`. The `CacheSync` component in `layout.tsx` already correctly writes catalog data to Dexie. But `studio-layout.tsx` never reads from Dexie when offline.

**Step 2: Replace useQuery with useOfflineQuery**

Change the import (line 4):

```typescript
// BEFORE:
import { useQuery } from 'convex/react'

// AFTER:
import { useQuery } from 'convex/react'
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { db } from '@/modules/storage/db'
```

Replace the three main queries:

**baseModel query (line 515-518):**
```typescript
const baseModel = useOfflineQuery(
  api.baseModels.getById,
  selectedBaseModelId ? { id: selectedBaseModelId as Id<'baseModels'> } : 'skip',
  async () => {
    if (!selectedBaseModelId) return undefined
    const record = await db.baseModels.get(selectedBaseModelId)
    if (!record) return undefined
    return { ...record, _id: record.id, imageUrl: null } as any
  },
)
```

**groupsWithOptions query (line 520-522):**
```typescript
const groupsWithOptions = useOfflineQuery(
  api.optionGroups.listWithOptionsForCategory,
  selectedCategory ? { categoryId: selectedCategory, baseModelId: selectedBaseModelId ?? undefined } : 'skip',
  async () => {
    if (!selectedCategory) return undefined
    const groups = await db.optionGroups.filter((g) => g.isActive).sortBy('sortOrder')
    const allOptions = await db.options.filter((o) => o.isActive).toArray()
    return groups
      .filter((g) => g.appliesTo.length === 0 || g.appliesTo.includes(selectedCategory))
      .map((g) => ({
        ...g,
        _id: g.id,
        options: allOptions
          .filter((o) => o.optionGroupId === g.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((o) => ({ ...o, _id: o.id, imageUrl: null })),
      }))
  },
)
```

**Note:** The `colorImages` query (line 544) can stay as `useQuery` since color variant images are not cached in Dexie and are a nice-to-have for offline mode. Alternatively, return an empty array as fallback.

**Step 3: Commit**

```bash
git add src/components/configurator/studio-layout.tsx
git commit -m "fix: use useOfflineQuery in studio layout for offline support"
```

---

## Task 15: Offline Fix — Blanko PDF uses offline-capable data

**Files:**
- Modify: `src/components/dashboard/blank-pdf-buttons.tsx`

**Step 1: Replace useQuery with useOfflineQuery**

The `blank-pdf-buttons.tsx` currently uses 5x raw `useQuery` (lines 14-18). Replace them with `useOfflineQuery`:

```typescript
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { db } from '@/modules/storage/db'

// Replace each useQuery:
const categories = useOfflineQuery(
  api.categories.listActive,
  {},
  async () => {
    const all = await db.categories.filter((c) => c.isActive).sortBy('sortOrder')
    return all.map((c) => ({ ...c, _id: c.id, imageUrl: null }))
  },
)

const allBaseModels = useOfflineQuery(
  api.baseModels.list,
  {},
  async () => {
    const all = await db.baseModels.toArray()
    return all.map((m) => ({ ...m, _id: m.id }))
  },
)

const allOptionGroups = useOfflineQuery(
  api.optionGroups.list,
  {},
  async () => {
    const all = await db.optionGroups.toArray()
    return all.map((g) => ({ ...g, _id: g.id }))
  },
)

const allOptions = useOfflineQuery(
  api.options.list,
  {},
  async () => {
    const all = await db.options.toArray()
    return all.map((o) => ({ ...o, _id: o.id }))
  },
)

const allSettings = useOfflineQuery(
  api.settings.list,
  {},
  async () => {
    const all = await db.settings.toArray()
    return all
  },
)
```

**Step 2: Handle logo URL offline**

The logo URL query (`api.files.getUrl`) also needs an offline fallback. When offline, skip the logo or use a cached version. The simplest approach is to catch the fetch error in `handleDownload` and proceed without logo:

```typescript
let logoBytesForBlank: Uint8Array | undefined
if (logoUrl) {
  try {
    const res = await fetch(logoUrl)
    logoBytesForBlank = new Uint8Array(await res.arrayBuffer())
  } catch {
    // Offline — proceed without logo
  }
}
```

Same for category image fetch.

**Step 3: Commit**

```bash
git add src/components/dashboard/blank-pdf-buttons.tsx
git commit -m "fix: use useOfflineQuery in blank PDF buttons for offline support"
```

---

## Task 16: Final deploy + test

**Step 1: Deploy Convex**

```bash
npx convex deploy --yes
```

**Step 2: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

**Step 3: Manual test checklist**

- [ ] Create a new customer as "Privat" — Firma should be optional, Ansprechpartner hidden
- [ ] Create a new customer as "Geschaeftlich" — Firma required, Ansprechpartner visible
- [ ] Edit existing customer — notes field works, customerType toggles
- [ ] Admin dashboard — customer actions settings: add, edit, reorder, deactivate
- [ ] Customer detail — checklist shows, toggle works, reset works
- [ ] Pipeline card — shows "X/Y erledigt" badge
- [ ] Offline: Load app online → go offline → Studio view shows categories + models + options
- [ ] Offline: Blanko PDF generates with cached data

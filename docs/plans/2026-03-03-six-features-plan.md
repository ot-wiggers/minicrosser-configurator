# 6 Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 6 features: price-on-request, admin option filters, new configurator flow with auto-comfort + upgrades, document pipeline with auto-reminders, and email tracking via Resend webhooks.

**Architecture:** Convex schema extensions for new fields/tables, Convex cron for pipeline automation, Convex HTTP actions for webhook receiver, frontend component changes in configurator + admin + documents.

**Tech Stack:** Convex (backend), Next.js 16 + React 19 (frontend), Zustand (state), pdf-lib (PDF), svix (webhook verification), Resend (email)

---

## Task 1: Convex Schema Extensions

**Files:**
- Modify: `convex/schema.ts`
- Modify: `src/modules/storage/types.ts`
- Modify: `src/modules/catalog/db-types.ts`

**Step 1: Add priceOnRequest + isDefault + upgradeLabel to schema**

In `convex/schema.ts`, add to `baseModels` table definition (after `isActive: v.boolean()`):

```typescript
priceOnRequest: v.optional(v.boolean()),
isDefault: v.optional(v.boolean()),
upgradeLabel: v.optional(v.string()),
```

Add to `options` table definition (after `isDefault: v.boolean()`):

```typescript
priceOnRequest: v.optional(v.boolean()),
```

**Step 2: Extend document status union and add pipeline fields**

Replace the `status` field in the `documents` table:

```typescript
status: v.union(
  v.literal('DRAFT'),
  v.literal('FINAL'),
  v.literal('SENT'),
  v.literal('FOLLOW_UP'),
  v.literal('ACCEPTED'),
  v.literal('DECLINED'),
  v.literal('EXPIRED'),
  v.literal('ARCHIVED'),
),
```

Add new fields after `createdBy` in `documents`:

```typescript
sentAt: v.optional(v.number()),
followUpAt: v.optional(v.number()),
archivedAt: v.optional(v.number()),
pipelineNote: v.optional(v.string()),
```

Add `priceOnRequest` to `lineItemValidator` and `hasOnRequestItems` to `pricingValidator` (these are validators in `convex/documents.ts`, but they must match the schema shape — we'll add optional fields):

In the `documents` table pricing object, update to:

```typescript
pricing: v.object({
  lineItems: v.array(
    v.object({
      skuCode: v.string(),
      articleNo: v.string(),
      name: v.string(),
      quantity: v.number(),
      unitPriceNet: v.number(),
      totalNet: v.number(),
      priceOnRequest: v.optional(v.boolean()),
    }),
  ),
  totalNet: v.number(),
  vatRate: v.number(),
  vatAmount: v.number(),
  totalGross: v.number(),
  hasOnRequestItems: v.optional(v.boolean()),
}),
```

Also update `selectedOptions` array to include priceOnRequest:

```typescript
selectedOptions: v.array(
  v.object({
    optionItemId: v.string(),
    skuCode: v.string(),
    articleNo: v.string(),
    name: v.string(),
    priceNet: v.number(),
    quantity: v.number(),
    priceOnRequest: v.optional(v.boolean()),
  }),
),
```

**Step 3: Add resendMessageId to outbox**

In the `outbox` table, add after `lastError`:

```typescript
resendMessageId: v.optional(v.string()),
```

**Step 4: Add emailEvents table**

Add new table after outbox:

```typescript
emailEvents: defineTable({
  outboxId: v.id('outbox'),
  documentId: v.id('documents'),
  resendMessageId: v.string(),
  eventType: v.union(
    v.literal('delivered'),
    v.literal('opened'),
    v.literal('clicked'),
    v.literal('bounced'),
  ),
  timestamp: v.number(),
  metadata: v.optional(v.string()),
})
  .index('by_documentId', ['documentId', 'timestamp'])
  .index('by_resendMessageId', ['resendMessageId']),
```

**Step 5: Update TypeScript types**

In `src/modules/storage/types.ts`:
- Update `DocumentStatus` type:
  ```typescript
  export type DocumentStatus = 'DRAFT' | 'FINAL' | 'SENT' | 'FOLLOW_UP' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'ARCHIVED'
  ```
- Add `priceOnRequest?: boolean` to `SelectedOption`
- Add `priceOnRequest?: boolean` to `LineItem`
- Add `hasOnRequestItems?: boolean` to `PricingSummary`

In `src/modules/catalog/db-types.ts`:
- Add `priceOnRequest?: boolean` to `BaseModelRecord`
- Add `isDefault?: boolean` to `BaseModelRecord`
- Add `upgradeLabel?: string` to `BaseModelRecord`
- Add `priceOnRequest?: boolean` to `OptionRecord`

**Step 6: Commit**

```bash
git add convex/schema.ts src/modules/storage/types.ts src/modules/catalog/db-types.ts
git commit -m "feat: extend schema for 6 new features (pipeline statuses, priceOnRequest, isDefault, emailEvents)"
```

---

## Task 2: Convex Mutation Updates (baseModels, options, documents)

**Files:**
- Modify: `convex/baseModels.ts`
- Modify: `convex/options.ts`
- Modify: `convex/documents.ts`
- Modify: `convex/outbox.ts`

**Step 1: Update baseModels CRUD**

In `convex/baseModels.ts`, add to `create` args:

```typescript
priceOnRequest: v.optional(v.boolean()),
isDefault: v.optional(v.boolean()),
upgradeLabel: v.optional(v.string()),
```

Add to `update` args:

```typescript
priceOnRequest: v.optional(v.boolean()),
isDefault: v.optional(v.boolean()),
upgradeLabel: v.optional(v.string()),
```

Add a new query `getDefaultByCategory`:

```typescript
export const getDefaultByCategory = query({
  args: { categoryId: v.id('categories') },
  handler: async (ctx, args) => {
    const models = await ctx.db
      .query('baseModels')
      .withIndex('by_categoryId', (q) => q.eq('categoryId', args.categoryId))
      .collect()
    const defaultModel = models.find((m) => m.isDefault && m.isActive)
    if (!defaultModel) return null
    return {
      ...defaultModel,
      imageUrl: defaultModel.imageStorageId
        ? await ctx.storage.getUrl(defaultModel.imageStorageId)
        : null,
    }
  },
})
```

**Step 2: Update options CRUD**

In `convex/options.ts`, add to `create` args:

```typescript
priceOnRequest: v.optional(v.boolean()),
```

Add to `update` args:

```typescript
priceOnRequest: v.optional(v.boolean()),
```

**Step 3: Update documents mutations**

In `convex/documents.ts`:

Update the `lineItemValidator`:

```typescript
const lineItemValidator = v.object({
  skuCode: v.string(),
  articleNo: v.string(),
  name: v.string(),
  quantity: v.number(),
  unitPriceNet: v.number(),
  totalNet: v.number(),
  priceOnRequest: v.optional(v.boolean()),
})
```

Update the `pricingValidator`:

```typescript
const pricingValidator = v.object({
  lineItems: v.array(lineItemValidator),
  totalNet: v.number(),
  vatRate: v.number(),
  vatAmount: v.number(),
  totalGross: v.number(),
  hasOnRequestItems: v.optional(v.boolean()),
})
```

Update the `selectedOptionValidator`:

```typescript
const selectedOptionValidator = v.object({
  optionItemId: v.string(),
  skuCode: v.string(),
  articleNo: v.string(),
  name: v.string(),
  priceNet: v.number(),
  quantity: v.number(),
  priceOnRequest: v.optional(v.boolean()),
})
```

Update `updateStatus` to accept all new statuses:

```typescript
export const updateStatus = mutation({
  args: {
    id: v.id('documents'),
    status: v.union(
      v.literal('DRAFT'),
      v.literal('FINAL'),
      v.literal('SENT'),
      v.literal('FOLLOW_UP'),
      v.literal('ACCEPTED'),
      v.literal('DECLINED'),
      v.literal('EXPIRED'),
      v.literal('ARCHIVED'),
    ),
    sentAt: v.optional(v.number()),
    followUpAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    pipelineNote: v.optional(v.string()),
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
```

Update `listByStatus` to accept all statuses:

```typescript
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal('DRAFT'),
      v.literal('FINAL'),
      v.literal('SENT'),
      v.literal('FOLLOW_UP'),
      v.literal('ACCEPTED'),
      v.literal('DECLINED'),
      v.literal('EXPIRED'),
      v.literal('ARCHIVED'),
    ),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query('documents')
      .withIndex('by_status', (q) => q.eq('status', args.status))
      .collect()
  },
})
```

Add `create` args for pipeline fields:

```typescript
sentAt: v.optional(v.number()),
```

**Step 4: Update outbox**

In `convex/outbox.ts`, add to `create` args:

```typescript
resendMessageId: v.optional(v.string()),
```

Add to `updateStatus` args:

```typescript
resendMessageId: v.optional(v.string()),
```

And in the handler, add:

```typescript
if (args.resendMessageId !== undefined) updates.resendMessageId = args.resendMessageId
```

**Step 5: Commit**

```bash
git add convex/baseModels.ts convex/options.ts convex/documents.ts convex/outbox.ts
git commit -m "feat: update CRUD mutations for new fields (priceOnRequest, pipeline, resendMessageId)"
```

---

## Task 3: Feature 1 — Preis auf Anfrage (Pricing + Admin Forms)

**Files:**
- Modify: `src/modules/pricing/calc.ts`
- Modify: `src/components/admin/model-form.tsx`
- Modify: `src/components/admin/option-form.tsx`

**Step 1: Update pricing calculation**

In `src/modules/pricing/calc.ts`, update the `PricingItem` interface and function:

```typescript
interface PricingItem {
  skuCode: string
  articleNo: string
  name: string
  priceNet: number
  priceOnRequest?: boolean
}

export function calculatePricingFromItems(
  baseModel: PricingItem,
  selectedOptions: Array<PricingItem & { quantity: number }>,
  vatRate: number = VAT_RATE,
): PricingSummary {
  const lineItems: LineItem[] = []

  // Base model line item
  lineItems.push({
    skuCode: baseModel.skuCode,
    articleNo: baseModel.articleNo,
    name: baseModel.name,
    quantity: 1,
    unitPriceNet: baseModel.priceOnRequest ? 0 : baseModel.priceNet,
    totalNet: baseModel.priceOnRequest ? 0 : baseModel.priceNet,
    priceOnRequest: baseModel.priceOnRequest,
  })

  // Option line items
  for (const opt of selectedOptions) {
    const qty = opt.quantity || 1
    lineItems.push({
      skuCode: opt.skuCode,
      articleNo: opt.articleNo,
      name: opt.name,
      quantity: qty,
      unitPriceNet: opt.priceOnRequest ? 0 : opt.priceNet,
      totalNet: opt.priceOnRequest ? 0 : opt.priceNet * qty,
      priceOnRequest: opt.priceOnRequest,
    })
  }

  const hasOnRequestItems = lineItems.some((item) => item.priceOnRequest)
  const totalNet = lineItems.reduce((sum, item) => sum + item.totalNet, 0)
  const vatAmount = Math.round(totalNet * vatRate * 100) / 100
  const totalGross = Math.round((totalNet + vatAmount) * 100) / 100

  return {
    lineItems,
    totalNet: Math.round(totalNet * 100) / 100,
    vatRate,
    vatAmount,
    totalGross,
    hasOnRequestItems,
  }
}
```

**Step 2: Add priceOnRequest checkbox to model-form.tsx**

In `src/components/admin/model-form.tsx`, add `priceOnRequest` to the form state:

In the initial state object (both the `if (model)` branch and the default), add:

```typescript
priceOnRequest: model?.priceOnRequest ?? false,
// (or false for default)
```

In the `useEffect` that populates from loaded model, add:

```typescript
priceOnRequest: model.priceOnRequest ?? false,
```

In the JSX, add a new switch BEFORE the price fields (after the Description section):

```tsx
{/* Price on Request */}
<div className="flex items-center gap-3">
  <Switch
    id="priceOnRequest"
    checked={form.priceOnRequest}
    onCheckedChange={(checked) => updateField('priceOnRequest', checked)}
  />
  <Label htmlFor="priceOnRequest">Preis auf Anfrage</Label>
</div>
```

Wrap the price fields (priceNet + priceGross sections) in a conditional:

```tsx
{!form.priceOnRequest && (
  <>
    {/* existing Price Net div */}
    {/* existing Price Gross div */}
  </>
)}
```

In `handleSubmit`, include `priceOnRequest` in both create and update args:

```typescript
priceOnRequest: form.priceOnRequest || undefined,
```

**Step 3: Add priceOnRequest checkbox to option-form.tsx**

In `src/components/admin/option-form.tsx`, add state:

```typescript
const [priceOnRequest, setPriceOnRequest] = useState(option?.priceOnRequest ?? false)
```

In `useEffect` for option data load:

```typescript
setPriceOnRequest(option.priceOnRequest ?? false)
```

In JSX, add switch before price fields:

```tsx
{/* Price on Request */}
<div className="flex items-center justify-between">
  <Label htmlFor="priceOnRequest">Preis auf Anfrage</Label>
  <Switch id="priceOnRequest" checked={priceOnRequest} onCheckedChange={setPriceOnRequest} />
</div>
```

Wrap price fields in conditional `{!priceOnRequest && (...)}`.

In `handleSubmit`, add `priceOnRequest: priceOnRequest || undefined` to both create and update args. When `priceOnRequest` is true, set `priceNet: 0` and `priceGross: 0`.

**Step 4: Commit**

```bash
git add src/modules/pricing/calc.ts src/components/admin/model-form.tsx src/components/admin/option-form.tsx
git commit -m "feat: add price-on-request to pricing calc and admin forms"
```

---

## Task 4: Feature 1 — Preis auf Anfrage (Configurator + PDF)

**Files:**
- Modify: `src/components/configurator/accessory-picker.tsx`
- Modify: `src/components/configurator/model-picker.tsx`
- Modify: `src/components/configurator/cart-sidebar.tsx`
- Modify: `src/modules/pdf/generator.ts`

**Step 1: Show "Preis auf Anfrage" in accessory-picker**

In `src/components/configurator/accessory-picker.tsx`:

In `SingleGroup`, update the price display at line ~89:

```tsx
<p className="font-semibold">
  {item.priceOnRequest
    ? 'a.A.'
    : item.priceNet > 0
      ? formatCurrency(item.priceNet)
      : 'Inklusive'}
</p>
```

Also update the `toggleOption` call in `handleSelect` to include priceOnRequest:

```typescript
toggleOption({
  optionItemId: item._id,
  skuCode: item.skuCode,
  articleNo: item.articleNo,
  name: item.name,
  priceNet: item.priceNet,
  quantity: 1,
  priceOnRequest: item.priceOnRequest || undefined,
})
```

Same for `MultiGroup` — update price display and toggleOption call.

**Step 2: Show "Preis auf Anfrage" in model-picker**

In `src/components/configurator/model-picker.tsx`, update the price line (line ~68-71):

```tsx
<p className="mt-2 text-lg font-bold text-primary">
  {model.priceOnRequest ? (
    'Preis auf Anfrage'
  ) : (
    <>
      ab {formatCurrency(model.priceNet)}{' '}
      <span className="text-sm font-normal text-muted-foreground">netto</span>
    </>
  )}
</p>
```

**Step 3: Show "a.A." in cart-sidebar**

In `src/components/configurator/cart-sidebar.tsx`, update line item display to handle priceOnRequest:

In the pricing line items map (line ~71-78):

```tsx
{pricing.lineItems.map((item, idx) => (
  <div key={idx} className="flex justify-between text-sm">
    <span className="flex-1">
      {item.name}
      {item.quantity > 1 && ` x${item.quantity}`}
    </span>
    <span className="font-medium">
      {item.priceOnRequest ? 'a.A.' : formatCurrency(item.totalNet)}
    </span>
  </div>
))}
```

In the totals section, after the Brutto line, add:

```tsx
{pricing.hasOnRequestItems && (
  <p className="text-xs text-muted-foreground">* zzgl. Positionen auf Anfrage</p>
)}
```

**Step 4: Update PDF generator for "a.A."**

In `src/modules/pdf/generator.ts`, update the line items rendering loop (around line 183-188):

```typescript
// Replace the unit price and total lines:
if ((item as any).priceOnRequest) {
  drawTextRight(ctx, 'a.A.', colUnit, { size: 9 })
  drawTextRight(ctx, 'a.A.', colTotal, { size: 9 })
} else {
  drawTextRight(ctx, formatCurrencyPdf(item.unitPriceNet), colUnit, { size: 9 })
  drawTextRight(ctx, formatCurrencyPdf(item.totalNet), colTotal, { size: 9 })
}
```

After the summary section (after the Brutto line, around line 222), add:

```typescript
if ((doc.pricing as any).hasOnRequestItems) {
  moveDown(ctx, 8)
  drawText(ctx, '* zzgl. Positionen auf Anfrage', summaryX, {
    size: 8,
    color: { r: 0.5, g: 0.5, b: 0.5 },
  })
}
```

Update the `ConvexDocument` interface to include the `hasOnRequestItems` and `priceOnRequest` fields, or cast appropriately.

**Step 5: Commit**

```bash
git add src/components/configurator/accessory-picker.tsx src/components/configurator/model-picker.tsx src/components/configurator/cart-sidebar.tsx src/modules/pdf/generator.ts
git commit -m "feat: display price-on-request in configurator and PDF"
```

---

## Task 5: Feature 2 — Admin Options Filter (Volltextsuche + Sortierung)

**Files:**
- Modify: `src/app/admin/(authenticated)/options/page.tsx`

**Step 1: Add search input and sortable columns**

Replace the entire `OptionsPage` component. The current page already has a table layout and group filter dropdown. We need to add:

1. A search `Input` field above the table
2. Category filter dropdown alongside the existing group filter
3. Sortable table headers (click to toggle ASC/DESC)

Add state for search and sort:

```typescript
const [searchQuery, setSearchQuery] = useState('')
const [sortField, setSortField] = useState<string>('name')
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
```

Add categories query:

```typescript
const categories = useQuery(api.categories.list)
const [filterCategoryId, setFilterCategoryId] = useState('__all__')
```

Update `filteredOptions` useMemo to include search + category filter + sort:

```typescript
const filteredOptions = useMemo(() => {
  if (!options || !optionGroups) return []
  let result = [...options]

  // Group filter
  if (filterGroupId !== ALL_GROUPS) {
    result = result.filter((o) => o.optionGroupId === filterGroupId)
  }

  // Category filter
  if (filterCategoryId !== '__all__') {
    const applicableGroupIds = new Set(
      optionGroups
        .filter((g) => g.appliesTo.length === 0 || g.appliesTo.includes(filterCategoryId))
        .map((g) => g._id),
    )
    result = result.filter((o) => applicableGroupIds.has(o.optionGroupId))
  }

  // Text search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.skuCode.toLowerCase().includes(q) ||
        o.articleNo.toLowerCase().includes(q),
    )
  }

  // Sort
  result.sort((a, b) => {
    let aVal: any, bVal: any
    switch (sortField) {
      case 'name': aVal = a.name; bVal = b.name; break
      case 'skuCode': aVal = a.skuCode; bVal = b.skuCode; break
      case 'articleNo': aVal = a.articleNo; bVal = b.articleNo; break
      case 'priceNet': aVal = a.priceNet; bVal = b.priceNet; break
      case 'group': aVal = groupMap.get(a.optionGroupId) ?? ''; bVal = groupMap.get(b.optionGroupId) ?? ''; break
      default: aVal = a.name; bVal = b.name
    }
    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal
  })

  return result
}, [options, optionGroups, filterGroupId, filterCategoryId, searchQuery, sortField, sortDir, groupMap])
```

Add `toggleSort` helper:

```typescript
function toggleSort(field: string) {
  if (sortField === field) {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
  } else {
    setSortField(field)
    setSortDir('asc')
  }
}
```

Add Search input and Category filter dropdown above the table, in the same row as the existing group filter. Make table headers clickable with sort indicators (ArrowUp/ArrowDown icons).

**Step 2: Commit**

```bash
git add src/app/admin/(authenticated)/options/page.tsx
git commit -m "feat: add search, category filter, and sortable columns to admin options"
```

---

## Task 6: Feature 3+4 — New Configurator Flow (Auto-Comfort + Upgrade Picker)

**Files:**
- Modify: `src/modules/configurator/store.ts`
- Create: `src/components/configurator/upgrade-picker.tsx`
- Modify: `src/components/configurator/accessory-picker.tsx`
- Modify: `src/components/configurator/category-picker.tsx`

**Step 1: Update configurator store for auto-default model**

In `src/modules/configurator/store.ts`, the `setCategory` action currently sets `selectedBaseModelId: null`. We need it to auto-select the default model. However, the store doesn't have access to Convex queries. Instead, we'll add a new action `setCategoryWithDefaultModel`:

```typescript
setCategoryWithDefaultModel: (categoryId: string, defaultModelId: string | null) =>
  set({
    selectedCategory: categoryId,
    selectedBaseModelId: defaultModelId,
    selectedOptions: {},
    currentStep: defaultModelId ? 2 : 1,
  }),
```

Keep the existing `setCategory` for backwards compatibility but the UI will call `setCategoryWithDefaultModel` instead.

**Step 2: Update category-picker to auto-select default model**

In `src/components/configurator/category-picker.tsx`:

Add a query for all base models to find the default:

```typescript
const allModels = useOfflineQuery(
  api.baseModels.list,
  {},
  async () => {
    const all = await db.baseModels.toArray()
    return all.map((m) => ({ ...m, _id: m.id, imageUrl: null }))
  },
)
```

Use `setCategoryWithDefaultModel` from the store. On category click:

```typescript
onClick={() => {
  const defaultModel = allModels?.find(
    (m) => m.categoryId === cat._id && m.isDefault && m.isActive,
  )
  setCategoryWithDefaultModel(cat._id, defaultModel?._id ?? null)
}}
```

**Step 3: Create upgrade-picker.tsx**

Create `src/components/configurator/upgrade-picker.tsx`:

```tsx
'use client'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useConfiguratorStore } from '@/modules/configurator'
import { useOfflineQuery } from '@/hooks/use-offline-query'
import { useOfflineImage } from '@/hooks/use-offline-image'
import { db } from '@/modules/storage/db'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { Check, Car } from 'lucide-react'

function UpgradeModelImage({ model }: { model: any }) {
  const imgSrc = useOfflineImage(model.imageUrl, model._id, 'baseModels')
  if (imgSrc) {
    return <img src={imgSrc} alt={model.name} className="h-16 w-16 rounded-md object-cover" />
  }
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
      <Car className="h-8 w-8 text-muted-foreground/40" />
    </div>
  )
}

export function UpgradePicker() {
  const { selectedCategory, selectedBaseModelId, setBaseModel } = useConfiguratorStore()

  const models = useOfflineQuery(
    api.baseModels.listActiveByCategory,
    selectedCategory ? { categoryId: selectedCategory as Id<'categories'> } : 'skip',
    async () => {
      if (!selectedCategory) return []
      const all = await db.baseModels
        .where('categoryId')
        .equals(selectedCategory)
        .and((m) => m.isActive)
        .sortBy('sortOrder')
      return all.map((m) => ({ ...m, _id: m.id, imageUrl: null }))
    },
  )

  if (!selectedCategory || !models || models.length <= 1) return null

  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">Modell-Upgrade</h3>
      <div className="space-y-2">
        {models.map((model) => {
          const isSelected = selectedBaseModelId === model._id
          return (
            <Card
              key={model._id}
              className={cn(
                'cursor-pointer transition-all hover:border-primary/50',
                isSelected && 'border-primary ring-2 ring-primary/20',
              )}
              onClick={() => setBaseModel(model._id)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <UpgradeModelImage model={model} />
                <div className="flex-1">
                  <p className="font-medium">
                    {model.upgradeLabel || model.name}
                  </p>
                  {model.description && (
                    <div
                      className="mt-0.5 text-sm text-muted-foreground line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: model.description }}
                    />
                  )}
                </div>
                <p className="text-right font-semibold">
                  {model.priceOnRequest ? (
                    'a.A.'
                  ) : (
                    <>
                      {formatCurrency(model.priceNet)}
                      <span className="block text-xs font-normal text-muted-foreground">netto</span>
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 4: Insert UpgradePicker before AccessoryPicker**

In `src/components/configurator/accessory-picker.tsx`, import and render `UpgradePicker` at the top of the options step:

```tsx
import { UpgradePicker } from './upgrade-picker'
```

In the `AccessoryPicker` component's JSX return, add `<UpgradePicker />` before the options groups:

```tsx
return (
  <div>
    <h2 className="mb-2 text-xl font-semibold">Zubehör & Optionen</h2>
    <p className="mb-6 text-muted-foreground">Passen Sie Ihr Fahrzeug individuell an</p>
    <div className="space-y-6">
      <UpgradePicker />
      {groupsWithOptions.map(({ group, items }, idx: number) => (
        // ... existing code
      ))}
    </div>
  </div>
)
```

Add a Separator before the first option group when UpgradePicker is present.

**Step 5: Update model-form.tsx for isDefault + upgradeLabel**

In `src/components/admin/model-form.tsx`, add to form state:

```typescript
isDefault: model?.isDefault ?? false,
upgradeLabel: model?.upgradeLabel ?? '',
```

Add useEffect population. Add form fields (Switch for isDefault, Input for upgradeLabel) in the JSX. Include in handleSubmit create/update args.

**Step 6: Commit**

```bash
git add src/modules/configurator/store.ts src/components/configurator/upgrade-picker.tsx src/components/configurator/accessory-picker.tsx src/components/configurator/category-picker.tsx src/components/admin/model-form.tsx
git commit -m "feat: new configurator flow with auto-comfort and upgrade picker"
```

---

## Task 7: Feature 5 — Document Pipeline (Status Transitions + UI)

**Files:**
- Modify: `src/components/documents/document-list.tsx`
- Modify: `src/app/documents/[id]/page.tsx`
- Create: `src/components/documents/pipeline-actions.tsx`

**Step 1: Update DocumentList with filter tabs and new status badges**

In `src/components/documents/document-list.tsx`:

Add filter tabs state:

```typescript
const [filter, setFilter] = useState<'all' | 'open' | 'archived'>('open')
```

Update `statusVariant` and `statusLabel` maps for all new statuses:

```typescript
const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  DRAFT: 'secondary',
  FINAL: 'default',
  SENT: 'default',
  FOLLOW_UP: 'outline',
  ACCEPTED: 'default',
  DECLINED: 'destructive',
  EXPIRED: 'secondary',
  ARCHIVED: 'secondary',
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
```

Add filter tabs UI (3 buttons: Alle / Offen / Archiviert) above the search. Filter the documents based on the selected tab:

- "Offen": DRAFT, FINAL, SENT, FOLLOW_UP
- "Archiviert": ARCHIVED, DECLINED, EXPIRED, ACCEPTED
- "Alle": all statuses

**Step 2: Create PipelineActions component**

Create `src/components/documents/pipeline-actions.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'
import { Archive, CheckCircle2, XCircle, Trash2, MailPlus } from 'lucide-react'

interface PipelineActionsProps {
  documentId: string
  status: string
}

export function PipelineActions({ documentId, status }: PipelineActionsProps) {
  const updateStatus = useMutation(api.documents.updateStatus)
  const removeDoc = useMutation(api.documents.remove)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  async function handleStatusChange(
    newStatus: string,
    extra?: Record<string, unknown>,
  ) {
    try {
      await updateStatus({
        id: documentId as Id<'documents'>,
        status: newStatus as any,
        ...extra,
      })
      toast.success('Status aktualisiert')
    } catch {
      toast.error('Fehler beim Status-Update')
    }
  }

  async function handleDelete() {
    try {
      await removeDoc({ id: documentId as Id<'documents'> })
      toast.success('Dokument gelöscht')
      // Navigation handled by parent
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(status === 'SENT' || status === 'FOLLOW_UP') && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('ACCEPTED')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Angenommen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('DECLINED')}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Abgelehnt
            </Button>
          </>
        )}

        {status === 'FOLLOW_UP' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleStatusChange('FOLLOW_UP', { followUpAt: Date.now() })
            }
          >
            <MailPlus className="mr-2 h-4 w-4" />
            Erneut erinnern
          </Button>
        )}

        {!['ARCHIVED'].includes(status) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleStatusChange('ARCHIVED', { archivedAt: Date.now() })
            }
          >
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </Button>
        )}

        {(status === 'DRAFT' || status === 'ARCHIVED') && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument endgültig löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Das Dokument wird
              dauerhaft entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

**Step 3: Integrate PipelineActions into document detail page**

In `src/app/documents/[id]/page.tsx`:

Import and render `PipelineActions` in the action bar, replacing the existing finalize button logic. The edit button should now also work for FOLLOW_UP etc. if needed, but keep restriction to DRAFT for editing.

Add `PipelineActions` component below the existing buttons:

```tsx
<PipelineActions documentId={doc._id} status={doc.status} />
```

Handle navigation after delete (router.push('/') on success).

**Step 4: Commit**

```bash
git add src/components/documents/document-list.tsx src/app/documents/[id]/page.tsx src/components/documents/pipeline-actions.tsx
git commit -m "feat: document pipeline with status transitions, archive, and delete"
```

---

## Task 8: Feature 5 — Pipeline Cron Job (Auto Follow-Up + Expiry)

**Files:**
- Create: `convex/crons.ts`
- Create: `convex/pipeline.ts`

**Step 1: Create pipeline internal mutation**

Create `convex/pipeline.ts`:

```typescript
import { internalMutation } from './_generated/server'
import { internal } from './_generated/api'

export const processFollowUps = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Load pipeline settings
    const followUpDaysSetting = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'pipelineFollowUpDays'))
      .first()
    const expiryDaysSetting = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'pipelineExpiryDays'))
      .first()
    const reminderEnabledSetting = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'pipelineReminderEnabled'))
      .first()

    const followUpDays = (followUpDaysSetting?.value as number) ?? 7
    const expiryDays = (expiryDaysSetting?.value as number) ?? 30
    const reminderEnabled = (reminderEnabledSetting?.value as boolean) ?? true

    const now = Date.now()
    const followUpThreshold = now - followUpDays * 24 * 60 * 60 * 1000
    const expiryThreshold = now - expiryDays * 24 * 60 * 60 * 1000

    // Find SENT documents that need follow-up
    const sentDocs = await ctx.db
      .query('documents')
      .withIndex('by_status', (q) => q.eq('status', 'SENT'))
      .collect()

    for (const doc of sentDocs) {
      if (doc.sentAt && doc.sentAt < followUpThreshold) {
        await ctx.db.patch(doc._id, {
          status: 'FOLLOW_UP',
          followUpAt: now,
        })

        // Create reminder email in outbox if enabled
        if (reminderEnabled && doc.customer.email) {
          await ctx.db.insert('outbox', {
            documentId: doc._id,
            toEmail: doc.customer.email,
            subject: `Erinnerung: ${doc.documentType === 'QUOTE' ? 'Angebot' : 'Bestellung'} ${doc.documentNo}`,
            pdfBase64: '', // No attachment for reminders
            filename: '',
            status: 'PENDING',
            attempts: 0,
          })
        }
      }
    }

    // Find FOLLOW_UP documents that have expired
    const followUpDocs = await ctx.db
      .query('documents')
      .withIndex('by_status', (q) => q.eq('status', 'FOLLOW_UP'))
      .collect()

    for (const doc of followUpDocs) {
      if (doc.sentAt && doc.sentAt < expiryThreshold) {
        await ctx.db.patch(doc._id, { status: 'EXPIRED' })
      }
    }
  },
})
```

**Step 2: Create crons.ts**

Create `convex/crons.ts`:

```typescript
import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Run pipeline processing daily at 09:00 UTC
crons.daily(
  'pipeline-follow-up',
  { hourUTC: 9, minuteUTC: 0 },
  internal.pipeline.processFollowUps,
)

export default crons
```

**Step 3: Update sendEmail to set sentAt on document**

In `convex/sendEmail.ts`, after successfully sending email (`status: 'SENT'`), also update the document status to SENT and set sentAt:

```typescript
// After outbox status update to SENT:
const doc = await ctx.runQuery(api.documents.getById, { id: record.documentId })
if (doc && doc.status === 'FINAL') {
  await ctx.runMutation(api.documents.updateStatus, {
    id: record.documentId,
    status: 'SENT',
    sentAt: Date.now(),
  })
}
```

Import `api` at the top of sendEmail.ts (already imported).

**Step 4: Add pipeline settings to settings form**

In `src/components/admin/settings-form.tsx`, add a new collapsible section "Pipeline-Einstellungen" with:
- `pipelineFollowUpDays`: Number input (default 7)
- `pipelineExpiryDays`: Number input (default 30)
- `pipelineReminderEnabled`: Switch (default true)

**Step 5: Commit**

```bash
git add convex/crons.ts convex/pipeline.ts convex/sendEmail.ts src/components/admin/settings-form.tsx
git commit -m "feat: pipeline cron job for auto follow-up and expiry"
```

---

## Task 9: Feature 6 — Email Tracking (Webhook + emailEvents)

**Files:**
- Create: `convex/emailEvents.ts`
- Create: `convex/http.ts`
- Modify: `convex/sendEmail.ts`

**Step 1: Install svix**

```bash
npm install svix
```

**Step 2: Create emailEvents CRUD**

Create `convex/emailEvents.ts`:

```typescript
import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const listByDocumentId = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('emailEvents')
      .withIndex('by_documentId', (q) => q.eq('documentId', args.documentId))
      .collect()
  },
})

export const create = mutation({
  args: {
    outboxId: v.id('outbox'),
    documentId: v.id('documents'),
    resendMessageId: v.string(),
    eventType: v.union(
      v.literal('delivered'),
      v.literal('opened'),
      v.literal('clicked'),
      v.literal('bounced'),
    ),
    timestamp: v.number(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('emailEvents', args)
  },
})
```

**Step 3: Create HTTP webhook handler**

Create `convex/http.ts`:

```typescript
import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

http.route({
  path: '/webhooks/resend',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json()

    // Resend webhook payload structure:
    // { type: "email.opened", data: { email_id: "...", ... }, created_at: "..." }
    const eventType = body.type?.replace('email.', '') // "opened", "delivered", etc.
    const resendMessageId = body.data?.email_id

    if (!eventType || !resendMessageId) {
      return new Response('Invalid payload', { status: 400 })
    }

    // Only process known event types
    const validTypes = ['delivered', 'opened', 'clicked', 'bounced']
    if (!validTypes.includes(eventType)) {
      return new Response('OK', { status: 200 })
    }

    // Find matching outbox entry by resendMessageId
    const outboxEntries = await ctx.runQuery(api.outbox.list)
    const matchingEntry = outboxEntries.find(
      (o: any) => o.resendMessageId === resendMessageId,
    )

    if (matchingEntry) {
      await ctx.runMutation(api.emailEvents.create, {
        outboxId: matchingEntry._id,
        documentId: matchingEntry.documentId,
        resendMessageId,
        eventType: eventType as any,
        timestamp: new Date(body.created_at ?? Date.now()).getTime(),
        metadata: body.data?.click?.link ?? undefined,
      })
    }

    return new Response('OK', { status: 200 })
  }),
})

export default http
```

Note: Webhook signature validation with svix can be added later for production hardening. For now, the endpoint processes all incoming requests.

**Step 4: Update sendEmail to capture resendMessageId**

In `convex/sendEmail.ts`, after a successful Resend API response, parse the response to get the message ID and save it:

```typescript
const responseData = await response.json()
const resendMessageId = responseData.id // Resend returns { id: "..." }

await ctx.runMutation(api.outbox.updateStatus, {
  id: args.outboxId,
  status: 'SENT',
  resendMessageId: resendMessageId ?? undefined,
})
```

Replace the existing `updateStatus` call after success with this version.

**Step 5: Commit**

```bash
git add convex/emailEvents.ts convex/http.ts convex/sendEmail.ts package.json package-lock.json
git commit -m "feat: email tracking via Resend webhooks with emailEvents table"
```

---

## Task 10: Feature 6 — Email Timeline UI

**Files:**
- Create: `src/components/documents/email-timeline.tsx`
- Modify: `src/app/documents/[id]/page.tsx`

**Step 1: Create EmailTimeline component**

Create `src/components/documents/email-timeline.tsx`:

```tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, CheckCircle, Eye, MousePointer, AlertTriangle } from 'lucide-react'

const eventConfig: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  delivered: { icon: CheckCircle, label: 'Zugestellt', color: 'text-green-600' },
  opened: { icon: Eye, label: 'Geöffnet', color: 'text-blue-600' },
  clicked: { icon: MousePointer, label: 'Link geklickt', color: 'text-purple-600' },
  bounced: { icon: AlertTriangle, label: 'Nicht zugestellt', color: 'text-red-600' },
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface EmailTimelineProps {
  documentId: string
}

export function EmailTimeline({ documentId }: EmailTimelineProps) {
  const events = useQuery(api.emailEvents.listByDocumentId, {
    documentId: documentId as Id<'documents'>,
  })
  const outboxEntries = useQuery(api.outbox.listByDocumentId, {
    documentId: documentId as Id<'documents'>,
  })

  if (!events && !outboxEntries) return null
  if ((!events || events.length === 0) && (!outboxEntries || outboxEntries.length === 0)) return null

  // Build timeline items
  const timelineItems: Array<{ type: string; timestamp: number; metadata?: string }> = []

  // Add send events from outbox
  for (const entry of outboxEntries ?? []) {
    if (entry.status === 'SENT') {
      timelineItems.push({
        type: 'sent',
        timestamp: entry._creationTime,
      })
    }
    if (entry.status === 'FAILED') {
      timelineItems.push({
        type: 'failed',
        timestamp: entry._creationTime,
        metadata: entry.lastError,
      })
    }
  }

  // Add tracking events
  for (const event of events ?? []) {
    timelineItems.push({
      type: event.eventType,
      timestamp: event.timestamp,
      metadata: event.metadata ?? undefined,
    })
  }

  // Sort by timestamp
  timelineItems.sort((a, b) => a.timestamp - b.timestamp)

  if (timelineItems.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Mail className="h-5 w-5" />
          Email-Aktivität
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {timelineItems.map((item, idx) => {
            const config = item.type === 'sent'
              ? { icon: Mail, label: 'Email gesendet', color: 'text-muted-foreground' }
              : item.type === 'failed'
                ? { icon: AlertTriangle, label: 'Versand fehlgeschlagen', color: 'text-red-600' }
                : eventConfig[item.type] ?? { icon: Mail, label: item.type, color: 'text-muted-foreground' }
            const Icon = config.icon

            return (
              <div key={idx} className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`} />
                <div>
                  <p className="text-sm font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(item.timestamp)}
                  </p>
                  {item.metadata && (
                    <p className="text-xs text-muted-foreground">{item.metadata}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Add EmailTimeline to document detail page**

In `src/app/documents/[id]/page.tsx`, import and add after VersionHistory:

```tsx
import { EmailTimeline } from '@/components/documents/email-timeline'

// In the JSX, after VersionHistory:
<EmailTimeline documentId={documentId} />
```

**Step 3: Commit**

```bash
git add src/components/documents/email-timeline.tsx src/app/documents/[id]/page.tsx
git commit -m "feat: email tracking timeline on document detail page"
```

---

## Task 11: Verification — Build + Deploy

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type errors that arise from the schema changes.

**Step 2: Run lint**

```bash
npm run lint
```

**Step 3: Run Convex push (dev)**

```bash
npx convex dev --once
```

Verify that the schema deploys correctly and codegen succeeds.

**Step 4: Run Next.js build**

```bash
npm run build
```

**Step 5: Manual verification checklist**

- [ ] Admin: Create model with "Preis auf Anfrage" → shows in configurator as "a.A."
- [ ] Admin: Set a model as "isDefault" → category selection auto-picks it
- [ ] Configurator: Select category → default model auto-selected → upgrade picker shows alternatives
- [ ] Configurator: Select "Preis auf Anfrage" option → cart shows "a.A." → PDF shows "a.A."
- [ ] Admin Options: Search by name/SKU → results filter correctly
- [ ] Admin Options: Sort by column → toggles ASC/DESC
- [ ] Document: Send email → status transitions to SENT → sentAt is set
- [ ] Document: Pipeline buttons appear based on status
- [ ] Document: Delete button works for DRAFT and ARCHIVED
- [ ] Cron: Wait or trigger pipeline → SENT docs transition to FOLLOW_UP after N days
- [ ] Email webhook: POST to `/webhooks/resend` → events appear in EmailTimeline

**Step 6: Deploy**

```bash
npx convex deploy --yes
git push
```

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues from 6-features integration"
```

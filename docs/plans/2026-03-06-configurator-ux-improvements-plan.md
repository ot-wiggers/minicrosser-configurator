# Configurator UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three UX improvements: custom line items in studio view, RAL color code input via admin flag, expandable upgrade descriptions.

**Architecture:** Feature 1 is a pure UI addition to StudioLayout. Feature 2 spans all layers (Convex schema → admin form → Dexie sync → configurator store → option cards). Feature 3 is a self-contained UI change in UpgradePicker.

**Tech Stack:** Next.js 16, React 19, Convex, Dexie, Zustand, Tailwind CSS v4

---

### Task 1: Expandable Upgrade Descriptions

Simplest change — pure UI, no schema/store work.

**Files:**
- Modify: `src/components/configurator/upgrade-picker.tsx`

**Step 1: Extract upgrade card into its own component with expand/collapse state**

In `upgrade-picker.tsx`, replace the inline `models.map(...)` card rendering (lines 48-93) with a new `UpgradeCard` component that manages its own expand/collapse state:

```tsx
function UpgradeCard({ model, isSelected, onSelect }: { model: any; isSelected: boolean; onSelect: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const descRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = descRef.current
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight + 1)
    }
  }, [model.description])

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50',
        isSelected && 'border-primary ring-2 ring-primary/20',
      )}
      onClick={onSelect}
    >
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={cn(
            'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
          )}
        >
          {isSelected && <Check className="h-3 w-3 text-white" />}
        </div>
        <UpgradeModelImage model={model} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">
            {model.upgradeLabel || model.name}
          </p>
          {model.description && (
            <>
              <div
                ref={descRef}
                className={cn(
                  'mt-0.5 text-sm text-muted-foreground',
                  !expanded && 'line-clamp-2',
                )}
                dangerouslySetInnerHTML={{ __html: model.description }}
              />
              {isTruncated && (
                <button
                  type="button"
                  className="mt-1 text-xs text-primary hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded((prev) => !prev)
                  }}
                >
                  {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                </button>
              )}
            </>
          )}
        </div>
        <p className="shrink-0 text-right font-semibold">
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
}
```

Add `useState, useEffect, useRef` to the React import at the top of the file (line 1 area — currently no React imports since it uses `'use client'` only).

Replace the `models.map(...)` block (lines 48-93) with:

```tsx
{models.map((model) => (
  <UpgradeCard
    key={model._id}
    model={model}
    isSelected={selectedBaseModelId === model._id}
    onSelect={() => setBaseModel(model._id)}
  />
))}
```

**Step 2: Verify visually**

Run the dev server. Navigate to configurator, select a category with multiple models. Verify:
- Description shows 2 lines by default
- "Mehr anzeigen" link appears only when text is truncated
- Clicking expands to show full text
- "Weniger anzeigen" collapses back
- Clicking the card still selects the model (expand button uses `stopPropagation`)

**Step 3: Commit**

```bash
git add src/components/configurator/upgrade-picker.tsx
git commit -m "feat: add expandable descriptions to upgrade picker cards"
```

---

### Task 2: Custom Line Items in Studio View

**Files:**
- Modify: `src/components/configurator/studio-layout.tsx`

**Step 1: Add custom line items imports and store bindings**

In `studio-layout.tsx`, update the store destructuring at line 332 to also pull `customLineItems, addCustomLineItem, removeCustomLineItem`:

```tsx
const { documentType, selectedCategory, selectedBaseModelId, selectedOptions, customLineItems, addCustomLineItem, removeCustomLineItem, currentStep, setStep } =
    useConfiguratorStore()
```

Add `Trash2` to the lucide-react import (line 13).

**Step 2: Create the StudioCustomLineItems component**

Add this component inside `studio-layout.tsx` (before the `StudioLayout` export):

```tsx
function StudioCustomLineItems() {
  const { customLineItems, addCustomLineItem, removeCustomLineItem } = useConfiguratorStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [articleNo, setArticleNo] = useState('')
  const [price, setPrice] = useState('')
  const [qty, setQty] = useState('1')

  function handleAdd() {
    const p = parseFloat(price)
    if (!name.trim() || isNaN(p)) return
    addCustomLineItem({
      name: name.trim(),
      skuCode: sku.trim() || undefined,
      articleNo: articleNo.trim() || undefined,
      priceNet: p,
      quantity: parseInt(qty) || 1,
    })
    setName('')
    setSku('')
    setArticleNo('')
    setPrice('')
    setQty('1')
    setShowForm(false)
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Individuelle Positionen
      </h3>

      {customLineItems.length > 0 && (
        <div className="mb-3 space-y-2">
          {customLineItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity > 1 ? `${item.quantity}x ` : ''}
                  {formatCurrency(item.priceNet)}
                </p>
              </div>
              <button
                onClick={() => removeCustomLineItem(item.id)}
                className="ml-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-2 rounded-lg border p-3">
          <Input
            placeholder="Bezeichnung *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="SKU (optional)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Art.-Nr. (optional)"
              value={articleNo}
              onChange={(e) => setArticleNo(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Netto-Preis *"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Menge"
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>
              Hinzufügen
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setShowForm(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Individuelle Position
        </Button>
      )}
    </div>
  )
}
```

**Step 3: Render in the option groups section**

In the StudioLayout component, add `<StudioCustomLineItems />` after the option groups list (line 484, after the closing `</div>` of `space-y-6`). Place it inside the right panel, just before the closing `</div>` of the right column:

Replace lines 472-484:
```tsx
          {/* Option groups */}
          <div className="space-y-6">
            {currentStep === 1 && <UpgradePicker />}
            {filteredGroups?.map(({ group, items }: { group: any; items: any[] }) => {
              if (isColorGroup(group.name) && group.selectionType === 'SINGLE') {
                return <ColorSwatchGroup key={group._id} group={group} items={items} />
              }
              if (group.selectionType === 'SINGLE') {
                return <SingleOptionGroup key={group._id} group={group} items={items} />
              }
              return <MultiOptionGroup key={group._id} group={group} items={items} />
            })}
          </div>
```

With:
```tsx
          {/* Option groups */}
          <div className="space-y-6">
            {currentStep === 1 && <UpgradePicker />}
            {filteredGroups?.map(({ group, items }: { group: any; items: any[] }) => {
              if (isColorGroup(group.name) && group.selectionType === 'SINGLE') {
                return <ColorSwatchGroup key={group._id} group={group} items={items} />
              }
              if (group.selectionType === 'SINGLE') {
                return <SingleOptionGroup key={group._id} group={group} items={items} />
              }
              return <MultiOptionGroup key={group._id} group={group} items={items} />
            })}
            <Separator />
            <StudioCustomLineItems />
          </div>
```

**Step 4: Update pricing calculation to include custom line items**

The studio pricing calculation (lines 374-384) does NOT include custom line items. Update it:

Replace:
```tsx
  const pricing = useMemo(() => {
    if (!baseModel) return null
    const optionItems = Object.values(selectedOptions).map((opt) => ({
      skuCode: opt.skuCode,
      articleNo: opt.articleNo,
      name: opt.name,
      priceNet: opt.priceNet,
      quantity: opt.quantity || 1,
    }))
    return calculatePricingFromItems(baseModel, optionItems)
  }, [baseModel, selectedOptions])
```

With:
```tsx
  const pricing = useMemo(() => {
    if (!baseModel) return null
    const optionItems = Object.values(selectedOptions).map((opt) => ({
      skuCode: opt.skuCode,
      articleNo: opt.articleNo,
      name: opt.name,
      priceNet: opt.priceNet,
      quantity: opt.quantity || 1,
    }))
    const customItems = customLineItems.map((item) => ({
      skuCode: item.skuCode || '',
      articleNo: item.articleNo || '',
      name: item.name,
      priceNet: item.priceNet,
      quantity: item.quantity,
    }))
    return calculatePricingFromItems(baseModel, [...optionItems, ...customItems])
  }, [baseModel, selectedOptions, customLineItems])
```

**Step 5: Verify visually**

Navigate to studio view. Confirm:
- "Individuelle Positionen" section appears below option groups
- Can add items with name + price
- Items appear in the list with delete button
- Pricing in footer updates to include custom items

**Step 6: Commit**

```bash
git add src/components/configurator/studio-layout.tsx
git commit -m "feat: add custom line items to studio view with pricing"
```

---

### Task 3: Add `requiresInput` Field to Convex Schema

**Files:**
- Modify: `convex/schema.ts` (line 46-63, options table)
- Modify: `convex/options.ts` (create mutation lines 80-98, update mutation lines 101-130)

**Step 1: Add requiresInput to schema**

In `convex/schema.ts`, add after line 58 (`priceOnRequest`):

```ts
    requiresInput: v.optional(v.object({
      enabled: v.boolean(),
      label: v.string(),
    })),
```

**Step 2: Add to create mutation args**

In `convex/options.ts`, add to the `create` mutation args (after line 94):

```ts
    requiresInput: v.optional(v.object({
      enabled: v.boolean(),
      label: v.string(),
    })),
```

**Step 3: Add to update mutation args**

In `convex/options.ts`, add to the `update` mutation args (after line 116):

```ts
    requiresInput: v.optional(v.object({
      enabled: v.boolean(),
      label: v.string(),
    })),
```

**Step 4: Add `inputValue` to selectedOptions in documents schema**

In `convex/schema.ts`, inside the `selectedOptions` array object (around line 122-131), add after `priceOnRequest`:

```ts
        inputValue: v.optional(v.string()),
```

**Step 5: Push schema to dev**

```bash
npx convex dev --once
```

Expected: Schema pushed successfully.

**Step 6: Commit**

```bash
git add convex/schema.ts convex/options.ts
git commit -m "feat: add requiresInput field to options schema and inputValue to selectedOptions"
```

---

### Task 4: Update TypeScript Types and Dexie Sync

**Files:**
- Modify: `src/modules/catalog/db-types.ts` (OptionRecord, line 39-54)
- Modify: `src/modules/storage/types.ts` (SelectedOption, line 5-13)
- Modify: `src/components/layout/cache-sync.tsx` (syncOptions function, lines 197-231)

**Step 1: Add requiresInput to OptionRecord**

In `db-types.ts`, add to `OptionRecord` (after line 53, `priceOnRequest`):

```ts
  requiresInput?: { enabled: boolean; label: string }
```

**Step 2: Add inputValue to SelectedOption**

In `types.ts`, add to `SelectedOption` (after line 12, `priceOnRequest`):

```ts
  inputValue?: string
```

**Step 3: Update cache sync to pass requiresInput**

In `cache-sync.tsx`, in the `syncOptions` function (line 199 mapping), add:

```ts
      requiresInput: item.requiresInput ?? undefined,
```

After the `isActive` line (line 210).

**Step 4: Commit**

```bash
git add src/modules/catalog/db-types.ts src/modules/storage/types.ts src/components/layout/cache-sync.tsx
git commit -m "feat: add requiresInput to OptionRecord and inputValue to SelectedOption types"
```

---

### Task 5: Add `setOptionInputValue` to Configurator Store

**Files:**
- Modify: `src/modules/configurator/store.ts`

**Step 1: Add action to interface**

In the `ConfiguratorState` interface (after line 22, `removeOption`):

```ts
  setOptionInputValue: (optionItemId: string, value: string) => void
```

**Step 2: Implement the action**

After the `removeOption` implementation (line 98), add:

```ts
  setOptionInputValue: (optionItemId, value) =>
    set((state) => {
      const current = { ...state.selectedOptions }
      if (current[optionItemId]) {
        current[optionItemId] = { ...current[optionItemId], inputValue: value }
      }
      return { selectedOptions: current }
    }),
```

**Step 3: Commit**

```bash
git add src/modules/configurator/store.ts
git commit -m "feat: add setOptionInputValue action to configurator store"
```

---

### Task 6: Add requiresInput UI to Admin Option Form

**Files:**
- Modify: `src/components/admin/option-form.tsx`

**Step 1: Add state variables**

In `OptionFormInner` (after line 166, `restrictToModels` state):

```ts
  const [requiresInputEnabled, setRequiresInputEnabled] = useState(option?.requiresInput?.enabled ?? false)
  const [requiresInputLabel, setRequiresInputLabel] = useState(option?.requiresInput?.label ?? '')
```

**Step 2: Populate from option data in useEffect**

In the `useEffect` at line 171, add after line 185:

```ts
      setRequiresInputEnabled(option.requiresInput?.enabled ?? false)
      setRequiresInputLabel(option.requiresInput?.label ?? '')
```

**Step 3: Add UI fields in the form**

After the "Preis auf Anfrage" switch section (after line 347), add:

```tsx
        {/* Requires Input */}
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="requiresInput">Eingabefeld erforderlich</Label>
            <p className="text-xs text-muted-foreground">
              Zeigt ein Textfeld wenn diese Option ausgewählt wird
            </p>
          </div>
          <Switch
            id="requiresInput"
            checked={requiresInputEnabled}
            onCheckedChange={setRequiresInputEnabled}
          />
        </div>
        {requiresInputEnabled && (
          <div className="space-y-2">
            <Label htmlFor="requiresInputLabel">Feld-Label *</Label>
            <Input
              id="requiresInputLabel"
              value={requiresInputLabel}
              onChange={(e) => setRequiresInputLabel(e.target.value)}
              placeholder="z.B. RAL-Farbcode"
            />
          </div>
        )}
```

**Step 4: Include in submit handler**

In `handleSubmit`, for both create and update args objects, add:

```ts
          requiresInput: requiresInputEnabled
            ? { enabled: true, label: requiresInputLabel.trim() || 'Eingabe' }
            : undefined,
```

Add after the `restrictToModels` line in both the `updateArgs` (around line 238) and `createArgs` (around line 260) objects.

**Step 5: Verify in admin**

Go to Admin → Optionen → edit any option. Confirm:
- "Eingabefeld erforderlich" switch appears
- Toggling on shows "Feld-Label" input
- Saving persists the value

**Step 6: Commit**

```bash
git add src/components/admin/option-form.tsx
git commit -m "feat: add requiresInput toggle and label to admin option form"
```

---

### Task 7: Render Input Field in Configurator Option Cards

**Files:**
- Modify: `src/components/configurator/accessory-picker.tsx`
- Modify: `src/components/configurator/studio-layout.tsx`

**Step 1: Add input field to SingleGroup in accessory-picker.tsx**

In `accessory-picker.tsx`, update the `SingleGroup` component. After the card content (inside the Card, after the price), add a conditional input that appears when the option is selected AND has `requiresInput.enabled`:

Update store destructuring in `SingleGroup` (line 35) to add `setOptionInputValue`:
```tsx
  const { selectedOptions, toggleOption, removeOption, setOptionInputValue } = useConfiguratorStore()
```

After the `</CardContent>` closing tag (line 99), but still inside `<Card>`, add:

```tsx
              {isSelected && item.requiresInput?.enabled && (
                <div className="border-t px-4 pb-3 pt-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    {item.requiresInput.label}
                  </label>
                  <Input
                    placeholder={item.requiresInput.label}
                    value={selectedOptions[item._id]?.inputValue ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setOptionInputValue(item._id, e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              )}
```

**Step 2: Add input field to MultiGroup in accessory-picker.tsx**

Same approach for `MultiGroup`. Update store destructuring (line 115) to add `setOptionInputValue`:
```tsx
  const { selectedOptions, toggleOption, setOptionQuantity, setOptionInputValue } = useConfiguratorStore()
```

After `</CardContent>` (line 177), add the same conditional input block.

**Step 3: Add input field to studio-layout.tsx option groups**

For `SingleOptionGroup` (line 167): add `setOptionInputValue` to store destructuring and add the input after the option button:

```tsx
  const { selectedOptions, toggleOption, removeOption, setOptionInputValue } = useConfiguratorStore()
```

After the closing `</button>` in SingleOptionGroup (line 231), but still inside the outer `<div>`, add:

```tsx
              {isSelected && item.requiresInput?.enabled && (
                <div className="ml-8 mt-1 mb-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {item.requiresInput.label}
                  </label>
                  <Input
                    placeholder={item.requiresInput.label}
                    value={selectedOptions[item._id]?.inputValue ?? ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setOptionInputValue(item._id, e.target.value)}
                    className="mt-1 h-8 w-64 text-sm"
                  />
                </div>
              )}
```

For `MultiOptionGroup` (line 239): same approach. Add `setOptionInputValue` and render input after the selected option row.

For `ColorSwatchGroup` (line 100): add `setOptionInputValue` and render input below the grid when a color with `requiresInput` is selected.

**Step 4: Verify**

1. In admin, set `requiresInput` on an option (e.g. a color option labeled "RAL-Farbcode")
2. In configurator (both stepper and studio view), select that option
3. Confirm input field appears with the correct label
4. Type a value, confirm it persists in the store

**Step 5: Commit**

```bash
git add src/components/configurator/accessory-picker.tsx src/components/configurator/studio-layout.tsx
git commit -m "feat: render requiresInput text field in configurator option cards"
```

---

### Task 8: Deploy and Push

**Step 1: Deploy Convex to production**

```bash
npx convex deploy --yes
```

**Step 2: Push to GitHub (triggers Vercel deploy)**

```bash
git push
```

**Step 3: Verify on production**

- Admin: option form shows requiresInput fields
- Configurator: all 3 features work
- Studio view: custom line items + requiresInput fields
- Upgrade picker: expandable descriptions

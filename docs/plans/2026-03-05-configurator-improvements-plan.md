# Configurator Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix UpgradePicker in StudioLayout, add custom line items, and restructure configurator steps with phase-based option group split.

**Architecture:** Add `phase` field to optionGroups schema for splitting groups between "Fahrzeug Konfiguration" (step 1) and "Zurüstung & Zubehör" (step 2). Add `customLineItems` to configurator store for free-text positions. Refactor both Stepper and Studio views to use the same 3-step flow.

**Tech Stack:** Next.js 16, React 19, Convex, Zustand, Tailwind CSS v4, pdf-lib

---

### Task 1: Schema — Add `phase` to optionGroups + `customLineItems` to documents

**Files:**
- Modify: `convex/schema.ts`
- Modify: `src/modules/catalog/db-types.ts`
- Modify: `src/modules/storage/types.ts`

**Step 1: Add `phase` to optionGroups table in schema.ts**

In `convex/schema.ts`, add `phase` to the `optionGroups` table definition, after the `isActive` field:

```ts
  optionGroups: defineTable({
    name: v.string(),
    selectionType: v.union(v.literal('SINGLE'), v.literal('MULTI')),
    appliesTo: v.array(v.string()),
    sortOrder: v.number(),
    isActive: v.boolean(),
    phase: v.optional(v.union(v.literal('VEHICLE_CONFIG'), v.literal('ACCESSORY'))),
  })
```

**Step 2: Add `customLineItems` to documents table in schema.ts**

In `convex/schema.ts`, in the `documents` table, add after `selectedOptions`:

```ts
    customLineItems: v.optional(v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        skuCode: v.optional(v.string()),
        articleNo: v.optional(v.string()),
        priceNet: v.number(),
        quantity: v.number(),
      }),
    )),
```

**Step 3: Add `CustomLineItem` type to types.ts**

In `src/modules/storage/types.ts`, add after the `SelectedOption` interface:

```ts
export interface CustomLineItem {
  id: string
  name: string
  skuCode?: string
  articleNo?: string
  priceNet: number
  quantity: number
}
```

Add `customLineItems?: CustomLineItem[]` to the `DocumentRecord` interface after `selectedOptions`.

**Step 4: Add `phase` to OptionGroupRecord in db-types.ts**

In `src/modules/catalog/db-types.ts`, add to `OptionGroupRecord`:

```ts
  phase?: 'VEHICLE_CONFIG' | 'ACCESSORY'
```

**Step 5: Deploy and commit**

```bash
npx convex dev --once
git add convex/schema.ts src/modules/storage/types.ts src/modules/catalog/db-types.ts
git commit -m "feat: add phase field to optionGroups and customLineItems to documents"
```

---

### Task 2: Backend — Update optionGroups mutations + documents mutations

**Files:**
- Modify: `convex/optionGroups.ts`
- Modify: `convex/documents.ts`

**Step 1: Add `phase` to optionGroups create/update mutations**

In `convex/optionGroups.ts`, add to `create` args:

```ts
    phase: v.optional(v.union(v.literal('VEHICLE_CONFIG'), v.literal('ACCESSORY'))),
```

Add to `update` args:

```ts
    phase: v.optional(v.union(v.literal('VEHICLE_CONFIG'), v.literal('ACCESSORY'))),
```

**Step 2: Add `customLineItems` to documents create/updateDocument mutations**

In `convex/documents.ts`, add to the `create` mutation args:

```ts
    customLineItems: v.optional(v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        skuCode: v.optional(v.string()),
        articleNo: v.optional(v.string()),
        priceNet: v.number(),
        quantity: v.number(),
      }),
    )),
```

Add the same to `updateDocument` mutation args. Make sure `customLineItems` is included in both the insert and patch calls (spread from args).

**Step 3: Deploy and commit**

```bash
npx convex dev --once
git add convex/optionGroups.ts convex/documents.ts
git commit -m "feat: add phase to optionGroups and customLineItems to documents mutations"
```

---

### Task 3: Store — Add customLineItems to configurator store

**Files:**
- Modify: `src/modules/configurator/store.ts`

**Step 1: Add CustomLineItem import and state**

Add import at top:

```ts
import type { DocumentType, SelectedOption, CustomLineItem } from '@/modules/storage/types'
```

Add to `ConfiguratorState` interface:

```ts
  customLineItems: CustomLineItem[]
  addCustomLineItem: (item: Omit<CustomLineItem, 'id'>) => void
  updateCustomLineItem: (id: string, updates: Partial<Omit<CustomLineItem, 'id'>>) => void
  removeCustomLineItem: (id: string) => void
```

Add to `initialState`:

```ts
  customLineItems: [] as CustomLineItem[],
```

**Step 2: Implement actions**

Add these actions to the store (after `removeOption`):

```ts
  addCustomLineItem: (item) =>
    set((state) => ({
      customLineItems: [
        ...state.customLineItems,
        { ...item, id: crypto.randomUUID() },
      ],
    })),

  updateCustomLineItem: (id, updates) =>
    set((state) => ({
      customLineItems: state.customLineItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    })),

  removeCustomLineItem: (id) =>
    set((state) => ({
      customLineItems: state.customLineItems.filter((item) => item.id !== id),
    })),
```

**Step 3: Update `setCategoryWithDefaultModel` to go to step 1**

Change `setCategoryWithDefaultModel` — it should ALWAYS go to step 1 (not step 2):

```ts
  setCategoryWithDefaultModel: (categoryId, defaultModelId) =>
    set({
      selectedCategory: categoryId,
      selectedBaseModelId: defaultModelId,
      selectedOptions: {},
      customLineItems: [],
      currentStep: 1,
    }),
```

Also update `setCategory` to reset `customLineItems: []`.

Also update `reset` — `initialState` already includes `customLineItems: []`.

**Step 4: Update `loadFromDocument` for custom items**

Change `loadFromDocument` signature to accept `customLineItems`:

```ts
  loadFromDocument: (doc: {
    _id: string
    documentType: DocumentType
    selectedCategory: string
    selectedBaseModelId: string
    selectedOptions: SelectedOption[]
    customLineItems?: CustomLineItem[]
  }) => void
```

In the handler, add:

```ts
    set({
      ...existing fields...,
      customLineItems: doc.customLineItems ?? [],
      currentStep: 2,
      editingDocumentId: doc._id,
    })
```

**Step 5: Commit**

```bash
git add src/modules/configurator/store.ts
git commit -m "feat: add customLineItems to configurator store"
```

---

### Task 4: Stepper — Restructure steps

**Files:**
- Modify: `src/components/configurator/stepper.tsx`
- Modify: `src/app/new/page.tsx`

**Step 1: Update stepper labels**

In `src/components/configurator/stepper.tsx`, change the `steps` array:

```ts
const steps = [
  { label: 'Kategorie', step: 0 },
  { label: 'Fahrzeug Konfiguration', step: 1 },
  { label: 'Zurüstung & Zubehör', step: 2 },
]
```

**Step 2: Update page.tsx step rendering**

In `src/app/new/page.tsx`, the step rendering currently shows:
- step 0: CategoryPicker
- step 1: ModelPicker
- step 2: AccessoryPicker

Change to:
- step 0: CategoryPicker
- step 1: AccessoryPicker with `phase="VEHICLE_CONFIG"`
- step 2: AccessoryPicker with `phase="ACCESSORY"`

```tsx
{currentStep === 0 && <CategoryPicker />}
{currentStep === 1 && <AccessoryPicker phase="VEHICLE_CONFIG" />}
{currentStep === 2 && <AccessoryPicker phase="ACCESSORY" />}
```

Update the CartSidebar visibility: show from step 1 onward (already `currentStep >= 1`).

Update `canShowStudio` to `currentStep >= 1` (was `>= 2`).

**Step 3: Commit**

```bash
git add src/components/configurator/stepper.tsx src/app/new/page.tsx
git commit -m "feat: restructure configurator steps — Kategorie, Fahrzeug Konfiguration, Zurüstung"
```

---

### Task 5: AccessoryPicker — Add phase filtering

**Files:**
- Modify: `src/components/configurator/accessory-picker.tsx`

**Step 1: Add `phase` prop**

Change the `AccessoryPicker` component signature:

```tsx
interface AccessoryPickerProps {
  phase: 'VEHICLE_CONFIG' | 'ACCESSORY'
}

export function AccessoryPicker({ phase }: AccessoryPickerProps) {
```

**Step 2: Filter groups by phase**

After fetching `groupsWithOptions`, filter by phase. Groups with no `phase` set default to `'ACCESSORY'`:

```tsx
  const filteredGroups = groupsWithOptions?.filter(({ group }) => {
    const groupPhase = group.phase || 'ACCESSORY'
    return groupPhase === phase
  })
```

Use `filteredGroups` instead of `groupsWithOptions` in the render.

**Step 3: Update heading per phase**

```tsx
  const heading = phase === 'VEHICLE_CONFIG'
    ? 'Fahrzeug Konfiguration'
    : 'Zurüstung & Zubehör'
  const subheading = phase === 'VEHICLE_CONFIG'
    ? 'Wählen Sie Modell-Upgrade und Fahrzeugausstattung'
    : 'Passen Sie Ihr Fahrzeug individuell an'
```

**Step 4: Show UpgradePicker only in VEHICLE_CONFIG phase**

Move the `<UpgradePicker />` so it only renders when `phase === 'VEHICLE_CONFIG'`:

```tsx
  <div className="space-y-6">
    {phase === 'VEHICLE_CONFIG' && <UpgradePicker />}
    {filteredGroups?.map(({ group, items }, idx: number) => (
      ...existing rendering...
    ))}
  </div>
```

**Step 5: Add "Weiter" button for VEHICLE_CONFIG step**

At the bottom of the VEHICLE_CONFIG phase, add a "Weiter" button to go to step 2:

```tsx
  const { setStep } = useConfiguratorStore()

  // At end of render, before closing </div>:
  {phase === 'VEHICLE_CONFIG' && (
    <div className="mt-6 flex justify-end">
      <Button onClick={() => setStep(2)}>
        Weiter zu Zurüstung & Zubehör
      </Button>
    </div>
  )}
```

Import `Button` from `@/components/ui/button`.

**Step 6: Commit**

```bash
git add src/components/configurator/accessory-picker.tsx
git commit -m "feat: add phase filtering to AccessoryPicker with VEHICLE_CONFIG and ACCESSORY"
```

---

### Task 6: StudioLayout — Add stepping + UpgradePicker

**Files:**
- Modify: `src/components/configurator/studio-layout.tsx`

**Step 1: Import UpgradePicker and use currentStep**

Add to imports:

```tsx
import { UpgradePicker } from './upgrade-picker'
```

In `StudioLayout`, get `currentStep` and `setStep` from the store:

```tsx
  const { documentType, selectedCategory, selectedBaseModelId, selectedOptions, currentStep, setStep } =
    useConfiguratorStore()
```

**Step 2: Filter option groups by phase based on currentStep**

After fetching `groupsWithOptions`, filter:

```tsx
  const currentPhase = currentStep === 1 ? 'VEHICLE_CONFIG' : 'ACCESSORY'
  const filteredGroups = groupsWithOptions?.filter(({ group }) => {
    const groupPhase = (group as any).phase || 'ACCESSORY'
    return groupPhase === currentPhase
  })
```

**Step 3: Add stepper navigation at top**

Add a minimal step indicator above the content in the right panel:

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

**Step 4: Show UpgradePicker in step 1 before option groups**

In the option groups section, add UpgradePicker for step 1:

```tsx
  {/* Option groups */}
  <div className="space-y-6">
    {currentStep === 1 && <UpgradePicker />}
    {filteredGroups?.map(({ group, items }: { group: any; items: any[] }) => {
      ...existing rendering...
    })}
  </div>
```

**Step 5: Update sticky footer button**

Change the footer button:
- Step 1: "Weiter" button → `setStep(2)`
- Step 2: "Angebot erstellen" button → `onCreateDocument()`

```tsx
  {currentStep === 1 ? (
    <Button
      size="lg"
      className="font-bold"
      style={{ backgroundColor: ACCENT, color: PRIMARY_DARK }}
      onClick={() => setStep(2)}
    >
      Weiter
    </Button>
  ) : (
    <Button
      size="lg"
      className="font-bold"
      style={{ backgroundColor: ACCENT, color: PRIMARY_DARK }}
      onClick={onCreateDocument}
    >
      {buttonLabel}
    </Button>
  )}
```

**Step 6: Commit**

```bash
git add src/components/configurator/studio-layout.tsx
git commit -m "feat: add stepping and UpgradePicker to StudioLayout"
```

---

### Task 7: CartSidebar — Add custom line items UI

**Files:**
- Modify: `src/components/configurator/cart-sidebar.tsx`

**Step 1: Add custom line items to pricing calculation**

Import `CustomLineItem` and get `customLineItems` from store:

```tsx
import type { CustomLineItem } from '@/modules/storage/types'

// Inside CartSidebar:
  const { documentType, selectedBaseModelId, selectedOptions, customLineItems } = useConfiguratorStore()
```

Update the `pricing` useMemo to include custom items:

```tsx
  const pricing = useMemo(() => {
    if (!baseModel) return null

    const optionItems = Object.values(selectedOptions).map((opt) => ({
      skuCode: opt.skuCode,
      articleNo: opt.articleNo,
      name: opt.name,
      priceNet: opt.priceNet,
      quantity: opt.quantity || 1,
      priceOnRequest: opt.priceOnRequest,
    }))

    // Add custom line items as option items
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

**Step 2: Add inline form state**

```tsx
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customSku, setCustomSku] = useState('')
  const [customArticleNo, setCustomArticleNo] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [customQty, setCustomQty] = useState('1')
```

Import `useState` from React and `Plus, Pencil, Trash2` from lucide-react.

**Step 3: Add "Hinzufügen" handler**

```tsx
  const { addCustomLineItem, removeCustomLineItem } = useConfiguratorStore()

  function handleAddCustomItem() {
    const price = parseFloat(customPrice)
    if (!customName.trim() || isNaN(price)) return
    addCustomLineItem({
      name: customName.trim(),
      skuCode: customSku.trim() || undefined,
      articleNo: customArticleNo.trim() || undefined,
      priceNet: price,
      quantity: parseInt(customQty) || 1,
    })
    setCustomName('')
    setCustomSku('')
    setCustomArticleNo('')
    setCustomPrice('')
    setCustomQty('1')
    setShowCustomForm(false)
  }
```

**Step 4: Render custom items + form in sidebar**

After the pricing line items and before the Separator/totals, add:

```tsx
  {/* Custom line items */}
  {customLineItems.length > 0 && (
    <>
      <Separator />
      <p className="text-xs font-medium text-muted-foreground">Individuelle Positionen</p>
      {customLineItems.map((item) => (
        <div key={item.id} className="flex items-center justify-between text-sm">
          <span className="flex-1">
            {item.name}
            {item.quantity > 1 && ` x${item.quantity}`}
          </span>
          <div className="flex items-center gap-1">
            <span className="font-medium">{formatCurrency(item.priceNet * item.quantity)}</span>
            <button
              onClick={() => removeCustomLineItem(item.id)}
              className="ml-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </>
  )}

  {/* Add custom line item */}
  {showCustomForm ? (
    <div className="space-y-2 rounded-md border p-3">
      <Input
        placeholder="Bezeichnung *"
        value={customName}
        onChange={(e) => setCustomName(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="SKU (optional)"
          value={customSku}
          onChange={(e) => setCustomSku(e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Art.-Nr. (optional)"
          value={customArticleNo}
          onChange={(e) => setCustomArticleNo(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Netto-Preis *"
          type="number"
          step="0.01"
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value)}
          className="h-8 text-sm"
        />
        <Input
          placeholder="Menge"
          type="number"
          min="1"
          value={customQty}
          onChange={(e) => setCustomQty(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleAddCustomItem}>
          Hinzufügen
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowCustomForm(false)}>
          Abbrechen
        </Button>
      </div>
    </div>
  ) : (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      onClick={() => setShowCustomForm(true)}
    >
      <Plus className="mr-1 h-3 w-3" />
      Individuelle Position
    </Button>
  )}
```

**Step 5: Import additions**

Add `Input` and `Plus, Trash2` to imports:

```tsx
import { Input } from '@/components/ui/input'
import { ShoppingCart, Plus, Trash2 } from 'lucide-react'
```

**Step 6: Commit**

```bash
git add src/components/configurator/cart-sidebar.tsx
git commit -m "feat: add custom line items UI to CartSidebar"
```

---

### Task 8: Admin — Add phase dropdown to option group form

**Files:**
- Modify: `src/components/admin/option-group-form.tsx`

**Step 1: Add phase state**

```tsx
  const [phase, setPhase] = useState<'VEHICLE_CONFIG' | 'ACCESSORY'>('ACCESSORY')
```

In the `useEffect` that resets on open, load phase from group:

```tsx
  if (group) {
    ...existing fields...
    setPhase((group as any).phase || 'ACCESSORY')
  } else if (!groupId) {
    ...existing reset...
    setPhase('ACCESSORY')
  }
```

**Step 2: Add phase to form UI**

After the "Auswahltyp" fieldset and before "Gilt für Kategorien", add:

```tsx
  {/* Phase */}
  <fieldset className="space-y-2">
    <Label asChild>
      <legend>Konfigurator-Phase</legend>
    </Label>
    <div className="flex gap-4">
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name="phase"
          value="VEHICLE_CONFIG"
          checked={phase === 'VEHICLE_CONFIG'}
          onChange={() => setPhase('VEHICLE_CONFIG')}
          className="accent-primary h-4 w-4"
        />
        Fahrzeug Konfiguration
      </label>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="radio"
          name="phase"
          value="ACCESSORY"
          checked={phase === 'ACCESSORY'}
          onChange={() => setPhase('ACCESSORY')}
          className="accent-primary h-4 w-4"
        />
        Zurüstung & Zubehör
      </label>
    </div>
    <p className="text-xs text-muted-foreground">
      Bestimmt, in welchem Konfigurator-Schritt die Gruppe erscheint.
    </p>
  </fieldset>
```

**Step 3: Pass phase to create/update calls**

In `handleSubmit`, add `phase` to both create and update calls:

```tsx
  // create:
  await createGroup({ name: trimmedName, selectionType, appliesTo, sortOrder, isActive, phase })
  // update:
  await updateGroup({ id: groupId as Id<"optionGroups">, name: trimmedName, selectionType, appliesTo, sortOrder, isActive, phase })
```

**Step 4: Commit**

```bash
git add src/components/admin/option-group-form.tsx
git commit -m "feat: add phase dropdown to option group admin form"
```

---

### Task 9: CustomerFormDialog — Include customLineItems in document creation

**Files:**
- Modify: `src/components/configurator/customer-form-dialog.tsx`

**Step 1: Get customLineItems from store**

Add `customLineItems` to the destructured store:

```tsx
  const {
    documentType,
    selectedCategory,
    selectedBaseModelId,
    selectedOptions,
    customLineItems,
    editingDocumentId,
    reset,
  } = useConfiguratorStore()
```

**Step 2: Include custom items in pricing calculation**

In both `handleCreate` and `handleUpdate`, change the pricing calculation to include custom items:

```tsx
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
  const pricing = calculatePricingFromItems(baseModel, [...optionItems, ...customItems])
```

**Step 3: Pass customLineItems to document create/update**

In `handleCreate` online path, add to `createDocument` call:

```tsx
  customLineItems: customLineItems.length > 0 ? customLineItems : undefined,
```

In `handleUpdate`, add to `updateDocument` call:

```tsx
  customLineItems: customLineItems.length > 0 ? customLineItems : undefined,
```

In `handleCreate` offline path, add to `createDocumentOffline` call:

```tsx
  customLineItems: customLineItems.length > 0 ? customLineItems : undefined,
```

**Step 4: Commit**

```bash
git add src/components/configurator/customer-form-dialog.tsx
git commit -m "feat: include customLineItems in document creation and pricing"
```

---

### Task 10: Verification — Build + Deploy

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: Clean (no errors).

**Step 2: Convex push**

```bash
npx convex dev --once
```

Expected: "Convex functions ready!"

**Step 3: Next.js build**

```bash
npm run build
```

Expected: Compiled successfully.

**Step 4: Deploy Convex to production**

```bash
npx convex deploy --yes
```

Expected: Deployed successfully with new indexes.

**Step 5: Push to GitHub (triggers Vercel deploy)**

```bash
git push origin main
```

**Step 6: Commit any fix-ups if needed**

If build reveals issues, fix and commit before pushing.

# Configurator Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Five improvements: (1) per-model option filtering, (2) rich text descriptions via Tiptap, (3) technical specs per model, (4) fix image cropping in configurator, (5) enlarge PDF image area.

**Architecture:** Schema additions to `options` (restrictToModels) and `baseModels` (specs). Tiptap WYSIWYG editor replaces textarea for descriptions. Configurator renders HTML + specs table. PDF layout tweak for image size.

**Tech Stack:** Next.js 16 + Convex, Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`), existing shadcn/ui components.

**Design Doc:** `docs/plans/2026-02-26-configurator-improvements-design.md`

---

### Task 1: Schema changes

**Files:**
- Modify: `convex/schema.ts:15-29` (baseModels table)
- Modify: `convex/schema.ts:41-56` (options table)

**Step 1: Add `specs` to baseModels schema**

In `convex/schema.ts`, add after the `isActive` field (line 25) in the `baseModels` table:

```typescript
    specs: v.optional(v.array(v.object({ label: v.string(), value: v.string() }))),
```

**Step 2: Add `restrictToModels` to options schema**

In `convex/schema.ts`, add after the `isDefault` field (line 52) in the `options` table:

```typescript
    restrictToModels: v.optional(v.array(v.string())),
```

**Step 3: Verify Convex compiles**

Run: `npx convex dev --once 2>&1 | tail -5`
Expected: Successful push

**Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add specs to baseModels and restrictToModels to options schema"
```

---

### Task 2: Update Convex mutations and queries

**Files:**
- Modify: `convex/baseModels.ts:80-96` (create mutation), `convex/baseModels.ts:98-124` (update mutation)
- Modify: `convex/options.ts:80-97` (create mutation), `convex/options.ts:99-126` (update mutation)
- Modify: `convex/optionGroups.ts:38-70` (listWithOptionsForCategory query)

**Step 1: Add `specs` to baseModels create and update mutations**

In `convex/baseModels.ts`, add to the `create` args (after `isActive: v.boolean(),` on line 91):

```typescript
    specs: v.optional(v.array(v.object({ label: v.string(), value: v.string() }))),
```

In the `update` args (after `isActive: v.optional(v.boolean()),` on line 110):

```typescript
    specs: v.optional(v.array(v.object({ label: v.string(), value: v.string() }))),
```

**Step 2: Add `restrictToModels` to options create and update mutations**

In `convex/options.ts`, add to the `create` args (after `isDefault: v.boolean(),` on line 92):

```typescript
    restrictToModels: v.optional(v.array(v.string())),
```

In the `update` args (after `isDefault: v.optional(v.boolean()),` on line 112):

```typescript
    restrictToModels: v.optional(v.array(v.string())),
```

**Step 3: Update `listWithOptionsForCategory` to accept optional `baseModelId` and filter options**

In `convex/optionGroups.ts`, replace the `listWithOptionsForCategory` query (lines 38-70) with:

```typescript
export const listWithOptionsForCategory = query({
  args: {
    categoryId: v.string(),
    baseModelId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const groups = await ctx.db
      .query('optionGroups')
      .withIndex('by_isActive', (q) => q.eq('isActive', true))
      .collect()
    const applicable = groups
      .filter((g) => g.appliesTo.length === 0 || g.appliesTo.includes(args.categoryId))
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const result = []
    for (const group of applicable) {
      const options = await ctx.db
        .query('options')
        .withIndex('by_optionGroupId', (q) => q.eq('optionGroupId', group._id))
        .collect()
      let activeOptions = options
        .filter((o) => o.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)

      // Filter by model restriction if a baseModelId is provided
      if (args.baseModelId) {
        activeOptions = activeOptions.filter(
          (o) => !o.restrictToModels || o.restrictToModels.length === 0 || o.restrictToModels.includes(args.baseModelId!),
        )
      }

      const optionsWithImages = await Promise.all(
        activeOptions.map(async (opt) => ({
          ...opt,
          imageUrl: opt.imageStorageId
            ? await ctx.storage.getUrl(opt.imageStorageId)
            : null,
        })),
      )
      if (optionsWithImages.length > 0) {
        result.push({ group, items: optionsWithImages })
      }
    }
    return result
  },
})
```

Note: Groups with zero applicable options after model filtering are excluded from results.

**Step 4: Verify Convex compiles**

Run: `npx convex dev --once 2>&1 | tail -5`
Expected: Successful push

**Step 5: Commit**

```bash
git add convex/baseModels.ts convex/options.ts convex/optionGroups.ts
git commit -m "feat: update mutations for specs/restrictToModels and add model filtering to option query"
```

---

### Task 3: Install Tiptap and create editor component

**Files:**
- Modify: `package.json`
- Create: `src/components/admin/rich-text-editor.tsx`

**Step 1: Install Tiptap packages**

Run: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/pm`

**Step 2: Create the RichTextEditor component**

```tsx
// src/components/admin/rich-text-editor.tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { cn } from '@/lib/utils'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Undo,
  Redo,
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none min-h-[120px] px-3 py-2 focus:outline-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4',
      },
    },
  })

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
        active && 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-md border">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 w-px bg-border" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>
      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  )
}
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep rich-text || echo "No errors"`

**Step 4: Commit**

```bash
git add package.json package-lock.json src/components/admin/rich-text-editor.tsx
git commit -m "feat: install Tiptap and create RichTextEditor component"
```

---

### Task 4: Update admin model form (rich text + specs)

**Files:**
- Modify: `src/components/admin/model-form.tsx`

**Step 1: Replace description Textarea with RichTextEditor and add specs editor**

Add the import at the top of the file (after the existing imports):

```typescript
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { Plus, Trash2 } from 'lucide-react'
```

Add `specs` to the form state. In the `useState` initializer (lines 43-70), add after the `imageStorageId` field:

```typescript
        specs: (model?.specs ?? []) as Array<{ label: string; value: string }>,
```

And in the `useEffect` that populates form (lines 78-95), add:

```typescript
        specs: (model.specs ?? []) as Array<{ label: string; value: string }>,
```

In the `handleSubmit` function, add `specs` to both the create and update args objects (alongside the other fields):

```typescript
          specs: form.specs.filter((s) => s.label.trim() && s.value.trim()),
```

Replace the description `<Textarea>` section (lines 236-245) with:

```tsx
          {/* Description (Rich Text) */}
          <div className="space-y-2">
            <Label>Beschreibung</Label>
            <RichTextEditor
              content={form.description}
              onChange={(html) => updateField('description', html)}
              placeholder="Optionale Beschreibung..."
            />
          </div>
```

Add a new section before the Submit button (before line 318) for specs:

```tsx
          {/* Technical Specs */}
          <div className="space-y-2">
            <Label>Technische Daten</Label>
            {form.specs.map((spec, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Bezeichnung"
                  value={spec.label}
                  onChange={(e) => {
                    const next = [...form.specs]
                    next[i] = { ...next[i], label: e.target.value }
                    setForm((prev) => ({ ...prev, specs: next }))
                  }}
                  className="flex-1"
                />
                <Input
                  placeholder="Wert"
                  value={spec.value}
                  onChange={(e) => {
                    const next = [...form.specs]
                    next[i] = { ...next[i], value: e.target.value }
                    setForm((prev) => ({ ...prev, specs: next }))
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const next = form.specs.filter((_, j) => j !== i)
                    setForm((prev) => ({ ...prev, specs: next }))
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  specs: [...prev.specs, { label: '', value: '' }],
                }))
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Zeile hinzufugen
            </Button>
          </div>
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep model-form || echo "No errors"`

**Step 3: Commit**

```bash
git add src/components/admin/model-form.tsx
git commit -m "feat: add rich text editor and specs editor to model form"
```

---

### Task 5: Update admin option form (model restriction picker)

**Files:**
- Modify: `src/components/admin/option-form.tsx`

**Step 1: Add model restriction UI**

Add the `restrictToModels` state in `OptionFormInner` (after `imageStorageId` state, around line 164):

```typescript
  const [restrictToModels, setRestrictToModels] = useState<string[]>(option?.restrictToModels ?? [])
```

Add to the `useEffect` that populates from option data (after `setImageStorageId`, around line 179):

```typescript
      setRestrictToModels(option.restrictToModels ?? [])
```

In `handleSubmit`, add `restrictToModels` to both the update and create args objects (before the imageStorageId handling):

```typescript
          restrictToModels: restrictToModels.length > 0 ? restrictToModels : undefined,
```

Add the base models query at the top of `OptionFormInner` (after the existing queries, around line 151):

```typescript
  const allModels = useQuery(api.baseModels.list)
```

Add the model restriction UI section after the "Is Default" switch (before the Image section, around line 386):

```tsx
        {/* Restrict to Models */}
        <div className="space-y-2">
          <Label>Modell-Einschrankung</Label>
          <p className="text-xs text-muted-foreground">
            Keine Auswahl = verfugbar fur alle Modelle
          </p>
          <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border p-2">
            {allModels?.map((model) => (
              <label key={model._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={restrictToModels.includes(model._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setRestrictToModels((prev) => [...prev, model._id])
                    } else {
                      setRestrictToModels((prev) => prev.filter((id) => id !== model._id))
                    }
                  }}
                  className="rounded border-input"
                />
                {model.name}
              </label>
            ))}
          </div>
        </div>
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep option-form || echo "No errors"`

**Step 3: Commit**

```bash
git add src/components/admin/option-form.tsx
git commit -m "feat: add model restriction picker to option form"
```

---

### Task 6: Update configurator (HTML descriptions, specs table, image fix, model filtering)

**Files:**
- Modify: `src/components/configurator/model-picker.tsx:40` (object-cover → object-contain)
- Modify: `src/components/configurator/model-picker.tsx:50-52` (HTML description)
- Modify: `src/components/configurator/studio-layout.tsx:339-342` (pass baseModelId to query)
- Modify: `src/components/configurator/studio-layout.tsx:404-413` (HTML description + specs)
- Modify: `src/components/configurator/accessory-picker.tsx:170-175` (pass baseModelId to query)

**Step 1: Fix image cropping in model-picker.tsx**

In `src/components/configurator/model-picker.tsx`, change line 40 from:

```tsx
                  className="h-full w-full object-cover"
```

to:

```tsx
                  className="h-full w-full object-contain"
```

**Step 2: Render HTML description in model-picker.tsx**

Replace lines 50-52:

```tsx
              {model.description && (
                <p className="mt-1 text-sm text-muted-foreground">{model.description}</p>
              )}
```

with:

```tsx
              {model.description && (
                <div
                  className="mt-1 text-sm text-muted-foreground prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4"
                  dangerouslySetInnerHTML={{ __html: model.description }}
                />
              )}
```

**Step 3: Pass baseModelId to option query in accessory-picker.tsx**

In `src/components/configurator/accessory-picker.tsx`, add `selectedBaseModelId` to the destructuring (line 170):

```tsx
  const { selectedCategory, selectedBaseModelId } = useConfiguratorStore()
```

Update the query call (lines 172-175):

```tsx
  const groupsWithOptions = useQuery(
    api.optionGroups.listWithOptionsForCategory,
    selectedCategory ? { categoryId: selectedCategory, baseModelId: selectedBaseModelId ?? undefined } : 'skip',
  )
```

**Step 4: Pass baseModelId to option query in studio-layout.tsx**

In `src/components/configurator/studio-layout.tsx`, update the query call (lines 339-342):

```tsx
  const groupsWithOptions = useQuery(
    api.optionGroups.listWithOptionsForCategory,
    selectedCategory ? { categoryId: selectedCategory, baseModelId: selectedBaseModelId ?? undefined } : 'skip',
  )
```

**Step 5: Render HTML description and specs in studio-layout.tsx**

Replace the description rendering (lines 406-408):

```tsx
            {baseModel.description && (
              <p className="mt-1 text-muted-foreground">{baseModel.description}</p>
            )}
```

with:

```tsx
            {baseModel.description && (
              <div
                className="mt-1 text-muted-foreground prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4"
                dangerouslySetInnerHTML={{ __html: baseModel.description }}
              />
            )}
            {baseModel.specs && baseModel.specs.length > 0 && (
              <div className="mt-4 rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-1.5 text-left font-medium" colSpan={2}>
                        Technische Daten
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {baseModel.specs.map((spec: { label: string; value: string }, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium text-muted-foreground">{spec.label}</td>
                        <td className="px-3 py-1.5">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
```

**Step 6: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`

**Step 7: Commit**

```bash
git add src/components/configurator/model-picker.tsx src/components/configurator/studio-layout.tsx src/components/configurator/accessory-picker.tsx
git commit -m "feat: HTML descriptions, specs table, image fix, model-based option filtering in configurator"
```

---

### Task 7: Enlarge PDF image area

**Files:**
- Modify: `src/modules/pdf/blank-generator.ts:164-209`

**Step 1: Add extra vertical space to the customer section**

In `src/modules/pdf/blank-generator.ts`, change the initial spacing (line 164) from:

```typescript
  moveDown(ctx, 4)
```

to:

```typescript
  moveDown(ctx, 8)
```

And change the customer field line spacing. After each customer field line (inside the `for` loop at line 182), change `moveDown(ctx, 14)` to `moveDown(ctx, 18)`:

```typescript
    moveDown(ctx, 18)
```

This gives the customer section ~30pt more height, making the image area proportionally larger.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep blank-generator || echo "No errors"`

**Step 3: Commit**

```bash
git add src/modules/pdf/blank-generator.ts
git commit -m "feat: enlarge customer/image section in blank PDF"
```

---

### Task 8: Update catalog import/export types for new schema fields

**Files:**
- Modify: `src/lib/catalog-io-types.ts` (add specs + restrictToModels to export types)
- Modify: `src/lib/catalog-export.ts` (export new fields)
- Modify: `src/lib/catalog-import.ts` (parse new fields)
- Modify: `convex/catalogImport.ts` (accept new fields in mutation args)

**Step 1: Update export types**

In `src/lib/catalog-io-types.ts`, add to `ExportBaseModel` (after `isActive`):

```typescript
  specs: Array<{ label: string; value: string }>
```

Add to `ExportOption` (after `isDefault`):

```typescript
  restrictToModels: string[] // model names (not IDs)
```

**Step 2: Update catalog-export.ts**

In the `DbBaseModel` interface, add:

```typescript
  specs?: Array<{ label: string; value: string }>
```

In the `DbOption` interface, add:

```typescript
  restrictToModels?: string[]
```

In `buildExportPayload`, update the baseModels mapping to include specs:

```typescript
    specs: m.specs ?? [],
```

Update the options mapping to resolve model IDs to names. Add a model ID-to-name map:

```typescript
  const modelIdToName = buildIdToNameMap(data.baseModels)
```

Then add to the option mapping:

```typescript
    restrictToModels: (o.restrictToModels ?? [])
      .map((id) => modelIdToName.get(id) ?? id)
      .filter(Boolean),
```

**Step 3: Update catalog-import.ts**

In the JSON parser and XLSX parser, handle the new fields. In validation, pass through `specs` and `restrictToModels`.

In `validateBaseModels`, add to the `valid.push` object:

```typescript
      specs: Array.isArray(item.specs) ? item.specs.filter((s: any) => s.label && s.value) : [],
```

In `validateOptions`, add to the `valid.push` object:

```typescript
      restrictToModels: Array.isArray(item.restrictToModels) ? item.restrictToModels : [],
```

**Step 4: Update convex/catalogImport.ts**

Add `specs` to the baseModels args and `restrictToModels` to the options args. Include them in the insert/patch calls.

**Step 5: Verify everything compiles**

Run: `npx tsc --noEmit 2>&1 | tail -10`

**Step 6: Commit**

```bash
git add src/lib/catalog-io-types.ts src/lib/catalog-export.ts src/lib/catalog-import.ts convex/catalogImport.ts
git commit -m "feat: update import/export to handle specs and restrictToModels"
```

---

### Task 9: End-to-end verification

**Step 1: Full TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Convex push**

Run: `npx convex dev --once 2>&1 | tail -5`
Expected: Successful push

**Step 3: Next.js build**

Run: `npm run build 2>&1 | tail -15`
Expected: Successful build

**Step 4: Manual smoke test**

1. Admin → Modelle → Edit a model → verify rich text editor works, add specs
2. Admin → Optionen → Edit an option → verify model restriction checkboxes appear
3. Configurator → Select model → verify image not cropped (object-contain)
4. Configurator → Verify HTML description renders with formatting
5. Configurator → Verify specs table appears under description
6. Configurator → Verify restricted options are hidden for non-matching models
7. Generate blank PDF → verify image area is larger

---

## File Summary

| File | Action | Task |
|------|--------|------|
| `convex/schema.ts` | Modify | Task 1 |
| `convex/baseModels.ts` | Modify | Task 2 |
| `convex/options.ts` | Modify | Task 2 |
| `convex/optionGroups.ts` | Modify | Task 2 |
| `package.json` | Modify | Task 3 |
| `src/components/admin/rich-text-editor.tsx` | Create | Task 3 |
| `src/components/admin/model-form.tsx` | Modify | Task 4 |
| `src/components/admin/option-form.tsx` | Modify | Task 5 |
| `src/components/configurator/model-picker.tsx` | Modify | Task 6 |
| `src/components/configurator/studio-layout.tsx` | Modify | Task 6 |
| `src/components/configurator/accessory-picker.tsx` | Modify | Task 6 |
| `src/modules/pdf/blank-generator.ts` | Modify | Task 7 |
| `src/lib/catalog-io-types.ts` | Modify | Task 8 |
| `src/lib/catalog-export.ts` | Modify | Task 8 |
| `src/lib/catalog-import.ts` | Modify | Task 8 |
| `convex/catalogImport.ts` | Modify | Task 8 |

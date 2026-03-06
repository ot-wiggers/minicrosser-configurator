# Configurator UX Improvements Design

**Date:** 2026-03-06
**Status:** Approved

## 1. Individuelle Positionen in Studio-Ansicht

### Problem
Custom line items (Individuelle Positionen) exist in CartSidebar (stepper mode) but are completely absent from StudioLayout.

### Solution
Add a "Individuelle Positionen" section to `studio-layout.tsx`, placed after the last option group within the current step, before the navigation buttons.

**UI:**
- List of existing custom line items (name, price, delete button)
- Inline add form: Name, SKU (optional), Artikelnr. (optional), Netto-Preis, Menge
- Reuses existing store methods: `addCustomLineItem`, `removeCustomLineItem`

**Files:**
- `src/components/configurator/studio-layout.tsx` — add custom line items section

---

## 2. RAL-Farbcode-Eingabe via Admin-Flag

### Problem
Options like "RAL-Sonderlackierung" or "RAL Metalliclackierung" require the user to specify a color code, but there is no input field for this.

### Solution — 3 layers:

**Admin (Schema + UI):**
- New optional field on `options` table: `requiresInput: { enabled: boolean, label: string }`
- Admin option form gets: Checkbox "Eingabefeld erforderlich" + text field "Label" (e.g. "RAL-Farbcode")
- Synced to Dexie via catalog sync

**Configurator (Store + UI):**
- `SelectedOption` interface gets: `inputValue?: string`
- New store method: `setOptionInputValue(optionItemId: string, value: string)`
- When an option with `requiresInput.enabled` is selected, a text input appears directly below the option with the configured label (e.g. "RAL-Farbcode: [____]")
- Validation: option is incomplete until `inputValue` is filled

**Document/PDF:**
- `inputValue` is stored in `selectedOptions` and displayed in quotes/PDFs (e.g. "RAL-Sonderlackierung — RAL 7016")

**Files:**
- `convex/schema.ts` — add `requiresInput` to options table
- `convex/options.ts` — update create/update mutations
- `src/modules/catalog/db-types.ts` — add `requiresInput` to `OptionRecord`
- `src/modules/storage/types.ts` — add `inputValue` to `SelectedOption`
- `src/modules/configurator/store.ts` — add `setOptionInputValue` method
- `src/components/configurator/studio-layout.tsx` — render input field for requiresInput options
- `src/components/configurator/accessory-picker.tsx` — render input field for requiresInput options
- `src/app/admin/options/` — add requiresInput fields to admin form

---

## 3. Upgrade-Beschreibungen aufklappbar

### Problem
Upgrade descriptions in `upgrade-picker.tsx` are truncated to 2 lines via `line-clamp-2`. Users cannot read important upgrade details.

### Solution
Add inline expand/collapse toggle per upgrade card.

**UI:**
- Default: 2-line clamp (keeps cards compact)
- "Mehr anzeigen" link below truncated text (only shown when text is actually truncated)
- Click removes `line-clamp-2`, shows full description inline
- Link toggles to "Weniger anzeigen" to collapse
- Local `useState<boolean>` per card, no global state needed
- Truncation detection via `useRef` + `scrollHeight > clientHeight`

**Pure UI change — no schema/store changes needed.**

**Files:**
- `src/components/configurator/upgrade-picker.tsx` — add expand/collapse logic

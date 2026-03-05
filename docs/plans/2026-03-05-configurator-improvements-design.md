# Configurator Improvements Design

**Date:** 2026-03-05
**Status:** Approved

## Overview

Three changes to the configurator:

1. **UpgradePicker in StudioLayout** — missing from studio view
2. **Individuelle Positionen** — custom free-text line items in CartSidebar
3. **Stepper-Neustrukturierung** — new 3-step flow with phase-based option group split

## 1. UpgradePicker in StudioLayout

The `StudioLayout` currently only renders option groups (Color, Single, Multi). The UpgradePicker component is missing.

**Solution:** Add an UpgradePicker section before option groups in the right panel, styled with Studio accent colors (`#ffcf00`). Same `setBaseModel` logic, only visible when `models.length > 1`. Shows `priceOnRequest` as "a.A.".

## 2. Individuelle Positionen (Custom Line Items)

### Store Extension

```ts
// configurator/store.ts
interface CustomLineItem {
  id: string          // nanoid
  name: string        // required
  skuCode?: string    // optional
  articleNo?: string  // optional
  priceNet: number    // required
  quantity: number    // default 1
}

// New state + actions:
customLineItems: CustomLineItem[]
addCustomLineItem(item: Omit<CustomLineItem, 'id'>): void
updateCustomLineItem(id: string, updates: Partial<CustomLineItem>): void
removeCustomLineItem(id: string): void
```

### UI: CartSidebar

- Custom items rendered below catalog items with edit/delete icons
- "+ Individuelle Position" button opens inline form
- Inline form fields: Name (required), SKU (optional), ArtikelNr (optional), Netto-Preis (required), Menge (default 1)
- "Hinzufügen" / "Abbrechen" buttons

### Pricing

`calculatePricingFromItems` receives custom items as additional line items. They appear as normal rows in PDF.

### Document Storage

New field `customLineItems` on documents schema. Restored when editing existing documents.

## 3. Stepper-Neustrukturierung + Gruppen-Split

### Schema: `phase` field on optionGroups

```ts
// convex/schema.ts — optionGroups table
phase: v.optional(v.union(v.literal('VEHICLE_CONFIG'), v.literal('ACCESSORY')))
// Default: "ACCESSORY"
```

Admin dashboard gets a dropdown on option group form to set phase.

### New Step Structure (both Stepper and Studio views)

| Step | Label                    | Content                                           |
|------|--------------------------|----------------------------------------------------|
| 0    | Kategorie                | CategoryPicker (with Auto-Comfort)                  |
| 1    | Fahrzeug Konfiguration   | UpgradePicker + VEHICLE_CONFIG groups               |
| 2    | Zurüstung & Zubehör      | ACCESSORY groups + custom items in CartSidebar      |

### Step Logic Changes

- `setCategoryWithDefaultModel` sets `currentStep: 1` (was 2 when default model exists)
- Step 1 "Basisfahrzeug" (old ModelPicker) is removed — UpgradePicker handles model switching
- `AccessoryPicker` gets a `phase` prop to filter groups

### StudioLayout with Stepping

- Step 1 (Studio): Product image left, UpgradePicker + VEHICLE_CONFIG groups right. "Weiter" button in sticky footer.
- Step 2 (Studio): Product image left, ACCESSORY groups right. Sticky footer with total + "Angebot erstellen".
- Stepper navigation at top in studio style, with back navigation.

## Files Affected

| # | Change                        | Files                                                                 |
|---|-------------------------------|-----------------------------------------------------------------------|
| 1 | UpgradePicker in StudioLayout | `studio-layout.tsx`                                                   |
| 2 | Custom line items             | `store.ts`, `types.ts`, `cart-sidebar.tsx`, `schema.ts`, `documents.ts`, `calc.ts`, `generator.ts` |
| 3 | `phase` field on optionGroups | `schema.ts`, `optionGroups.ts`, admin group form                      |
| 4 | Stepper restructure           | `stepper.tsx`, `new/page.tsx`, `accessory-picker.tsx`                 |
| 5 | StudioLayout with stepping    | `studio-layout.tsx`                                                   |
| 6 | Remove "Basisfahrzeug" step   | `store.ts`, `model-picker.tsx` (no longer rendered as step)           |

## Implementation Order

1. Schema + Backend (phase field, customLineItems)
2. Store (customLineItems logic)
3. Stepper + step logic
4. AccessoryPicker with phase filter
5. StudioLayout with stepping + UpgradePicker
6. CartSidebar with custom line items
7. PDF + Pricing for custom items

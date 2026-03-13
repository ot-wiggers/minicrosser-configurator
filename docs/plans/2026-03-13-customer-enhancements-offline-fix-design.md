# Design: Customer Enhancements + Offline Fix

**Date:** 2026-03-13
**Status:** Approved

## Overview

Four changes in one release:

1. Customer categories (business/private) with dynamic form fields
2. Customer notes field
3. Admin-configurable quick-action checklists per customer
4. Offline mode bug fix (Studio view data + Blanko PDF)

---

## 1. Customer Categories

### Schema Change

Add `customerType` to the `customers` table:

```
customerType: v.union(v.literal("business"), v.literal("private"))
```

Default: `"business"`. Required field.

### Form Behavior

| Field          | Business        | Private         |
|----------------|-----------------|-----------------|
| Firma          | Required        | Optional        |
| Vorname        | Required        | Required        |
| Nachname       | Required        | Required        |
| Ansprechpartner| Visible         | Hidden          |
| Display name   | `company`       | `firstName lastName` |

### UI

- Toggle at top of customer form: "Geschaeftlich" / "Privat" (styled like documentType toggle)
- Fields adapt dynamically based on selection

### Migration

- Existing customers default to `"business"` (backfill via migration script)

---

## 2. Customer Notes

### Schema Change

Add `notes` to the `customers` table:

```
notes: v.optional(v.string())
```

### UI

- Textarea below contact fields in customer form
- Placeholder: "Notizen zum Kunden..."
- No character limit enforced in UI (Convex handles max size)

---

## 3. Customer Quick-Actions (Admin-Configurable)

### New Tables

**customerActions** (action definitions):

```
customerActions {
  label: v.string()              // e.g. "Katalog zuschicken"
  description: v.optional(v.string())  // short explanation
  sortOrder: v.number()
  isActive: v.boolean()
}
```

**customerActionItems** (per-customer state):

```
customerActionItems {
  customerId: v.id("customers")
  actionId: v.id("customerActions")
  checked: v.boolean()
  checkedAt: v.optional(v.number())   // timestamp
  checkedBy: v.optional(v.id("users"))
  note: v.optional(v.string())        // optional note per action
}

Index: by_customer on customerId
Index: by_customer_action on [customerId, actionId]
```

### Seed Data

Initial actions created on first deploy:

1. Katalog zuschicken
2. Marketingmaterial senden
3. Probefahrt vereinbaren
4. Rueckruf vereinbaren
5. Finanzierungsangebot erstellen
6. Wartungsvertrag anbieten

### Admin UI

New section in Admin Dashboard settings:
- CRUD for customer actions (label, description, sort order, active/inactive)
- Reorder via sort controls

### Customer Profile UI

- Checklist below customer data
- Each action: checkbox + label + description (gray)
- When checked: timestamp + employee name shown
- "Alle zuruecksetzen" button for repeat visits

### Pipeline Board Integration

- Small badge on customer cards: "3/6 erledigt" showing completed/total actions

---

## 4. Offline Mode Bug Fix

### Problem

Studio view shows no data when offline. Blanko PDF generation fails offline.

### Root Cause (suspected)

Catalog data (categories, base models, option groups, options) is not being cached to Dexie when loaded online, so the offline fallback has no data to read.

### Fix Strategy

1. **Audit `useOfflineQuery` hook**: Verify it writes Convex query results to Dexie on every successful online load
2. **Audit cache-warming**: Ensure all catalog tables are cached:
   - categories
   - baseModels
   - optionGroups
   - options
3. **Audit `useOfflineImage` hook**: Verify product images and logos are stored as blobs in Dexie
4. **Fix Blanko PDF**: Ensure `blank-pdf-buttons.tsx` uses offline-capable data fetching, not direct Convex queries
5. **Test**: Verify full offline flow: load app online -> go offline -> Studio view shows data -> Blanko PDF generates

### No Backend Changes

This fix is entirely in frontend hooks and caching logic.

---

## Files Affected

### Schema/Backend
- `convex/schema.ts` — add customerType, notes to customers; add customerActions and customerActionItems tables
- `convex/customers.ts` — update create/update mutations for new fields; add migration
- `convex/customerActions.ts` — new CRUD mutations/queries
- `convex/customerActionItems.ts` — new mutations/queries for toggling actions

### Frontend - Customer Form
- `src/components/configurator/customer-form.tsx` (or equivalent) — customerType toggle, dynamic fields, notes textarea
- `src/components/admin/customer-form.tsx` (if separate) — same changes

### Frontend - Actions UI
- `src/components/customers/customer-actions.tsx` — new checklist component
- `src/components/admin/customer-actions-settings.tsx` — new admin CRUD for actions

### Frontend - Pipeline
- `src/components/documents/pipeline-board.tsx` — action badge on customer cards

### Frontend - Offline
- `src/hooks/use-offline-query.ts` — fix cache write/read
- `src/hooks/use-offline-image.ts` — fix blob caching
- `src/components/dashboard/blank-pdf-buttons.tsx` — use offline-capable queries
- `src/modules/storage/db.ts` — verify Dexie schema covers all needed tables

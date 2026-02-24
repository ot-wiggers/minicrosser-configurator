# PDF-Template nach Briefbogen-Vorlage — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the PDF document generator to match the Mini Crosser corporate letterhead (Briefbogen 2019). Add 3-column footer with two bank connections, sender line, position numbers, signature area for orders, and fix the date formatting bug.

**Architecture:** Extend existing `src/modules/pdf/` module (corporate.ts, generator.ts, helpers.ts). No new files needed. Settings are key-value in Convex, no schema changes required.

---

## Task 1: Add new settings fields to CorporateSettings + seed defaults

**Files:**
- Modify: `src/modules/pdf/corporate.ts` (CorporateSettings interface + DEFAULTS + buildCorporateSettings)
- Modify: `convex/seedData.ts` (seedDefaultSettings — add new entries)

**Step 1: Extend CorporateSettings interface**

In `src/modules/pdf/corporate.ts`, add these fields to the `CorporateSettings` interface after `bankBic1`:

```ts
  bankName2: string
  bankIban2: string
  bankBic2: string
  companyLegalName: string
  companyRegister: string
  companyCeo: string
  companyTaxOffice: string
  companyVatId: string
```

**Step 2: Add defaults**

In the `DEFAULTS` object, add after `bankBic1: ''`:

```ts
  bankName2: '',
  bankIban2: '',
  bankBic2: '',
  companyLegalName: '',
  companyRegister: '',
  companyCeo: '',
  companyTaxOffice: '',
  companyVatId: '',
```

**Step 3: Add to buildCorporateSettings**

In the `buildCorporateSettings` return object, add after `bankBic1`:

```ts
    bankName2: str('bankName2', DEFAULTS.bankName2),
    bankIban2: str('bankIban2', DEFAULTS.bankIban2),
    bankBic2: str('bankBic2', DEFAULTS.bankBic2),
    companyLegalName: str('companyLegalName', DEFAULTS.companyLegalName),
    companyRegister: str('companyRegister', DEFAULTS.companyRegister),
    companyCeo: str('companyCeo', DEFAULTS.companyCeo),
    companyTaxOffice: str('companyTaxOffice', DEFAULTS.companyTaxOffice),
    companyVatId: str('companyVatId', DEFAULTS.companyVatId),
```

**Step 4: Seed new defaults**

In `convex/seedData.ts`, add these entries to the `defaults` array in `seedDefaultSettings`:

```ts
      { key: 'bankName2', value: '' },
      { key: 'bankIban2', value: '' },
      { key: 'bankBic2', value: '' },
      { key: 'companyLegalName', value: '' },
      { key: 'companyRegister', value: '' },
      { key: 'companyCeo', value: '' },
      { key: 'companyTaxOffice', value: '' },
      { key: 'companyVatId', value: '' },
```

**Step 5: Verify**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/modules/pdf/corporate.ts convex/seedData.ts
git commit -m "feat: add bank2 + legal settings to CorporateSettings"
```

---

## Task 2: Rewrite 3-column corporate footer

**Files:**
- Modify: `src/modules/pdf/corporate.ts` (drawCorporateFooter)

**Step 1: Replace drawCorporateFooter**

Replace the entire `drawCorporateFooter` function with a new 3-column version:

- Column 1 (left): Company name, street, ZIP+city, Tel/Fax, Email, Web
- Column 2 (center): Bank 1 (name, IBAN, BIC), Bank 2 (name, IBAN, BIC)
- Column 3 (right): Legal name, register, CEO, tax office, VAT ID

Each column starts at footerY and draws lines downward with fontSize from settings.

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/modules/pdf/corporate.ts
git commit -m "feat: 3-column corporate footer with two bank connections"
```

---

## Task 3: Add sender line + document info block to header area

**Files:**
- Modify: `src/modules/pdf/generator.ts` (after corporate header, before customer block)

**Step 1: Add sender line**

After `applyPageBranding(ctx, settings)` and before the document number/date section, add a small sender line:

```ts
// Sender line (small, gray)
drawText(ctx, `${settings.companyName} - ${settings.companyStreet} - ${settings.companyZip} ${settings.companyCity}`, ctx.margin, { size: 6.5, color: { r: 0.5, g: 0.5, b: 0.5 } })
moveDown(ctx, 20)
```

**Step 2: Restructure document info**

Move document number and date to a right-aligned info block with labels:

```
Dokumentnr.:  MC-2026-000001
Datum:        24.02.2026
```

Customer address goes on the left at the same Y level.

**Step 3: Verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/modules/pdf/generator.ts
git commit -m "feat: add sender line and structured document info block"
```

---

## Task 4: Fix formatDatePdf + add Pos. column to line items table

**Files:**
- Modify: `src/modules/pdf/generator.ts`

**Step 1: Fix formatDatePdf signature**

Change from:
```ts
function formatDatePdf(date: string): string {
```
to:
```ts
function formatDatePdf(date: string | number): string {
```

**Step 2: Add Pos. column**

Add a `Pos.` column (position number) as the first column in the line items table. Renumber column positions. Add alternating row backgrounds and horizontal lines between rows.

**Step 3: Verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/modules/pdf/generator.ts
git commit -m "fix: formatDatePdf accepts number, add Pos. column with alternating rows"
```

---

## Task 5: Add signature area + marketing consent for orders

**Files:**
- Modify: `src/modules/pdf/generator.ts` (after notes section)

**Step 1: Add signature area for ORDER documents**

After the notes section, if `doc.document_type === 'ORDER'`, draw:
- A "Datum, Ort" line on the left
- A "Unterschrift Kunde" line on the right
- Both with label text below the line

**Step 2: Add marketing consent text**

If the document has marketing consent data, add a small text line:
"Marketingeinwilligung erteilt am [date]"

**Step 3: Verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/modules/pdf/generator.ts
git commit -m "feat: add signature area and marketing consent for order PDFs"
```

---

## Task 6: Seed new settings in prod + dev, update pdf-preview

**Step 1: Seed new settings in both deployments**

Run:
```bash
npx convex run seedData:seedDefaultSettings --prod
npx convex dev --once
```

Note: seedDefaultSettings checks `settings.length > 0`, so if settings already exist it won't re-seed. We may need to manually add the new keys via a one-off mutation or update the seed to be additive.

**Step 2: Update pdf-preview to show new footer**

The preview already calls `buildCorporateSettings` which will now include the new fields. The footer will auto-update since it reads from settings. No code change needed if the preview calls the shared functions.

**Step 3: Final verification**

Run: `npx tsc --noEmit`

**Step 4: Commit if any changes**

---

## Verification Checklist

1. `npx tsc --noEmit` — 0 errors
2. PDF preview in admin shows 3-column footer
3. Generated document PDF has sender line + document info block
4. Line items table has Pos. column with alternating rows
5. Order PDFs show signature area
6. Dates render correctly (no "Invalid Date")
7. New settings fields available in CorporateSettings

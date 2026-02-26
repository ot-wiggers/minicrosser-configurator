# Katalog Import/Export — Design-Dokument

**Datum:** 2026-02-26
**Status:** Genehmigt
**Ansatz:** Hybrid (Export client-seitig, Import server-seitig)

---

## 1. Übersicht

Eine Import/Export-Funktion für den gesamten Produktkatalog (Kategorien, Modelle, Optionsgruppen, Optionen). Ermöglicht Daten-Backup, Bulk-Bearbeitung in Excel und Datentransfer zwischen Umgebungen.

### Entscheidungen

| Frage | Antwort |
|-------|---------|
| Formate | JSON + XLSX (beides) |
| Bilder | Nur Daten, keine Bilder |
| Import-Modus | Upsert (Matching per Name/SKU) |
| UI-Platzierung | Eigene Seite `/admin/import-export` |
| Architektur | Hybrid: Export client-seitig, Import server-seitig |

---

## 2. Datenstruktur & Export-Format

### 2.1 JSON-Format

Einzelne Datei mit allen 4 Entitäten. Convex-IDs werden durch **menschenlesbare Referenzen** ersetzt:

```json
{
  "version": 1,
  "exportedAt": "2026-02-26T14:30:00Z",
  "categories": [
    {
      "name": "3-Rad-Elektromobile",
      "sortOrder": 1,
      "isActive": true
    }
  ],
  "optionGroups": [
    {
      "name": "Farbe",
      "selectionType": "SINGLE",
      "appliesTo": ["3-Rad-Elektromobile", "4-Rad-Elektromobile"],
      "sortOrder": 1,
      "isActive": true
    }
  ],
  "baseModels": [
    {
      "categoryRef": "3-Rad-Elektromobile",
      "skuCode": "MC-M1",
      "articleNo": "10001",
      "name": "Minicrosser M1 3W",
      "description": "Kompaktes 3-Rad-Modell",
      "priceNet": 3500.00,
      "priceGross": 4165.00,
      "sortOrder": 1,
      "isActive": true
    }
  ],
  "options": [
    {
      "optionGroupRef": "Farbe",
      "skuCode": "COL-RED",
      "articleNo": "20001",
      "name": "Rot",
      "description": null,
      "priceNet": 0,
      "priceGross": 0,
      "sortOrder": 1,
      "isActive": true,
      "isDefault": false
    }
  ]
}
```

### Referenz-Strategie

| Entität | Referenz-Feld | Auflösung über |
|---------|--------------|----------------|
| `baseModels.categoryRef` | Category-Name | `categories[].name` |
| `options.optionGroupRef` | OptionGroup-Name | `optionGroups[].name` |
| `optionGroups.appliesTo` | Category-Names Array | `categories[].name` |

### 2.2 XLSX-Format

4 Arbeitsblätter, je eins pro Entität:

| Blatt | Spalten |
|-------|---------|
| **Kategorien** | name, sortOrder, isActive |
| **Optionsgruppen** | name, selectionType, appliesTo (Komma-getrennt), sortOrder, isActive |
| **Modelle** | categoryRef, skuCode, articleNo, name, description, priceNet, priceGross, sortOrder, isActive |
| **Optionen** | optionGroupRef, skuCode, articleNo, name, description, priceNet, priceGross, sortOrder, isActive, isDefault |

- `isActive`/`isDefault`: `true`/`false` als Strings
- `appliesTo`: Komma-getrennte Category-Namen (z.B. `"3-Rad-Elektromobile, 4-Rad-Elektromobile"`)
- Leere Zellen = `null`/`undefined`

---

## 3. Export — Client-seitig

### Ablauf

```
[User klickt "Export"] → useQuery-Daten lesen → JSON/XLSX generieren → Download auslösen
```

### Modul: `src/lib/catalog-export.ts`

```typescript
// Hauptfunktionen
export function exportCatalogToJson(data: CatalogData): string
export function exportCatalogToXlsx(data: CatalogData): ArrayBuffer

// Typen
interface CatalogData {
  categories: Category[]
  baseModels: BaseModel[]
  optionGroups: OptionGroup[]
  options: Option[]
}
```

**Warum client-seitig:** Die Daten sind bereits über `useQuery` im Client verfügbar. Kein Roundtrip zum Server nötig.

### XLSX-Generierung

- Nutzt `xlsx` (SheetJS Community Edition) via **dynamic import**
- Nur auf der Admin-Seite geladen → kein Bundle-Bloat
- `json_to_sheet()` pro Entität → Workbook → `writeFile()`

### Download-Trigger

```typescript
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

### Dateiname-Schema

- JSON: `katalog-export-2026-02-26.json`
- XLSX: `katalog-export-2026-02-26.xlsx`

---

## 4. Import — Client-Parsing + Server-Upsert

### Ablauf

```
[Datei hochladen] → Client parst JSON/XLSX
                   → Client validiert Schema + Referenzen
                   → Vorschau anzeigen (Neu/Update/Fehler)
                   → [User bestätigt] → Convex Mutation (Server-Upsert)
```

### 4.1 Client-seitiges Parsing

**Modul: `src/lib/catalog-import.ts`**

```typescript
// JSON parsen
export function parseCatalogJson(content: string): ParseResult

// XLSX parsen (dynamic import von SheetJS)
export async function parseCatalogXlsx(buffer: ArrayBuffer): Promise<ParseResult>

// Ergebnis
interface ParseResult {
  categories: ImportCategory[]
  optionGroups: ImportOptionGroup[]
  baseModels: ImportBaseModel[]
  options: ImportOption[]
  errors: ParseError[]    // Schema-Fehler, fehlende Pflichtfelder
  warnings: string[]      // z.B. unbekannte Spalten ignoriert
}
```

### 4.2 Client-seitige Validierung

Vor dem Import:
1. **Schema-Validierung:** Pflichtfelder vorhanden? Typen korrekt?
2. **Referenz-Prüfung:** Existiert `categoryRef` in den Import-Kategorien ODER in bestehenden DB-Kategorien?
3. **Duplikat-Erkennung:** Welche Einträge sind neu vs. Update (per Name/SKU)?

```typescript
interface ImportPreview {
  categories: { new: number; updated: number; errors: ImportRowError[] }
  optionGroups: { new: number; updated: number; errors: ImportRowError[] }
  baseModels: { new: number; updated: number; errors: ImportRowError[] }
  options: { new: number; updated: number; errors: ImportRowError[] }
}
```

### 4.3 Server-seitige Upsert-Mutation

**Modul: `convex/catalogImport.ts`**

```typescript
// Convex Mutation
export const importCatalog = mutation({
  args: {
    categories: v.array(v.object({...})),
    optionGroups: v.array(v.object({...})),
    baseModels: v.array(v.object({...})),
    options: v.array(v.object({...})),
  },
  handler: async (ctx, args) => { ... }
})
```

### Upsert-Reihenfolge (Abhängigkeiten beachten!)

```
1. Categories     (keine Abhängigkeiten)
2. OptionGroups   (braucht Category-IDs für appliesTo)
3. BaseModels     (braucht Category-IDs)
4. Options        (braucht OptionGroup-IDs)
```

### Matching-Strategie

| Entität | Match-Key | Verhalten |
|---------|-----------|-----------|
| Categories | `name` | Existiert → Update, sonst → Create |
| OptionGroups | `name` | Existiert → Update, sonst → Create |
| BaseModels | `skuCode` | Existiert → Update, sonst → Create |
| Options | `skuCode` | Existiert → Update, sonst → Create |

### Fehlerbehandlung

- **Non-blocking:** Einzelne Zeilen-Fehler stoppen nicht den gesamten Import
- Ergebnis enthält `{ imported: number, skipped: number, errors: RowError[] }`
- Errors werden in der UI nach Import angezeigt

---

## 5. UI — `/admin/import-export`

### Seitenlayout

```
┌─────────────────────────────────────────┐
│  Import / Export                         │
├─────────────────────┬───────────────────┤
│  ┌───────────────┐  │  ┌─────────────┐  │
│  │ Export         │  │  │ Import      │  │
│  │               │  │  │             │  │
│  │ [JSON] [XLSX] │  │  │ [Drop Zone] │  │
│  │               │  │  │             │  │
│  │ Exportiert:   │  │  │ Vorschau:   │  │
│  │ • 3 Kat.      │  │  │ • 2 neu     │  │
│  │ • 7 Modelle   │  │  │ • 5 update  │  │
│  │ • 6 Gruppen   │  │  │ • 0 fehler  │  │
│  │ • 29 Optionen │  │  │             │  │
│  │               │  │  │ [Import]    │  │
│  └───────────────┘  │  └─────────────┘  │
└─────────────────────┴───────────────────┘
```

### Export-Karte

- Zeigt aktuelle Anzahl der Katalogdaten (aus `useQuery`)
- 2 Buttons: "Als JSON exportieren", "Als Excel exportieren"
- Loading-State während Generierung
- Toast bei Erfolg

### Import-Karte

- Drag & Drop Zone (akzeptiert `.json` und `.xlsx`)
- Alternative: "Datei auswählen" Button
- Nach Upload: **Vorschau-Tabelle** mit Zusammenfassung
  - Pro Entität: Anzahl Neu / Update / Fehler
  - Fehler-Details aufklappbar
- "Importieren" Button (disabled bei kritischen Fehlern)
- Progress-Bar während Import
- Ergebnis-Toast mit Details

### Admin-Sidebar

Neuer Link "Import/Export" unter dem bestehenden Menü.

---

## 6. Neue Dateien & Dependencies

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/app/admin/(authenticated)/import-export/page.tsx` | UI-Seite |
| `src/lib/catalog-export.ts` | JSON + XLSX Export-Logik |
| `src/lib/catalog-import.ts` | Parsing + Validierung |
| `convex/catalogImport.ts` | Server-seitige Upsert-Mutation |

### Zu modifizierende Dateien

| Datei | Änderung |
|-------|---------|
| `src/components/admin/admin-sidebar.tsx` | Link zu /admin/import-export |

### NPM Dependencies

| Package | Version | Größe | Zweck |
|---------|---------|-------|-------|
| `xlsx` | ^0.18.5 | ~180KB gzip | XLSX lesen/schreiben |

Dynamic import auf der Admin-Seite → kein Impact auf öffentliches Bundle.

---

## 7. Nicht im Scope

- Bilder-Export/Import (nur Datenfelder)
- Color Variant Images Export
- Dokumente / Kunden Export
- CSV-Format
- Automatischer periodischer Export
- Import-History / Undo

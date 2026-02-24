# Mini Crosser Konfigurator — Bugfixes & Feature-Design

**Datum:** 2026-02-24
**Status:** Approved

---

## Farbpalette (Corporate)

| Rolle | Hex | Verwendung |
|-------|-----|------------|
| Primaer | `#2b373d` | Headers, Navigation, Footer, PDF-Header |
| Akzent | `#ffcf00` | Selektion, Buttons, Highlights, Preise |
| Sekundaer | `#4A4A4A` | Body-Text, subtile Elemente |
| Weiss | `#FFFFFF` | Text auf dunklem Hintergrund |

---

## Phase 1: Bug-Fixes

### Bug A: Leere Bearbeitungsformulare (Kategorien, Modelle, Optionen)

**Ursache:** Race-Condition in der useEffect-Logik. Formulare setzen Felder auf leere Werte zurueck, bevor die Convex-Query Daten geladen hat. Die OptionGroupForm hat dieses Problem nicht, weil ihre Logik defensiver ist.

**Betroffene Dateien:**
- `src/app/admin/categories/page.tsx`
- `src/app/admin/models/page.tsx`
- `src/app/admin/options/page.tsx`
- `src/components/admin/category-form.tsx`
- `src/components/admin/model-form.tsx`
- `src/components/admin/option-form.tsx`

**Fix:**
1. Key-Prop auf Elternseite: `<CategoryForm key={editId ?? 'new'} .../>` (erzwingt Remount bei ID-Wechsel)
2. useEffect defensiver: Nur zuruecksetzen wenn `!categoryId` (Create-Modus), nicht wenn Daten noch laden
3. Referenz-Pattern: `option-group-form.tsx` als Vorlage

---

### Bug B: Session geht bei Admin-Refresh verloren

**Symptom:** Admin-Seite kurz sichtbar, dann Redirect zum Login.

**Ursache:** Auth-Guard prueft nur lokalen Zustand aus localStorage. `validateSession` (jetzt Action statt Query) wird nach Hydration nicht aufgerufen. Session-Token wird nie serverseitig revalidiert.

**Betroffene Dateien:**
- `src/components/admin/auth-guard.tsx`
- `src/modules/auth/auth-store.ts`

**Fix:**
1. Auth-Guard: Nach Hydration `validateSession` Action aufrufen
2. Waehrend Validierung: Loading-Spinner zeigen (statt kurz Seite + dann Redirect)
3. Bei Fehlschlag: `clearSession()` + Redirect
4. Convex-Action aufrufen via `useAction(api.auth.validateSession)` oder direkten fetch

---

### Bug C: Dokumentnummer "undefined" und Datum "Invalid Date"

**Ursache:**
- `document-list.tsx` uebergibt `doc._creationTime` (Number) direkt an `formatDate()` statt `new Date()` zu wrappen
- `documentNo` fehlt moeglicherweise bei manchen Dokumenten

**Betroffene Dateien:**
- `src/components/documents/document-list.tsx` (Zeile ~84)
- `src/lib/utils.ts` (formatDate Signatur)

**Fix:**
1. `formatDate(new Date(doc._creationTime).toISOString())` statt `formatDate(doc._creationTime)`
2. Fallback: `doc.documentNo ?? '\u2014'`
3. `formatDate` Signatur erweitern: `string | Date | number` akzeptieren

---

## Phase 2: PDF-Template nach Briefbogen-Vorlage

### Referenz

Mini Crosser Briefbogen 2019 (`MiniCrosser_Kopfbogen_2019_final.pdf`)

### Layout-Struktur (A4, nur Header + Footer, Inhalt auf weissem Hintergrund)

**Header:**
- Gelber Seitenbalken links (ca. 8pt breit, volle Seitenhoehe)
- Grauer Balken oben ueber volle Breite
- Links im Balken: "DAS ORIGINAL / WWW.MINICROSSER.INFO / STARK SICHER STABIL" (weiss)
- Rechts: Mini Crosser Logo (Bild-Asset) + "Elektromobile" (Schreibschrift) + "Sale - Service - Solution" (gelb)

**Absenderzeile + Adressblock:**
- Kleine Absenderzeile: "Mini Crosser - Gerhard-Stalling-Str. 42 - 26135 Oldenburg"
- Darunter: Empfaenger (Firma, Name, Strasse, PLZ Ort)
- Rechts daneben: Dokumentnummer, Datum, Sachbearbeiter

**Positions-Tabelle:**
- Spalten: Pos. | Art.-Nr. | Bezeichnung | Menge | Einzelpr. netto | Gesamt netto
- Horizontale Trennlinien zwischen Zeilen
- Alternating Row-Background (leicht grau / weiss)

**Summenblock:**
- Nettobetrag
- MwSt. 19%
- **Bruttobetrag (fett, groesser)**

**Notizen** (optional, aus Dokument-Daten)

**Unterschriftenbereich** (nur bei Bestellungen):
- Leerfeld mit Linie "Datum, Ort" und "Unterschrift Kunde"
- Bei digitaler Signatur: Bild eingebettet ueber der Linie
- Marketing-Einwilligung Text

**Footer (3 Spalten):**
- Links: Wiggers GmbH & Co. KG, Adresse, Tel/Fax, E-Mail
- Mitte: Bankverbindung 1 (OLB, SWIFT-BIC, IBAN) + Bankverbindung 2 (Volksbank, SWIFT-BIC, IBAN)
- Rechts: Pers. haftende Gesellschafterin, HRB/HRA, Geschaeftsfuehrer, Finanzamt, USt-Id-Nr.

### Neue Settings-Felder (Admin > Einstellungen)

| Key | Typ | Beschreibung |
|-----|-----|-------------|
| `bankName2` | string | Zweite Bank (z.B. Volksbank Oldenburg) |
| `bankIban2` | string | IBAN zweite Bank |
| `bankBic2` | string | BIC zweite Bank |
| `companyLegalName` | string | Pers. haftende Gesellschafterin |
| `companyRegister` | string | HRB/HRA Eintraege |
| `companyCeo` | string | Geschaeftsfuehrer |
| `companyTaxOffice` | string | Finanzamt |
| `companyVatId` | string | USt-Id-Nr. |
| `companyFax` | string | Faxnummer |
| `logoStorageId` | Id<_storage> | Firmenlogo |

### Logo-Asset

Mini Crosser Logo als PNG/SVG im Projekt speichern (`public/logo-minicrosser-white.png` fuer Header).
Upload-Moeglichkeit in Admin-Einstellungen.

---

## Phase 3: Kleinere Features

### Feature 1: Automatische Kundennummer

**Format:** `K-10001`, `K-10002`, ... (fortlaufend, global)

**Umsetzung:**
- Nutzt bestehende `sequences`-Tabelle mit Key `customer-seq`
- Startwert: 10001 (um Kollisionen mit bestehenden Sample-Daten zu vermeiden)
- Generierung in `customers.create` Mutation (server-seitig, atomar)
- Im Formular: Feld ist schreibgeschuetzt, zeigt "Wird automatisch vergeben"
- Bestehende Kunden ohne Nummer: keine Aenderung

**Betroffene Dateien:**
- `convex/customers.ts` (create Mutation erweitern)
- `src/components/configurator/customer-form-dialog.tsx` (Feld readonly machen)
- Admin-Kundenformular (falls vorhanden)

---

### Feature 2: Marketing-Einwilligung

**Umsetzung:**
- Checkbox im CustomerFormDialog: "Ich stimme dem Erhalt von Newslettern und Marketinginformationen zu"
- Erscheint am Ende des Formulars, vor dem Absenden-Button

**Schema-Erweiterung (customers):**
- `marketingConsent: v.optional(v.boolean())`
- `marketingConsentDate: v.optional(v.number())`

**PDF:**
- Bei Bestellungen mit Einwilligung: Text unter Positionen: "Marketingeinwilligung erteilt am [Datum]"

---

### Feature 3: Unterschriftenfeld (Bestellungen)

**Digital (Canvas):**
- `SignaturePad`-Komponente mit HTML5 Canvas
- Erscheint im CustomerFormDialog nur bei `documentType === 'ORDER'`
- Zeichnen mit Finger (Touch) oder Maus
- "Loeschen" und "Rueckgaengig" Buttons
- Export als Base64-PNG, Upload in Convex Storage

**Schema-Erweiterung (documents):**
- `signatureStorageId: v.optional(v.id('_storage'))`

**PDF-Integration:**
- Digitale Signatur vorhanden: Bild (ca. 150x50pt) eingebettet ueber der Unterschriftslinie
- Keine digitale Signatur: Leeres Feld mit Linien "Datum, Ort" und "Unterschrift Kunde"

**Library:** `signature_pad` npm Package (leichtgewichtig, ~10KB)

---

### Feature 4: Lightbox fuer Vorschaubilder

**Umsetzung:**
- Wiederverwendbare `ImageLightbox`-Komponente
- Basiert auf shadcn/ui `Dialog` (keine externe Library)
- Klick auf Thumbnail oeffnet Modal mit grossem Bild
- Dunkler Overlay, X-Button, Escape-Taste, Klick-auf-Overlay schliesst

**Einsatzorte:**
- Admin-Tabellen (Kategorien, Modelle, Optionen)
- Konfigurator (Modell-/Options-Bilder)

---

## Phase 4: Konfigurator — Polestar-Layout

### Uebersicht

Zusaetzliche Ansicht ("Studio-Ansicht") neben dem bestehenden Stepper. Toggle per Button oben im Konfigurator.

### Layout (Desktop)

```
+-----------------------------------------------+---------------------------+
| PRODUKTBILD (60%)                             | KONFIGURATION (40%)       |
|                                               | Modellname + Basispreis   |
|    [Grosses Bild des gewaehlten Modells       |                           |
|     in der gewaehlten Farbe]                  | --- FARBE ---             |
|                                               | [Farbkarten Grid 2x3]    |
|                                               |                           |
|                                               | --- SITZ ---              |
|                                               | [Optionskarten]           |
|                                               |                           |
|                                               | --- AKKU ---              |
|                                               | [Optionskarten]           |
|                                               |                           |
|    [Thumbnail-Galerie]                        | --- ZUBEHOER ---          |
|    [img1] [img2] [img3] [img4] [+N]          | [Checkbox-Karten]         |
+-----------------------------------------------+---------------------------+
| [Stepper/Studio Toggle]  Gesamtpreis: 5.690 EUR brutto  [Angebot erstellen] |
+-----------------------------------------------------------------------------+
```

### Layout (Mobile/Tablet)

- Einspaltiges Layout: Bild oben, Konfiguration darunter
- Sticky Footer-Bar mit Preis + Button bleibt

### Ansicht-Toggle

- Kleine Tab-Buttons oben: "Schritte" (Stepper) | "Studio" (Polestar)
- Standard: Stepper
- Auswahl in localStorage gespeichert
- URL-Parameter `?view=studio` moeglich

### Farbsystem

| Element | Farbe |
|---------|-------|
| Selektions-Umrandung | `#ffcf00` (Akzent-Gelb) |
| Checkmark bei Auswahl | `#ffcf00` |
| Sticky Footer-Bar Hintergrund | `#2b373d` (Primaer) |
| Footer-Bar Text/Preis | `#FFFFFF` |
| "Bestellen" Button | `#ffcf00` Hintergrund, `#2b373d` Text |
| Optionskarten Standard | Weiss, dunkler Rand |
| Optionskarten Hover | Leichter Schatten |

### Optionsgruppen-Darstellung

**SINGLE + Farbe:**
- 2-Spalten Grid
- Farbkreis (24px, gefuellt mit CSS-Farbe) + Name + Aufpreis
- Selektiert: Gelbe Umrandung + Checkmark

**SINGLE + andere (Sitz, Akku, Beleuchtung):**
- Karten nebeneinander (1-2 Spalten)
- Name, Beschreibung (klein), "Inklusive" oder "+ EUR XX"
- Selektiert: Gelbe Umrandung

**MULTI (Zubehoer):**
- Checkbox-Karten
- Checkbox links, Name + Beschreibung, Preis rechts
- Mengenfeld (Spinner) bei selektierten Items

---

## Phase 5: Farbvarianten-Bilder

### Datenmodell

Neue Tabelle `colorVariantImages`:

```typescript
colorVariantImages: defineTable({
  baseModelId: v.id('baseModels'),
  optionId: v.id('options'),       // Die Farb-Option
  imageStorageId: v.id('_storage'),
  sortOrder: v.number(),
})
  .index('by_model_option', ['baseModelId', 'optionId'])
  .index('by_model', ['baseModelId'])
```

### Admin-Pflege

Im Options-Bearbeitungsformular (nur fuer Farb-Optionen in der Gruppe "Farbe"):
- Zusaetzliche Sektion "Modell-Bilder"
- Pro Basismodell: Ein Upload-Feld
- Zeigt Vorschau des hochgeladenen Bildes

### Konfigurator-Verhalten

1. User waehlt Farbe → Query: `colorVariantImages` fuer (baseModelId, optionId)
2. Wenn Bild vorhanden → Hauptbild wechselt zum Farb-Bild
3. Wenn kein Bild → Standard-Modellbild bleibt
4. Thumbnail-Galerie zeigt alle verfuegbaren Bilder fuer das Modell in der gewaehlten Farbe

---

## Umsetzungsreihenfolge

1. **Phase 1** — Bug-Fixes (3 Bugs, ca. 1-2h)
2. **Phase 2** — PDF-Template (groesster Aufwand, ~4-6h)
3. **Phase 3** — Kleinere Features (je ~1-2h, parallelisierbar)
4. **Phase 4** — Polestar-Layout (~4-6h)
5. **Phase 5** — Farbvarianten-Bilder (~2-3h, abhaengig von Phase 4)

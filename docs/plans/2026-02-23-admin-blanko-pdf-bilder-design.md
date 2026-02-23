# Design: Admin-Bereich, Blanko-PDF, Bilder-Integration & Corporate PDF

**Datum:** 2026-02-23
**Status:** Freigegeben

## Zusammenfassung

Vier zusammenhängende Features für den Mini Crosser Konfigurator:

1. **Blanko-PDF im Dashboard** — Kategorie-basierte Buttons erzeugen druckbare Bestellformulare im Invacare-Stil
2. **Corporate PDF Design** — Beide PDF-Typen (Blanko + Angebot/Bestellung) im Mini Crosser Corporate Design (Anthrazit/Gelb)
3. **Admin-Bereich** — Vollständiges Katalog-Management (Kategorien, Modelle, Optionsgruppen, Optionen) mit Auth
4. **Bilder im Konfigurator** — Fahrzeugbilder (Pflicht) bei Modellauswahl, optionale Bilder bei Zubehör

## Architektur-Entscheidung

**Monolithisch erweitern** — Admin als `/admin/*` Routen in der bestehenden Next.js App. Gemeinsame Dexie-DB, gemeinsame Typen und Komponenten. Kein separater Service.

---

## 1. Datenmodell (IndexedDB/Dexie)

Der Katalog wird von statischer `catalog.json` → IndexedDB migriert. Die bestehende Dexie-Instanz bekommt neue Tabellen.

### Neue Tabellen

#### `categories` — Fahrzeugkategorien
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | string | PK, z.B. "trike", "quad" |
| name | string | Anzeigename, z.B. "3-Rad Scooter" |
| sortOrder | number | Reihenfolge |
| isActive | boolean | Aktiv/Inaktiv |
| imageBlob | Blob? | Kategoriebild (optional) |

#### `baseModels` — Basisfahrzeuge
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | string | PK, z.B. "trike-m1" |
| categoryId | string | FK → categories |
| skuCode | string | SKU-Code |
| articleNo | string | Artikelnummer |
| name | string | Modellname |
| description | string? | Beschreibung |
| priceNet | number | Netto-Preis |
| priceGross | number | Brutto-Preis |
| imageBlob | Blob? | Produktbild (Pflicht für Anzeige) |
| sortOrder | number | Reihenfolge |
| isActive | boolean | Aktiv/Inaktiv |

#### `optionGroups` — Gruppen von Optionen
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | string | PK, z.B. "batteries" |
| name | string | Gruppenname |
| selectionType | "SINGLE" \| "MULTI" | Auswahlmodus |
| appliesTo | string[] | Kategorie-IDs (leer = alle) |
| sortOrder | number | Reihenfolge |
| isActive | boolean | Aktiv/Inaktiv |

#### `options` — Einzelne Optionen/Zubehör
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | string | PK |
| optionGroupId | string | FK → optionGroups |
| skuCode | string | SKU-Code |
| articleNo | string | Artikelnummer |
| name | string | Optionsname |
| description | string? | Beschreibung |
| priceNet | number | Netto-Preis |
| priceGross | number | Brutto-Preis |
| imageBlob | Blob? | Bild (optional) |
| sortOrder | number | Reihenfolge |
| isActive | boolean | Aktiv/Inaktiv |
| isDefault | boolean | Standard-Option (◆ im Blanko-PDF) |

#### `users` — Admin-Benutzer
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | string | PK |
| username | string | Login-Name (unique) |
| passwordHash | string | bcrypt-Hash |
| role | "admin" | Rolle |
| createdAt | Date | Erstellungsdatum |

#### `settings` — App-Einstellungen
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| key | string | PK, z.B. "vatRate", "companyName" |
| value | string \| number \| boolean | Einstellungswert |

### Migration

Beim ersten App-Start wird `catalog.json` automatisch in IndexedDB importiert. Danach ist die JSON-Datei nicht mehr relevant. Alle Lese-Zugriffe (Konfigurator, PDF-Generator) werden auf IndexedDB umgestellt.

---

## 2. Admin-Bereich

### Routing

```
/admin                    → Dashboard (Übersicht: Anzahl Kategorien, Modelle, Optionen)
/admin/login              → Login-Seite
/admin/categories         → Kategorien verwalten (CRUD + Bild-Upload)
/admin/categories/[id]    → Kategorie bearbeiten + zugehörige Modelle anzeigen
/admin/models             → Alle Basismodelle verwalten (CRUD + Bild-Upload)
/admin/models/[id]        → Modell bearbeiten
/admin/option-groups      → Optionsgruppen verwalten (CRUD)
/admin/option-groups/[id] → Gruppe bearbeiten + Optionen in der Gruppe
/admin/options            → Alle Optionen verwalten (CRUD + optionaler Bild-Upload)
/admin/settings           → App-Einstellungen (MwSt., Firmendaten, Farben, Logo)
```

### Authentication (NextAuth.js Credentials)

- NextAuth.js mit Credentials Provider
- Passwörter mit bcryptjs gehasht
- JWT-Session (kein DB-Session-Store)
- Middleware schützt alle `/admin/*` Routen (außer `/admin/login`)
- Seed-User beim ersten Start: `admin` / `admin` mit erzwungener Passwortänderung

### UI-Pattern

- **Layout:** Sidebar-Navigation (links) + Content-Bereich (rechts)
- **Sidebar-Items:** Kategorien, Modelle, Optionsgruppen, Optionen, Einstellungen
- **Listen:** shadcn DataTable mit Sortierung, Suche, Aktiv/Inaktiv-Filter
- **Formulare:** shadcn Sheet (Seitenleiste von rechts) für Erstellen/Bearbeiten
- **Bild-Upload:** Drag & Drop Zone mit Vorschau, gespeichert als Blob in IndexedDB
- **Sortierung:** Drag & Drop für sortOrder
- **Inline-Aktionen:** Bearbeiten, Löschen, Aktivieren/Deaktivieren

### Einstellungen (/admin/settings)

Konfigurierbare Werte:
- MwSt.-Satz (Standard: 19%)
- Firmenname, Adresse, Kontaktdaten
- PDF-Farben (Anthrazit-Hex, Gelb-Hex)
- Logo-Upload (für PDF-Header)
- Bankverbindungen (für PDF-Footer)

---

## 3. Blanko-PDF (Dashboard)

### Dashboard-Integration

Pro aktive Kategorie ein Button auf dem Dashboard:
```
[📄 Blanko: 3-Rad]  [📄 Blanko: 4-Rad]  [📄 Blanko: HD]  [📄 Blanko: Cabin]
```

Klick → PDF wird sofort generiert und heruntergeladen.

### Blanko-PDF Layout (Invacare-Stil mit Corporate Design)

```
┌──────────────────────────────────────────────────────┐
│██ ┌──────────────────────────────────────────────────┐│
│██ │  DAS ORIGINAL                  Mini Crosser      ││
│██ │  WWW.MINICROSSER.INFO          Elektromobile     ││
│██ │  STARK SICHER STABIL     Sale·Service·Solution   ││
│██ └──────────────────────────────────────────────────┘│
│██                                                     │
│██  BESTELLFORMULAR / ANGEBOT                          │
│██                                                     │
│██  Kunden-Nr.: ______________                         │
│██  Ansprechpartner: ______________                    │
│██  Firma: ______________                              │
│██  Straße: ______________  PLZ/Ort: ______________    │
│██                                                     │
│██ ┌──────┬──────────┬──────────────┬───────┬────────┐│
│██ │  ☐   │ Art.-Nr. │ Beschreibung │ Netto │ Brutto ││
│██ ├──────┼──────────┼──────────────┼───────┼────────┤│
│██ │      │          │ BASISMODELLE │       │        ││
│██ │  ☐   │ MC-001   │ M1 3W        │ 4.495 │ 5.349  ││
│██ │  ☐   │ MC-002   │ M2 4W        │ 5.295 │ 6.301  ││
│██ ├──────┼──────────┼──────────────┼───────┼────────┤│
│██ │      │          │ BATTERIEN    │       │        ││
│██ │  ☐   │ BAT-50   │ 50Ah ◆      │  549  │  653   ││
│██ │  ☐   │ BAT-75   │ 75Ah         │  749  │  891   ││
│██ ├──────┼──────────┼──────────────┼───────┼────────┤│
│██ │      │          │ ZUBEHÖR      │ Menge │        ││
│██ │  ☐   │ ACC-01   │ Korb vorn    │ ___   │   89   ││
│██ │  ☐   │ ACC-02   │ Verdeck      │ ___   │  449   ││
│██ └──────┴──────────┴──────────────┴───────┴────────┘│
│██                                                     │
│██  Zwischensumme (Netto):  ______________             │
│██  MwSt. 19%:              ______________             │
│██  Gesamtsumme (Brutto):   ______________             │
│██                                                     │
│██  Anmerkungen: ________________________________      │
│██  Datum: __________  Unterschrift: ____________      │
│██                                                     │
│   ┌──────────────────────────────────────────────────┐│
│   │ Wiggers GmbH & Co. KG │ Bankverbindungen │ ...   ││
│   └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

**Legende:**
- `██` = Gelber Akzentstreifen (links)
- `◆` = Standard-Option (isDefault)
- Menge-Feld nur bei MULTI-Gruppen
- Nur aktive Optionen die zur gewählten Kategorie passen
- Automatischer Seitenumbruch bei vielen Optionen

### Farbschema (Corporate Design)

| Element | Farbe | Hex (Standard) |
|---------|-------|----------------|
| Header-Hintergrund | Anthrazit | ~#3A4250 |
| Akzentstreifen links | Gelb/Gold | ~#D4A843 |
| Text auf Header | Weiß | #FFFFFF |
| Tabellenüberschriften | Anthrazit | ~#3A4250 |
| Tabellenzeilen | Abwechselnd Weiß/Hellgrau | #FFFFFF / #F5F5F5 |
| Footer-Hintergrund | Hellgrau | #F0F0F0 |

Farben sind über Admin-Einstellungen konfigurierbar.

---

## 4. Ausgefülltes Angebot/Bestellung (Corporate Design)

Das bestehende PDF-Layout wird auf Corporate Design umgestellt:

- **Header:** Anthrazit-Balken mit Mini Crosser Logo, gelber Akzentstreifen
- **Dokumenttyp-Label:** "ANGEBOT" oder "BESTELLUNG" prominent im Header
- **Inhalt:** Bestehende Tabelle (Positionen, Preise, Summen) bleibt gleich
- **Footer:** Firmendaten, Bankverbindungen
- **Datenquelle:** IndexedDB statt catalog.json

---

## 5. Konfigurator-Änderungen (Bilder)

### Modellauswahl (Schritt 2)

Karten mit großem Fahrzeugbild:
```
┌─────────────────────┐
│  ┌─────────────────┐ │
│  │  [Fahrzeugbild] │ │  ← aus imageBlob (IndexedDB)
│  │   16:9 ratio    │ │
│  └─────────────────┘ │
│  Mini Crosser M1     │
│  3-Rad Scooter       │
│  ab €4.495 netto     │
│          [Wählen]    │
└─────────────────────┘
```

- Bilder aus `baseModels.imageBlob`
- Kein Bild → Platzhalter-Icon (Fahrzeug-Silhouette)
- `object-fit: cover`, 16:9 Seitenverhältnis
- Responsive Grid (1-4 Spalten je nach Viewport)

### Zubehörauswahl (Schritt 3)

Bilder sind optional — wenn vorhanden, kleines Thumbnail links:
```
┌──────────────────────────────────┐
│  [🖼] ☑ Korb vorn         €89   │  ← mit Bild (48x48px)
│       ☑ Verdeck           €449  │  ← ohne Bild
│  [🖼] ☐ Spiegel-Set       €59   │  ← mit Bild
└──────────────────────────────────┘
```

- Bilder aus `options.imageBlob`
- 48x48px Thumbnail, `object-fit: cover`, gerundet
- Kein Bild → kein Platzhalter, nur Text

---

## 6. Neue Dependencies

| Package | Zweck |
|---------|-------|
| `next-auth` | Authentication für Admin |
| `bcryptjs` | Passwort-Hashing (pure JS) |

Alle anderen benötigten Packages sind bereits vorhanden (pdf-lib, Dexie, shadcn/Radix, etc.).

---

## 7. Was sich NICHT ändert

- E-Mail-Versand und Outbox-Queue
- PWA/Offline-Funktionalität
- Dokument-Verwaltung und -Status (DRAFT/FINAL/SENT)
- Grundstruktur des Konfigurator-Flows (4 Schritte)

---

## 8. Umsetzungs-Reihenfolge (grob)

1. Datenmodell + Migration (catalog.json → IndexedDB)
2. Konfigurator auf IndexedDB umstellen
3. Auth-System (NextAuth.js)
4. Admin-Bereich (Kategorien → Modelle → Optionsgruppen → Optionen → Settings)
5. Bild-Upload + Bild-Integration im Konfigurator
6. PDF Corporate Design (Header, Footer, Farben)
7. Blanko-PDF Generator (Invacare-Stil)
8. Dashboard-Buttons für Blanko-PDF

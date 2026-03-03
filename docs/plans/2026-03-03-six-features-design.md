# 6 Features Design — Mini Crosser Konfigurator

**Datum:** 2026-03-03
**Status:** Approved

## Kontext

Der Mini Crosser Konfigurator (Next.js 16 PWA + Convex Backend) erhält 6 neue Features:

1. Preis auf Anfrage
2. Admin-Optionsfilter mit Volltextsuche
3. Neuer Konfigurator-Flow (Kategorie → Auto-Comfort → Upgrades)
4. SKU-Logik bei Modellwechsel
5. Dokument-Pipeline mit automatischen Erinnerungen
6. Email-Tracking via Resend Webhooks

---

## Feature 1: Preis auf Anfrage

### Schema-Änderung
- `baseModels`: Neues Feld `priceOnRequest: boolean` (default `false`)
- `options`: Neues Feld `priceOnRequest: boolean` (default `false`)
- Gleiche Felder in Dexie-Cache-Types

### Admin-UI
- Checkbox "Preis auf Anfrage" in Model-Form und Option-Form
- Wenn aktiviert: Preis-Felder (`priceNet`, `priceGross`) werden ausgegraut/disabled, Wert bleibt 0

### Konfigurator
- Modell-/Options-Karten zeigen "Preis auf Anfrage" statt Preisangabe
- `selectedOptions` im Store speichert `priceOnRequest: true` wenn gesetzt

### Pricing-Logik (`calculatePricingFromItems`)
- Items mit `priceOnRequest` bekommen `totalNet: 0` und Flag `isOnRequest: true`
- Ergebnis enthält `hasOnRequestItems: boolean`
- Wenn `hasOnRequestItems`: Gesamtpreis zeigt "zzgl. Positionen auf Anfrage"

### PDF
- Zeile zeigt "a.A." statt Preis
- Fußzeile bei Summe: "* zzgl. Positionen auf Anfrage" wenn mindestens ein Item a.A. ist

### Dokument
- `pricing.lineItems[].priceOnRequest: boolean` für betroffene Items
- `pricing.hasOnRequestItems: boolean` auf Dokument-Ebene

---

## Feature 2: Admin-Optionsfilter

### Tabellenansicht
- Umstellung von Karten-Layout auf `<table>` für die Options-Liste
- Spalten: Name | SKU | Artikelnr. | Preis (netto) | Gruppe | Kategorie | Aktiv | Aktionen
- Alle Spalten sortierbar (Klick auf Header togglet ASC/DESC)

### Suchfeld
- Ein Textfeld oben, sucht über: Name, SKU-Code, Artikelnummer
- Client-seitiger Filter (alle Optionen bereits per `useQuery` geladen)
- Debounced Input (300ms)

### Zusätzliche Filter
- Dropdown "Optionsgruppe" — filtert nach Gruppenzugehörigkeit
- Dropdown "Kategorie" — filtert nach `appliesTo`

### Implementierung
- Neue Komponente `OptionsTable` ersetzt bestehende Karten-Ansicht
- `useMemo` für Filtern + Sortieren
- Edit/Delete-Buttons in "Aktionen"-Spalte

---

## Feature 3: Neuer Konfigurator-Flow

### Ansatz: Upgrade als Modellwechsel (Ansatz A)
Bestehende Datenstruktur bleibt. Neues `isDefault`-Flag markiert das Comfort-Modell.

### Neuer Flow (4 Schritte)
```
Schritt 0: Dokumenttyp (Angebot/Bestellung) — wie bisher
Schritt 1: Modellart wählen (= Kategorie)
           → 3-Rad, 4-Rad, HD, Kabine als große Karten
           → Auto-Selektion des Default-Modells (Comfort)
Schritt 2: Upgrades & Optionen wählen
           → Erste Gruppe: "Modell-Upgrade" (SINGLE) — zeigt andere Modelle der Kategorie
           → Dann: reguläre Optionsgruppen (Farbe, Zubehör, etc.)
Schritt 3: Kunde & Abschluss — wie bisher
```

### Schema-Änderung
- `baseModels.isDefault: boolean` — markiert das Comfort-Modell pro Kategorie
- `baseModels.upgradeLabel?: string` — z.B. "Premium-Upgrade" (für Anzeige)

### Store-Änderung
- `setCategory(categoryId)` → lädt Modelle, setzt automatisch `isDefault: true` Modell
- Step 2 zeigt Modell-Upgrades als pseudo-Optionsgruppe VOR echten Optionen

### Upgrade-Darstellung
- Karte pro Modell der Kategorie, visuell wie SINGLE-Optionsgruppe
- Aktuelles Modell hat Check-Markierung
- Klick auf anderes Modell → `setBaseModel(newModelId)`
- Preisanzeige: Absoluter Preis (nicht Differenz)

---

## Feature 4: SKU-Logik bei Modellwechsel

### Ansatz: Komplett-Ersetzung
Kein neues SKU-System nötig. Jedes Basismodell hat eigene SKU und Artikelnummer.

### Mechanismus
- User wechselt von Comfort auf Premium → `selectedBaseModelId` ändert sich
- CartSidebar liest `baseModel.skuCode` und `baseModel.articleNo` direkt
- Dokument speichert den endgültig gewählten `selectedBaseModelId` mit dessen SKU

### CartSidebar-Anzeige
- Zeigt: "[Gewähltes Modell] — SKU: MC-P3R — Artikelnr: 12345"
- Optionen darunter wie bisher

---

## Feature 5: Dokument-Pipeline

### Status-Stufen
```
DRAFT → FINAL → SENT → FOLLOW_UP → ACCEPTED / DECLINED / EXPIRED / ARCHIVED
```

| Status | Bedeutung | Übergang |
|--------|-----------|----------|
| DRAFT | Entwurf, editierbar | → FINAL (manuell) |
| FINAL | Fertiggestellt | → SENT (bei Email-Versand) |
| SENT | Email verschickt | → FOLLOW_UP (auto nach X Tagen) |
| FOLLOW_UP | Erinnerung fällig | → ACCEPTED/DECLINED (manuell) |
| ACCEPTED | Kunde hat angenommen | Endstatus |
| DECLINED | Kunde hat abgelehnt | → ARCHIVED (manuell) |
| EXPIRED | Auto nach Y Tagen ohne Reaktion | → ARCHIVED (manuell) |
| ARCHIVED | Archiviert | Endstatus |

### Konfigurierbare Settings
- `pipelineFollowUpDays`: Tage nach SENT bis FOLLOW_UP (Default: 7)
- `pipelineExpiryDays`: Tage nach SENT bis EXPIRED (Default: 30)
- `pipelineReminderEnabled`: Toggle für automatische Reminder-Emails

### Automatische Erinnerungen (Convex Cron)
- Cron-Job läuft täglich (09:00)
- Prüft SENT-Dokumente: `sentAt + followUpDays < jetzt` → Status FOLLOW_UP + Reminder-Email
- Prüft FOLLOW_UP-Dokumente: `sentAt + expiryDays < jetzt` → Status EXPIRED
- Reminder-Text: "Sehr geehrte/r [Name], wir möchten Sie an unser Angebot [Nr.] erinnern..."

### Neue Document-Felder
- `sentAt?: number` (Timestamp)
- `followUpAt?: number`
- `archivedAt?: number`
- `pipelineNote?: string`

### UI-Änderungen
- DocumentList: Filter-Tabs "Alle | Offen | Archiviert"
- DocumentDetail: Status-Badge mit Farbe + Status-Wechsel-Buttons
- Löschen: "Endgültig löschen" (nur DRAFT und ARCHIVED), mit Bestätigungsdialog

---

## Feature 6: Email-Tracking via Resend Webhooks

### Webhook Setup
- Convex HTTP-Action: `POST /api/webhooks/resend`
- Webhook-Signatur-Validierung mit `svix` Library
- Resend sendet: `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`

### Neue Tabelle `emailEvents`
```typescript
{
  outboxId: Id<"outbox">
  documentId: Id<"documents">
  resendMessageId: string
  eventType: "delivered" | "opened" | "clicked" | "bounced"
  timestamp: number
  metadata?: string
}
```

### Resend Message-ID Tracking
- Outbox-Processor speichert `resendMessageId` nach Versand
- Webhook-Events enthalten gleiche ID → Matching

### UI: Email-Aktivität Timeline
- Neue Sektion auf Dokument-Detail
- Timeline: Gesendet → Zugestellt → Geöffnet → Link geklickt
- Badge in DocumentList: "Geöffnet" / "Zugestellt" / "Nicht zugestellt"

### Pipeline-Integration
- `email.bounced` → Warnung anzeigen
- `email.opened` → rein informativ (kein Auto-Statuswechsel)

---

## Dateiübersicht

### Convex — Ändern
| Datei | Änderung |
|-------|----------|
| `convex/schema.ts` | priceOnRequest, isDefault, upgradeLabel, neue Status-Werte, Pipeline-Felder, emailEvents-Tabelle, resendMessageId |
| `convex/baseModels.ts` | isDefault, upgradeLabel in CRUD |
| `convex/options.ts` | priceOnRequest in CRUD |
| `convex/documents.ts` | Neue Status-Transitions, Pipeline-Felder, Archiv/Löschen |
| `convex/outbox.ts` / `convex/sendEmail.ts` | resendMessageId speichern |

### Convex — Neu
| Datei | Zweck |
|-------|-------|
| `convex/crons.ts` | Cron-Job für Pipeline (Follow-Up, Expiry) |
| `convex/emailEvents.ts` | CRUD für Email-Tracking-Events |
| `convex/http.ts` | HTTP-Router für Resend Webhook |

### Frontend — Ändern
| Datei | Änderung |
|-------|----------|
| `src/modules/configurator/store.ts` | Auto-Default-Modell bei Kategorie-Wahl |
| `src/modules/pricing/calc.ts` | priceOnRequest Items behandeln |
| `src/components/configurator/model-picker.tsx` | Auto-Default-Selektion |
| `src/components/configurator/accessory-picker.tsx` | Upgrade-Gruppe vor Optionen |
| `src/components/configurator/cart-sidebar.tsx` | "a.A." Anzeige |
| `src/components/admin/model-form.tsx` | isDefault-Checkbox, upgradeLabel |
| `src/components/admin/option-form.tsx` | priceOnRequest-Checkbox |
| `src/app/documents/[id]/page.tsx` | Pipeline-Buttons, Email-Timeline |
| `src/components/documents/document-list.tsx` | Filter-Tabs, neue Status-Badges |
| `src/modules/pdf/generator.ts` | "a.A." statt Preis |

### Frontend — Neu
| Datei | Zweck |
|-------|-------|
| `src/components/configurator/upgrade-picker.tsx` | Modell-Upgrade-Karten |
| `src/components/admin/options-table.tsx` | Tabellenansicht mit Suche/Sortierung |
| `src/components/documents/email-timeline.tsx` | Email-Event-Timeline |
| `src/components/documents/pipeline-actions.tsx` | Status-Wechsel-Buttons |

### Dependencies
- `svix` — Webhook-Signatur-Validierung (Convex-seitig)

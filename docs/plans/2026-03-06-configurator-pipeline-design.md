# Konfigurator UX-Verbesserungen + Pipeline/Kanban — Design

**Datum:** 2026-03-06
**Status:** Genehmigt

---

## Zusammenfassung

7 Verbesserungen am Konfigurator und Dokumenten-Management:

1. Upgrade-Auswahl: Kein Auto-Advance mehr beim Schritt-Wechsel
2. Produktbilder: Volle Hoehe statt zugeschnitten
3. Kategorie-Schritt: Kategorie als erster Pill in der Studio-Navigation
4. Kategorie-Bilder: Groessere Thumbnails in der Auswahl
5. Lightbox: Optionsbilder per Klick vergroessern
6. Pipeline/Kanban: Outbox + Dokumentliste vereint in Kanban-Board
7. Mitarbeiter-Uebersicht: Filter nach Ersteller im Kanban

---

## Sektion 1: Konfigurator-Fixes (Punkte 1–5)

### 1. Upgrade Auto-Advance entfernen

**Problem:** `setBaseModel` in `src/modules/configurator/store.ts` setzt `currentStep: 2`, was ungewollt zum naechsten Schritt springt.

**Loesung:** `currentStep: 2` aus der `setBaseModel` Action entfernen. Der Nutzer navigiert manuell weiter.

**Datei:** `src/modules/configurator/store.ts` — Zeile mit `currentStep: 2` in `setBaseModel` entfernen.

### 2. Produktbilder volle Hoehe

**Problem:** `ProductImagePanel` in `studio-layout.tsx` nutzt `aspect-[4/3]` + `object-cover`, was Bilder zuschneidet.

**Loesung:**
- `aspect-[4/3]` entfernen
- `object-cover` durch `object-contain` ersetzen
- Container: `max-h-[60vh]` fuer sinnvolle Begrenzung

**Datei:** `src/components/configurator/studio-layout.tsx` — `ProductImagePanel` Komponente.

### 3. Kategorie als erster Schritt in Studio-Navigation

**Problem:** Studio-View zeigt nur 2 Pills (Fahrzeugkonfiguration, Zuruuestung). Kategorie fehlt.

**Loesung:**
- Neuen Pill "Kategorie" als Schritt 0 hinzufuegen
- Klick darauf zeigt `CategoryPicker` im linken Panel
- Bestehende Schritte ruecken auf Index 1 und 2

**Dateien:**
- `src/components/configurator/studio-layout.tsx` — Step-Navigation erweitern
- `src/app/new/page.tsx` — Studio ab `currentStep >= 0` anzeigen (statt `>= 1`)

### 4. Groessere Kategorie-Bilder

**Problem:** Kategorie-Bilder sind `h-10 w-10` (40px) — zu klein.

**Loesung:** Auf `h-16 w-16` (64px) vergroessern.

**Datei:** `src/components/configurator/category-picker.tsx` — Image-Klassen aendern.

### 5. Lightbox fuer Optionsbilder

**Problem:** Vorschaubilder bei Optionen koennen nicht vergroessert werden.

**Loesung:** Bestehende `ImageLightbox`-Komponente (`src/components/ui/image-lightbox.tsx`) um die Thumbnails in `accessory-picker.tsx` wrappen. Klick auf Thumbnail oeffnet Lightbox.

**Dateien:**
- `src/components/configurator/accessory-picker.tsx` — `OptionThumbnail` mit `ImageLightbox` wrappen
- Click-Handler: `e.stopPropagation()` damit Karten-Klick nicht ausgeloest wird

---

## Sektion 2: Pipeline/Kanban-Ansicht (Punkte 6 + 7)

### Konzept

Die aktuelle Dokumentliste (Tabs: Offen/Alle/Archiviert) und die separate Outbox-Seite (`/outbox`) werden durch eine Pipeline/Kanban-Ansicht ersetzt. Dokumentstatus und E-Mail-Status in einer Ansicht.

### Kanban-Spalten

| Spalte | Status | Beschreibung |
|--------|--------|-------------|
| Entwurf | DRAFT, FINAL | Noch nicht versendete Dokumente |
| Versendet | SENT | E-Mail wurde gesendet |
| Nachfassen | FOLLOW_UP | Automatisch nach X Tagen oder manuell |
| Erledigt | ACCEPTED, DECLINED, EXPIRED | Abgeschlossene Vorgaenge (eingeklappt) |

### Kanban-Karten

Jede Karte zeigt:
- Dokumentnr. + Typ-Badge (Angebot/Bestellung)
- Kunde (Firma oder Name)
- Betrag (Brutto)
- Datum (erstellt / versendet)
- E-Mail-Status-Icon (Gesendet, Zugestellt, Geoeffnet, Fehlgeschlagen — aus Outbox + EmailEvents)
- Mitarbeiter-Name (klein, unten)

### Outbox-Integration

Die separate `/outbox`-Seite entfaellt. E-Mail-Status direkt auf Kanban-Karten als Icon. Bei Klick auf Karte -> Dokumentdetailseite (dort Email-Timeline).

Fehlgeschlagene E-Mails: Rotes Badge auf Karte + globaler Banner oben ("X E-Mails fehlgeschlagen — Erneut senden") wenn FAILED-Eintraege existieren.

### Mitarbeiter-Filter

- Admin sieht: Alle Dokumente + Dropdown-Filter nach Mitarbeiter
- Mitarbeiter sieht: Nur eigene Dokumente (nach `createdBy`)
- Toggle "Meine / Alle" (nur fuer Admin sichtbar)

### Kein Drag & Drop

Status-Aenderungen ueber Buttons auf der Dokumentdetailseite (PipelineActions). Kein Drag & Drop — schlank und touch-freundlich.

---

## Technische Aenderungen

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/components/documents/pipeline-board.tsx` | Kanban-Board mit 4 Spalten |
| `src/components/documents/pipeline-card.tsx` | Einzelne Karte mit Doc + Email-Status |
| `src/components/documents/pipeline-failed-banner.tsx` | Banner fuer fehlgeschlagene E-Mails |

### Modifizierte Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/modules/configurator/store.ts` | `currentStep: 2` aus `setBaseModel` entfernen |
| `src/components/configurator/studio-layout.tsx` | `object-contain`, Kategorie-Pill, keine feste Aspect Ratio |
| `src/components/configurator/category-picker.tsx` | Bilder `h-16 w-16` |
| `src/components/configurator/accessory-picker.tsx` | Lightbox um Thumbnails |
| `src/app/new/page.tsx` | Studio ab Step 0 |
| `src/app/page.tsx` | `DocumentList` durch `PipelineBoard` ersetzen |
| `convex/documents.ts` | Neue Query `listGroupedByStatus` |
| `src/components/admin/admin-sidebar.tsx` | `/outbox` Link entfernen |

### Entfernte Dateien

| Datei | Grund |
|-------|-------|
| `src/app/outbox/page.tsx` | Ersetzt durch Pipeline-Board |
| `src/components/outbox/outbox-table.tsx` | Ersetzt durch Pipeline-Karten |

---

## Convex Query: listGroupedByStatus

Neue Query die alle Dokumente mit ihrem letzten E-Mail-Status zurueckgibt:
- Joined mit Outbox (letzter Status pro Dokument)
- Joined mit EmailEvents (letztes Event pro Dokument)
- Optionaler Filter nach `createdBy`
- Gruppierung nach Pipeline-Spalte im Frontend

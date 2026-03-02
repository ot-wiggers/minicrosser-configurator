# Offline-PWA Katalogdaten & Dokumente — Design-Dokument

**Datum:** 2026-03-02
**Status:** Genehmigt
**Ansatz:** Dexie-Fallback Hook (`useOfflineQuery`)

---

## 1. Übersicht

Die App soll als installierte PWA (z.B. auf iPad) vollständig offline funktionieren — ausser dem Admin-Bereich. Aktuell cached `CacheSync` Katalogdaten nach IndexedDB, aber die Konfigurator-Komponenten nutzen nur `useQuery` (Convex), das offline `undefined` liefert.

### Entscheidungen

| Frage | Antwort |
|-------|---------|
| Offline-Scope | Alles ausser Admin |
| Bilder-Caching | Aktiv als Blobs in IndexedDB |
| Offline-Dokumente | Lokal erstellen + bei Reconnect synchronisieren |
| Architektur | Dexie-Fallback Hook (Ansatz 1) |

### Bestehende Infrastruktur (bereits vorhanden)

- `CacheSync` Komponente: schreibt Katalogdaten nach Dexie/IndexedDB
- Dexie-DB (`mc-configurator`): Tabellen für categories, baseModels, optionGroups, options, settings, documents, outbox
- `db-types.ts`: TypeScript-Typen mit `imageBlob?: Blob` bereits vorgesehen
- `useOnlineStatus` Hook: erkennt online/offline via `navigator.onLine`
- `OutboxProcessor`: verarbeitet E-Mail-Queue bei Reconnect
- Service Worker: cached statische Assets (JS, CSS, Fonts, Bilder)

---

## 2. Dexie-Fallback Hook (`useOfflineQuery`)

### Konzept

Ein Custom Hook der `useQuery` von Convex wrapped. Online liefert er Convex-Daten, offline fällt er automatisch auf Dexie/IndexedDB zurück.

```
Online:   useQuery(api.categories.listActive)  →  Convex-Daten  →  CacheSync schreibt nach Dexie
Offline:  useQuery returns undefined            →  Hook erkennt offline  →  Dexie-Daten zurückgeben
```

### Signatur

```typescript
const categories = useOfflineQuery(
  api.categories.listActive,       // Convex Query Referenz
  {},                                // Query Args
  () => db.categories               // Dexie Fallback-Funktion
    .where('isActive').equals(1)
    .sortBy('sortOrder')
)
```

### Logik

1. `useQuery` liefert Daten → diese verwenden (online, Echtzeit-Updates)
2. `useQuery` liefert `undefined` UND `navigator.onLine === false` → Dexie-Fallback ausführen
3. `useQuery` liefert `undefined` UND online → Ladestate (Convex noch am Laden)

Bestehende Convex-Subscriptions für Echtzeit-Updates bleiben erhalten.

---

## 3. CacheSync-Erweiterung — Bilder-Blob-Caching

### Problem

CacheSync speichert nur `imageStorageId` (Convex-Referenz), nicht das Bild selbst. Convex Storage URLs sind temporäre signed URLs — offline nicht erreichbar.

### Lösung

CacheSync fetcht Bilder als Blobs und speichert sie in IndexedDB.

```
Convex liefert imageUrl (temporäre signed URL)
  → fetch(imageUrl) → Response.blob()
    → In Dexie als imageBlob speichern
      → Offline: URL.createObjectURL(blob) für <img src>
```

### Details

- Bilder werden **parallel im Hintergrund** gefetcht (nicht blockierend)
- Nur neue/geänderte Bilder werden geholt (Vergleich `imageStorageId` mit gespeichertem Wert)
- Fehlende Felder in CacheSync ergänzen: `description`, `specs` werden jetzt auch synchronisiert
- `db-types.ts` hat bereits `imageBlob?: Blob` Felder — Typen sind vorbereitet
- Dexie-Schema bleibt gleich — `imageBlob` ist ein unindexiertes Feld, kein Versionsupgrade nötig
- Geschätzter Speicherbedarf: ~5-20MB für typischen Katalog mit ~50 Bildern

---

## 4. Bilder offline bereitstellen (`useOfflineImage`)

### Hook

```typescript
const imgSrc = useOfflineImage(cat.imageUrl, cat._id, 'categories')
// Online: imageUrl direkt
// Offline: URL.createObjectURL(blob) aus Dexie
// Kein Bild: null → Fallback-Icon
```

### Logik

1. Online + `imageUrl` vorhanden → `imageUrl` zurückgeben (normal)
2. Offline → Dexie-Record laden → `URL.createObjectURL(blob)` → Blob-URL zurückgeben
3. Kein Bild → `null` → Komponente zeigt Fallback-Icon

### Memory Management

`URL.revokeObjectURL()` im `useEffect`-Cleanup um Memory Leaks zu vermeiden.

---

## 5. Offline-Dokument-Erstellung + Sync

### Konzept: Local-First mit Outbox-Pattern

```
Offline:  User erstellt Dokument → Dexie (lokale documents-Tabelle) + Outbox-Eintrag
Online:   OutboxProcessor erkennt pending Docs → Convex Mutation → Dexie-Record aktualisieren
```

### Ablauf

1. **Erstellen:** `createDocument()` Helper prüft `navigator.onLine`:
   - **Online:** Direkt Convex Mutation → speichert auch lokal in Dexie
   - **Offline:** Generiert temporäre ID (`local-xxx`), speichert in Dexie `documents` + erstellt `outbox`-Eintrag mit Typ `DOC_CREATE`
2. **Visuelles Feedback:** Dokumente mit `local-`-Prefix bekommen Badge "Nicht synchronisiert"
3. **Sync bei Reconnect:** `OutboxProcessor` wird erweitert — neben E-Mails verarbeitet er jetzt auch `DOC_CREATE` Einträge
4. **Nach Sync:** Lokale temporäre ID wird durch echte Convex-ID ersetzt, Badge verschwindet

### Outbox-Erweiterung

```typescript
// Bestehend: type = 'EMAIL'
// Neu:       type = 'DOC_CREATE'
interface OutboxRecord {
  id: number
  type: 'EMAIL' | 'DOC_CREATE'
  payload: string  // JSON-serialisierte Dokument-Daten
  status: 'PENDING' | 'SENT' | 'FAILED'
  createdAt: string
}
```

### Dokumentennummern offline

Nutzen die bestehende `sequences`-Tabelle in Dexie — Nummer wird lokal vergeben und ist bei Sync bereits korrekt.

---

## 6. Neue Dateien & Änderungen

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/hooks/use-offline-query.ts` | Custom Hook: Convex online → Dexie offline Fallback |
| `src/hooks/use-offline-image.ts` | Custom Hook: Blob-URL aus Dexie für offline Bilder |
| `src/lib/offline-document.ts` | Helper: Dokumente lokal erstellen + Outbox-Eintrag |

### Zu modifizierende Dateien

| Datei | Änderung |
|-------|---------|
| `src/components/layout/cache-sync.tsx` | Bilder-Blobs fetchen + fehlende Felder (`description`, `specs`) mitsyncen |
| `src/modules/catalog/db-types.ts` | `imageStorageId` Feld hinzufügen (für Change-Detection beim Blob-Caching) |
| `src/modules/storage/db.ts` | Dexie v3 — `outbox.type` Feld indexieren |
| `src/modules/storage/types.ts` | `OutboxRecord.type` erweitern (`EMAIL` \| `DOC_CREATE`) |
| `src/components/layout/outbox-processor.tsx` | `DOC_CREATE` Einträge verarbeiten |
| `src/components/configurator/category-picker.tsx` | `useQuery` → `useOfflineQuery` + `useOfflineImage` |
| `src/components/configurator/model-picker.tsx` | `useQuery` → `useOfflineQuery` + `useOfflineImage` |
| `src/components/configurator/accessory-picker.tsx` | `useQuery` → `useOfflineQuery` + `useOfflineImage` |
| `src/components/configurator/cart-sidebar.tsx` | `useMutation` → `offlineCreateDocument` Wrapper |
| `src/components/configurator/customer-form-dialog.tsx` | Offline-Erstellung nutzen |
| `src/app/page.tsx` | Dashboard: lokale Dokumente aus Dexie anzeigen wenn offline |

### Keine neuen NPM-Dependencies

Alles mit Dexie + bestehendem Convex SDK lösbar.

---

## 7. Nicht im Scope

- Admin-Bereich offline
- PDF-Generierung offline
- Kundensuche offline (nur lokale Kundendaten aus bereits erstellten Dokumenten)
- Konflikt-Resolution bei parallelen Änderungen (Last-Write-Wins reicht für Einzelgerät-Nutzung)
- E-Mail-Versand offline (bleibt in Outbox-Queue)

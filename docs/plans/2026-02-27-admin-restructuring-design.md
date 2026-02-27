# Admin-Dashboard Restructuring Design

## Context

The Mini Crosser Konfigurator has a Mitarbeiter-Dashboard at `/` and an Admin-Dashboard at `/admin`. Currently there are no cross-links between them. The admin settings page is a single long form, and "Benutzer" and "Import/Export" are separate sidebar entries/routes.

## Goals

1. Bidirectional links between Mitarbeiter-Dashboard and Admin-Dashboard
2. Restructure `/admin/settings` into 5 tabs:
   - PDF Designer (existing SettingsForm content)
   - API-Schnittstellen (Resend + Brevo API keys/sender config)
   - Benutzer (moved from separate route)
   - Import/Export (moved from separate route)
   - Sonstiges (Convex Dev/Prod sync)

## Approach

Client-side Tabs component (shadcn/ui) within the settings page. No nested routes needed — tab state is local, fast switches without route changes.

---

## 1. Bidirectional Dashboard Links

### Mitarbeiter-Dashboard (`src/app/page.tsx`)
- Add "Admin-Bereich" button with `Shield` icon in the header area, next to "Abmelden" button
- Only visible when `user.role === 'admin'`
- Links to `/admin`

### Admin Sidebar (`src/components/admin/admin-sidebar.tsx`)
- Add "Konfigurator" link with `ArrowLeft` icon at the top of sidebar, above "Dashboard"
- Links to `/` (Mitarbeiter-Dashboard)
- Visible for all admin users

---

## 2. Settings Tab Structure

### Page: `/admin/settings` (`src/app/admin/(authenticated)/settings/page.tsx`)
- Uses shadcn `Tabs` component with 5 tabs
- Each tab renders its own client component

### Tab 1: "PDF Designer" (default tab)
- Contains entire existing `SettingsForm` content: Firma, Steuern, PDF-Design, Bankverbindungen, Rechtliches, Logo, PDF-Preview
- No content changes, just wrapped in a tab

### Tab 2: "API-Schnittstellen"
- New component: `ApiSettingsTab`
- Section "Resend": API-Key input, sender email, sender name
- Section "Brevo": API-Key input, sender email, sender name
- Own save button (API keys stored as Settings in Convex)

### Tab 3: "Benutzer"
- Extract existing content from `/admin/users/page.tsx` into reusable component
- Remove standalone route `/admin/users`
- Remove "Benutzer" sidebar entry

### Tab 4: "Import / Export"
- Extract existing content from `/admin/import-export/page.tsx` into reusable component
- Remove standalone route `/admin/import-export`
- Remove "Import/Export" sidebar entry

### Tab 5: "Sonstiges"
- New component: `MiscSettingsTab`
- Section "Convex Dev/Prod Synchronisation": display current environment, buttons to copy data between Dev and Prod

---

## 3. Sidebar Changes

Remove from sidebar:
- "Benutzer" entry
- "Import/Export" entry

Keep:
- Dashboard, Kategorien, Modelle, Optionsgruppen, Optionen, Kunden, Einstellungen

Add:
- "Konfigurator" link at top (back to `/`)

---

## Files to create/modify

### New files
- `src/components/admin/api-settings-tab.tsx`
- `src/components/admin/misc-settings-tab.tsx`

### Modified files
- `src/app/page.tsx` — add admin link for admin users
- `src/app/admin/(authenticated)/settings/page.tsx` — tabs structure
- `src/components/admin/admin-sidebar.tsx` — remove entries, add Konfigurator link
- `src/components/admin/settings-form.tsx` — stays as-is, becomes Tab 1 content

### Files to remove (content moved to tabs)
- `src/app/admin/(authenticated)/users/page.tsx` — content extracted to component, route removed
- `src/app/admin/(authenticated)/import-export/page.tsx` — content extracted to component, route removed

### Existing components reused as tab content
- `SettingsForm` → Tab 1
- Users page content → Tab 3 (extract to `UsersTab` or inline)
- Import/Export page content → Tab 4 (extract to `ImportExportTab` or inline)

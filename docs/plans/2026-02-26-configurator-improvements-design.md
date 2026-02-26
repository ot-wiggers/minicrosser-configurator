# Configurator Improvements Design

**Date:** 2026-02-26

## 1. Option Filtering per Model

**Problem:** `appliesTo` on option groups only filters by category. All models in a category see the same options. Some options should only appear for specific models (e.g., "Kupfer/Orange" only for the Kabine model).

**Solution:** Add `restrictToModels` field (optional array of model IDs as strings) on each **option**. Empty = available for all models in the group's categories.

- **Schema:** Add `restrictToModels: v.optional(v.array(v.string()))` to `options` table
- **Query:** Update `listWithOptionsForCategory` to accept optional `baseModelId` and filter options
- **Admin:** Multi-select for models in option form
- **Configurator:** Pass selected model ID to query

## 2. Rich Text Model Descriptions

**Problem:** Description field is plain text only. Users want formatting (bold, italic, lists).

**Solution:** Tiptap WYSIWYG editor in admin, stored as HTML string (schema field type unchanged).

- **Packages:** `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`
- **Admin:** Replace `Textarea` with Tiptap editor component in model form
- **Configurator:** Render HTML with `dangerouslySetInnerHTML` + Tailwind `prose` classes
- **PDF:** Not affected (blank PDF doesn't show descriptions)

## 3. Technical Specifications per Model

**Problem:** No way to display structured technical data (speed, range, weight, etc.).

**Solution:** Key-value pair array stored on each base model.

- **Schema:** Add `specs: v.optional(v.array(v.object({ label: v.string(), value: v.string() })))` to `baseModels`
- **Admin:** Dynamic row editor (add/remove label-value pairs)
- **Configurator:** Display as table below description

## 4. Configurator Image Cropping

**Problem:** `object-cover` with `aspect-video` crops images that don't match 16:9.

**Solution:** Change to `object-contain` in model-picker. Keep `aspect-video` for consistent grid. Muted background fills letterbox area.

## 5. PDF Image Area Size

**Problem:** Category image in blank PDF is too small.

**Solution:** Increase customer fields section height by adding more vertical space, giving the image more room.

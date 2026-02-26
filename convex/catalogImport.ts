// convex/catalogImport.ts
import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const importCatalog = mutation({
  args: {
    categories: v.array(
      v.object({
        name: v.string(),
        sortOrder: v.number(),
        isActive: v.boolean(),
      }),
    ),
    optionGroups: v.array(
      v.object({
        name: v.string(),
        selectionType: v.union(v.literal('SINGLE'), v.literal('MULTI')),
        appliesTo: v.array(v.string()), // category names
        sortOrder: v.number(),
        isActive: v.boolean(),
      }),
    ),
    baseModels: v.array(
      v.object({
        categoryRef: v.string(), // category name
        skuCode: v.string(),
        articleNo: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        priceNet: v.number(),
        priceGross: v.number(),
        sortOrder: v.number(),
        isActive: v.boolean(),
        specs: v.optional(v.array(v.object({ label: v.string(), value: v.string() }))),
      }),
    ),
    options: v.array(
      v.object({
        optionGroupRef: v.string(), // option group name
        skuCode: v.string(),
        articleNo: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        priceNet: v.number(),
        priceGross: v.number(),
        sortOrder: v.number(),
        isActive: v.boolean(),
        isDefault: v.boolean(),
        restrictToModels: v.optional(v.array(v.string())),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const result = {
      categories: { created: 0, updated: 0 },
      optionGroups: { created: 0, updated: 0 },
      baseModels: { created: 0, updated: 0 },
      options: { created: 0, updated: 0 },
      errors: [] as Array<{ entity: string; name: string; message: string }>,
    }

    // ── 1. Upsert Categories ──────────────────────────────────────
    // Build a name → ID map for resolving references later
    const categoryNameToId = new Map<string, string>()

    // Pre-load existing categories
    const existingCategories = await ctx.db.query('categories').collect()
    for (const cat of existingCategories) {
      categoryNameToId.set(cat.name, cat._id)
    }

    for (const cat of args.categories) {
      try {
        const existingId = categoryNameToId.get(cat.name)
        if (existingId) {
          await ctx.db.patch(existingId as any, {
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          })
          result.categories.updated++
        } else {
          const newId = await ctx.db.insert('categories', {
            name: cat.name,
            sortOrder: cat.sortOrder,
            isActive: cat.isActive,
          })
          categoryNameToId.set(cat.name, newId)
          result.categories.created++
        }
      } catch (e) {
        result.errors.push({ entity: 'category', name: cat.name, message: String(e) })
      }
    }

    // ── 2. Upsert Option Groups ───────────────────────────────────
    const groupNameToId = new Map<string, string>()

    const existingGroups = await ctx.db.query('optionGroups').collect()
    for (const g of existingGroups) {
      groupNameToId.set(g.name, g._id)
    }

    for (const og of args.optionGroups) {
      try {
        // Resolve appliesTo category names → IDs
        const appliesToIds: string[] = []
        for (const catName of og.appliesTo) {
          const catId = categoryNameToId.get(catName)
          if (catId) {
            appliesToIds.push(catId)
          } else {
            result.errors.push({
              entity: 'optionGroup',
              name: og.name,
              message: `Kategorie "${catName}" in appliesTo nicht gefunden`,
            })
          }
        }

        const existingId = groupNameToId.get(og.name)
        if (existingId) {
          await ctx.db.patch(existingId as any, {
            selectionType: og.selectionType,
            appliesTo: appliesToIds,
            sortOrder: og.sortOrder,
            isActive: og.isActive,
          })
          result.optionGroups.updated++
        } else {
          const newId = await ctx.db.insert('optionGroups', {
            name: og.name,
            selectionType: og.selectionType,
            appliesTo: appliesToIds,
            sortOrder: og.sortOrder,
            isActive: og.isActive,
          })
          groupNameToId.set(og.name, newId)
          result.optionGroups.created++
        }
      } catch (e) {
        result.errors.push({ entity: 'optionGroup', name: og.name, message: String(e) })
      }
    }

    // ── 3. Upsert Base Models ─────────────────────────────────────
    for (const model of args.baseModels) {
      try {
        const categoryId = categoryNameToId.get(model.categoryRef)
        if (!categoryId) {
          result.errors.push({
            entity: 'baseModel',
            name: model.skuCode,
            message: `Kategorie "${model.categoryRef}" nicht gefunden`,
          })
          continue
        }

        const existing = await ctx.db
          .query('baseModels')
          .withIndex('by_skuCode', (q) => q.eq('skuCode', model.skuCode))
          .first()

        if (existing) {
          await ctx.db.patch(existing._id, {
            categoryId: categoryId as any,
            articleNo: model.articleNo,
            name: model.name,
            description: model.description,
            priceNet: model.priceNet,
            priceGross: model.priceGross,
            sortOrder: model.sortOrder,
            isActive: model.isActive,
            specs: model.specs,
          })
          result.baseModels.updated++
        } else {
          await ctx.db.insert('baseModels', {
            categoryId: categoryId as any,
            skuCode: model.skuCode,
            articleNo: model.articleNo,
            name: model.name,
            description: model.description,
            priceNet: model.priceNet,
            priceGross: model.priceGross,
            sortOrder: model.sortOrder,
            isActive: model.isActive,
            specs: model.specs,
          })
          result.baseModels.created++
        }
      } catch (e) {
        result.errors.push({ entity: 'baseModel', name: model.skuCode, message: String(e) })
      }
    }

    // ── 4. Upsert Options ─────────────────────────────────────────
    // Build model name → ID map for resolving restrictToModels
    const modelNameToId = new Map<string, string>()
    const allModels = await ctx.db.query('baseModels').collect()
    for (const m of allModels) {
      modelNameToId.set(m.name, m._id)
    }

    for (const opt of args.options) {
      try {
        const groupId = groupNameToId.get(opt.optionGroupRef)
        if (!groupId) {
          result.errors.push({
            entity: 'option',
            name: opt.skuCode,
            message: `Optionsgruppe "${opt.optionGroupRef}" nicht gefunden`,
          })
          continue
        }

        // Resolve model names to IDs
        const resolvedModelIds = (opt.restrictToModels ?? [])
          .map((name) => modelNameToId.get(name) ?? name)
          .filter(Boolean)

        const existing = await ctx.db
          .query('options')
          .withIndex('by_skuCode', (q) => q.eq('skuCode', opt.skuCode))
          .first()

        if (existing) {
          await ctx.db.patch(existing._id, {
            optionGroupId: groupId as any,
            articleNo: opt.articleNo,
            name: opt.name,
            description: opt.description,
            priceNet: opt.priceNet,
            priceGross: opt.priceGross,
            sortOrder: opt.sortOrder,
            isActive: opt.isActive,
            isDefault: opt.isDefault,
            restrictToModels: resolvedModelIds.length > 0 ? resolvedModelIds : undefined,
          })
          result.options.updated++
        } else {
          await ctx.db.insert('options', {
            optionGroupId: groupId as any,
            skuCode: opt.skuCode,
            articleNo: opt.articleNo,
            name: opt.name,
            description: opt.description,
            priceNet: opt.priceNet,
            priceGross: opt.priceGross,
            sortOrder: opt.sortOrder,
            isActive: opt.isActive,
            isDefault: opt.isDefault,
            restrictToModels: resolvedModelIds.length > 0 ? resolvedModelIds : undefined,
          })
          result.options.created++
        }
      } catch (e) {
        result.errors.push({ entity: 'option', name: opt.skuCode, message: String(e) })
      }
    }

    return result
  },
})

import { v } from 'convex/values'
import { query, mutation } from './_generated/server'

export const listByCustomer = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    return ctx.db
      .query('customerActionItems')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .collect()
  },
})

export const toggle = mutation({
  args: {
    customerId: v.id('customers'),
    actionId: v.id('customerActions'),
    checked: v.boolean(),
    userId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('customerActionItems')
      .withIndex('by_customer_action', (q) =>
        q.eq('customerId', args.customerId).eq('actionId', args.actionId),
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        checked: args.checked,
        checkedAt: args.checked ? Date.now() : undefined,
        checkedBy: args.checked ? args.userId : undefined,
      })
    } else {
      await ctx.db.insert('customerActionItems', {
        customerId: args.customerId,
        actionId: args.actionId,
        checked: args.checked,
        checkedAt: args.checked ? Date.now() : undefined,
        checkedBy: args.checked ? args.userId : undefined,
      })
    }
  },
})

export const resetForCustomer = mutation({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query('customerActionItems')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .collect()
    for (const item of items) {
      await ctx.db.patch(item._id, {
        checked: false,
        checkedAt: undefined,
        checkedBy: undefined,
      })
    }
  },
})

export const countByCustomer = query({
  args: { customerId: v.id('customers') },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query('customerActionItems')
      .withIndex('by_customer', (q) => q.eq('customerId', args.customerId))
      .collect()
    const checked = items.filter((i) => i.checked).length
    return { checked, total: items.length }
  },
})

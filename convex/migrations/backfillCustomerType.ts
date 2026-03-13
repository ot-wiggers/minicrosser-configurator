import { mutation } from '../_generated/server'

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query('customers').collect()
    let updated = 0
    for (const customer of customers) {
      if (!(customer as any).customerType) {
        await ctx.db.patch(customer._id, { customerType: 'business' as const })
        updated++
      }
    }
    return { updated, total: customers.length }
  },
})

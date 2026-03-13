import { mutation } from './_generated/server'

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('customerActions').first()
    if (existing) return // Already seeded

    const defaults = [
      { label: 'Katalog zuschicken', description: 'Produktkatalog per Post oder E-Mail zusenden', sortOrder: 1, isActive: true },
      { label: 'Marketingmaterial senden', description: 'Flyer, Broschueren oder Infomaterial zusenden', sortOrder: 2, isActive: true },
      { label: 'Probefahrt vereinbaren', description: 'Termin fuer eine Probefahrt absprechen', sortOrder: 3, isActive: true },
      { label: 'Rueckruf vereinbaren', description: 'Telefonischen Rueckruf terminieren', sortOrder: 4, isActive: true },
      { label: 'Finanzierungsangebot erstellen', description: 'Finanzierungsoptionen zusammenstellen', sortOrder: 5, isActive: true },
      { label: 'Wartungsvertrag anbieten', description: 'Informationen zu Wartungsvertraegen bereitstellen', sortOrder: 6, isActive: true },
    ]

    for (const action of defaults) {
      await ctx.db.insert('customerActions', action)
    }
  },
})

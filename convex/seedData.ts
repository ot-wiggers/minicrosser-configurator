"use node"

import { action } from './_generated/server'
import { api } from './_generated/api'

/**
 * Seed initial admin user if no users exist.
 * Called on first app load.
 */
export const seedAdminUser = action({
  args: {},
  handler: async (ctx) => {
    const userCount = await ctx.runQuery(api.users.count)
    if (userCount > 0) {
      return { seeded: false, message: 'Users already exist' }
    }

    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash('admin', 10)

    await ctx.runMutation(api.users.create, {
      name: 'Administrator',
      username: 'admin',
      passwordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: true,
    })

    return { seeded: true, message: 'Default admin user created (admin/admin)' }
  },
})

/**
 * Seed default settings if none exist.
 */
export const seedDefaultSettings = action({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.runQuery(api.settings.list)
    if (settings.length > 0) {
      return { seeded: false }
    }

    const defaults = [
      { key: 'companyName', value: 'Wiggers GmbH & Co. KG' },
      { key: 'companyStreet', value: 'Gerhard-Stalling-Straße 42' },
      { key: 'companyZip', value: '26135' },
      { key: 'companyCity', value: 'Oldenburg' },
      { key: 'companyPhone', value: '04 41 / 3 61 11 3 09' },
      { key: 'companyFax', value: '04 41 / 3 61 11 3 09' },
      { key: 'companyEmail', value: 'info@minicrosser.info' },
      { key: 'companyWeb', value: 'www.minicrosser.info' },
      { key: 'bankName1', value: 'Oldenburgische Landesbank' },
      { key: 'bankIban1', value: '' },
      { key: 'bankBic1', value: '' },
      { key: 'pdfColorPrimary', value: '#1E3A5F' },
      { key: 'pdfColorAccent', value: '#D4A843' },
      { key: 'vatRate', value: 19 },
      { key: 'documentPrefix', value: 'MC' },
    ]

    await ctx.runMutation(api.settings.setMany, { entries: defaults })

    return { seeded: true }
  },
})

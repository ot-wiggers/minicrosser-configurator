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

// ── Helper: netto → brutto (19% MwSt) ──
function gross(net: number): number {
  return Math.round(net * 1.19 * 100) / 100
}

/**
 * Seed complete sample catalog data:
 * - 3 Categories
 * - 7 Base Models
 * - 6 Option Groups with ~25 Options
 * - 5 Sample Customers
 * - 2 Employee Users (PIN: 1234)
 */
export const seedSampleData = action({
  args: {},
  handler: async (ctx): Promise<{ seeded: boolean; message: string }> => {
    // ── Guard: don't seed if categories already exist ──
    const existingCategories = await ctx.runQuery(api.categories.list)
    if (existingCategories.length > 0) {
      return { seeded: false, message: 'Catalog data already exists' }
    }

    // ══════════════════════════════════════════════════════
    // 1. CATEGORIES
    // ══════════════════════════════════════════════════════
    const catDreiRad = await ctx.runMutation(api.categories.create, {
      name: '3-Rad-Elektromobile',
      sortOrder: 1,
      isActive: true,
    })
    const catVierRad = await ctx.runMutation(api.categories.create, {
      name: '4-Rad-Elektromobile',
      sortOrder: 2,
      isActive: true,
    })
    const catKabine = await ctx.runMutation(api.categories.create, {
      name: 'Kabinenroller',
      sortOrder: 3,
      isActive: true,
    })

    // ══════════════════════════════════════════════════════
    // 2. BASE MODELS
    // ══════════════════════════════════════════════════════

    // 3-Rad
    await ctx.runMutation(api.baseModels.create, {
      categoryId: catDreiRad,
      skuCode: 'MC-M1-3W',
      articleNo: '10100',
      name: 'Mini Crosser M1 3W',
      description: 'Kompaktes 3-Rad-Elektromobil für den Innen- und Außenbereich. Wendekreis nur 120 cm.',
      priceNet: 3890,
      priceGross: gross(3890),
      sortOrder: 1,
      isActive: true,
    })
    await ctx.runMutation(api.baseModels.create, {
      categoryId: catDreiRad,
      skuCode: 'MC-M2-3W',
      articleNo: '10200',
      name: 'Mini Crosser M2 3W',
      description: 'Leistungsstarkes 3-Rad-Modell mit 15 km/h und 45 km Reichweite.',
      priceNet: 5290,
      priceGross: gross(5290),
      sortOrder: 2,
      isActive: true,
    })

    // 4-Rad
    await ctx.runMutation(api.baseModels.create, {
      categoryId: catVierRad,
      skuCode: 'MC-M1-4W',
      articleNo: '10110',
      name: 'Mini Crosser M1 4W',
      description: 'Stabiles 4-Rad-Elektromobil für maximale Sicherheit. Ideal für Einsteiger.',
      priceNet: 4190,
      priceGross: gross(4190),
      sortOrder: 3,
      isActive: true,
    })
    await ctx.runMutation(api.baseModels.create, {
      categoryId: catVierRad,
      skuCode: 'MC-M2-4W',
      articleNo: '10210',
      name: 'Mini Crosser M2 4W',
      description: 'Premium 4-Rad-Modell mit Vollfederung und höchstem Komfort. Bis 15 km/h.',
      priceNet: 5690,
      priceGross: gross(5690),
      sortOrder: 4,
      isActive: true,
    })
    await ctx.runMutation(api.baseModels.create, {
      categoryId: catVierRad,
      skuCode: 'MC-X1-4W',
      articleNo: '10310',
      name: 'Mini Crosser X1 4W',
      description: 'Geländetaugliches Elektromobil mit Extra-Bodenfreiheit und robuster Federung.',
      priceNet: 6490,
      priceGross: gross(6490),
      sortOrder: 5,
      isActive: true,
    })
    await ctx.runMutation(api.baseModels.create, {
      categoryId: catVierRad,
      skuCode: 'MC-X2-4W',
      articleNo: '10410',
      name: 'Mini Crosser X2 4W',
      description: 'Top-Modell mit 20 km/h, 60 km Reichweite und Doppelfederung. Für anspruchsvolle Fahrer.',
      priceNet: 7890,
      priceGross: gross(7890),
      sortOrder: 6,
      isActive: true,
    })

    // Kabinenroller
    await ctx.runMutation(api.baseModels.create, {
      categoryId: catKabine,
      skuCode: 'MC-CABIN',
      articleNo: '20100',
      name: 'Mini Crosser Cabin',
      description: 'Geschlossener Kabinenroller mit Heizung und Scheibenwischer. Ganzjährig mobil.',
      priceNet: 9890,
      priceGross: gross(9890),
      sortOrder: 7,
      isActive: true,
    })

    // ══════════════════════════════════════════════════════
    // 3. OPTION GROUPS + OPTIONS
    // ══════════════════════════════════════════════════════

    // --- Farbe (SINGLE, alle Kategorien) ---
    const grpFarbe = await ctx.runMutation(api.optionGroups.create, {
      name: 'Farbe',
      selectionType: 'SINGLE',
      appliesTo: [],
      sortOrder: 1,
      isActive: true,
    })
    const farben = [
      { sku: 'COL-RED', art: '90001', name: 'Rubinrot', price: 0, default: true },
      { sku: 'COL-BLU', art: '90002', name: 'Saphirblau', price: 0, default: false },
      { sku: 'COL-SIL', art: '90003', name: 'Champagner-Silber', price: 0, default: false },
      { sku: 'COL-BLK', art: '90004', name: 'Anthrazit-Schwarz', price: 0, default: false },
      { sku: 'COL-WHT', art: '90005', name: 'Perlmutt-Weiß', price: 149, default: false },
      { sku: 'COL-GRN', art: '90006', name: 'British-Racing-Green', price: 149, default: false },
    ]
    for (let i = 0; i < farben.length; i++) {
      const f = farben[i]
      await ctx.runMutation(api.options.create, {
        optionGroupId: grpFarbe,
        skuCode: f.sku,
        articleNo: f.art,
        name: f.name,
        priceNet: f.price,
        priceGross: gross(f.price),
        sortOrder: i + 1,
        isActive: true,
        isDefault: f.default,
      })
    }

    // --- Sitz (SINGLE, alle Kategorien) ---
    const grpSitz = await ctx.runMutation(api.optionGroups.create, {
      name: 'Sitz',
      selectionType: 'SINGLE',
      appliesTo: [],
      sortOrder: 2,
      isActive: true,
    })
    const sitze = [
      { sku: 'SEAT-STD', art: '91001', name: 'Standard-Sitz', desc: 'Komfortabler Grundsitz mit Armlehnen', price: 0, default: true },
      { sku: 'SEAT-KMF', art: '91002', name: 'Komfort-Sitz', desc: 'Ergonomischer Sitz mit Lordosenstütze und verstellbaren Armlehnen', price: 349, default: false },
      { sku: 'SEAT-DRH', art: '91003', name: 'Premium-Drehsitz', desc: '360° drehbarer Premiumsitz für leichtes Ein- und Aussteigen', price: 590, default: false },
      { sku: 'SEAT-CPT', art: '91004', name: 'Captain-Sitz', desc: 'Vollfederung, Heizung und maximale Einstellmöglichkeiten', price: 890, default: false },
    ]
    for (let i = 0; i < sitze.length; i++) {
      const s = sitze[i]
      await ctx.runMutation(api.options.create, {
        optionGroupId: grpSitz,
        skuCode: s.sku,
        articleNo: s.art,
        name: s.name,
        description: s.desc,
        priceNet: s.price,
        priceGross: gross(s.price),
        sortOrder: i + 1,
        isActive: true,
        isDefault: s.default,
      })
    }

    // --- Akku (SINGLE, alle Kategorien) ---
    const grpAkku = await ctx.runMutation(api.optionGroups.create, {
      name: 'Akku',
      selectionType: 'SINGLE',
      appliesTo: [],
      sortOrder: 3,
      isActive: true,
    })
    const akkus = [
      { sku: 'BAT-50', art: '92001', name: 'Standard-Akku 50 Ah', desc: 'Bis zu 35 km Reichweite', price: 0, default: true },
      { sku: 'BAT-75', art: '92002', name: 'Langstrecke-Akku 75 Ah', desc: 'Bis zu 55 km Reichweite', price: 490, default: false },
      { sku: 'BAT-100', art: '92003', name: 'Lithium-Akku 100 Ah', desc: 'Bis zu 75 km Reichweite, 40% leichter', price: 1290, default: false },
    ]
    for (let i = 0; i < akkus.length; i++) {
      const a = akkus[i]
      await ctx.runMutation(api.options.create, {
        optionGroupId: grpAkku,
        skuCode: a.sku,
        articleNo: a.art,
        name: a.name,
        description: a.desc,
        priceNet: a.price,
        priceGross: gross(a.price),
        sortOrder: i + 1,
        isActive: true,
        isDefault: a.default,
      })
    }

    // --- Beleuchtung (SINGLE, alle Kategorien) ---
    const grpLicht = await ctx.runMutation(api.optionGroups.create, {
      name: 'Beleuchtung',
      selectionType: 'SINGLE',
      appliesTo: [],
      sortOrder: 4,
      isActive: true,
    })
    const lichter = [
      { sku: 'LGT-STD', art: '93001', name: 'Standard-Beleuchtung', desc: 'Halogen-Frontscheinwerfer und Rückleuchte', price: 0, default: true },
      { sku: 'LGT-LED', art: '93002', name: 'LED-Paket', desc: 'Helle LED-Scheinwerfer, Tagfahrlicht und LED-Rückleuchte', price: 249, default: false },
      { sku: 'LGT-PRO', art: '93003', name: 'LED-Pro-Paket', desc: 'LED-Paket plus Nebelscheinwerfer und Blinker', price: 449, default: false },
    ]
    for (let i = 0; i < lichter.length; i++) {
      const l = lichter[i]
      await ctx.runMutation(api.options.create, {
        optionGroupId: grpLicht,
        skuCode: l.sku,
        articleNo: l.art,
        name: l.name,
        description: l.desc,
        priceNet: l.price,
        priceGross: gross(l.price),
        sortOrder: i + 1,
        isActive: true,
        isDefault: l.default,
      })
    }

    // --- Bereifung (SINGLE, nur 4-Rad + Kabinenroller) ---
    const grpReifen = await ctx.runMutation(api.optionGroups.create, {
      name: 'Bereifung',
      selectionType: 'SINGLE',
      appliesTo: [catVierRad, catKabine],
      sortOrder: 5,
      isActive: true,
    })
    const reifen = [
      { sku: 'TIR-STD', art: '94001', name: 'Standard-Bereifung', desc: 'Luftbereifte Gummiräder', price: 0, default: true },
      { sku: 'TIR-PNC', art: '94002', name: 'Pannensichere Reifen', desc: 'Vollgummi-Pannenschutz, nie wieder platte Reifen', price: 190, default: false },
      { sku: 'TIR-OFF', art: '94003', name: 'Offroad-Bereifung', desc: 'Grobstollige Reifen für unbefestigte Wege', price: 290, default: false },
    ]
    for (let i = 0; i < reifen.length; i++) {
      const r = reifen[i]
      await ctx.runMutation(api.options.create, {
        optionGroupId: grpReifen,
        skuCode: r.sku,
        articleNo: r.art,
        name: r.name,
        description: r.desc,
        priceNet: r.price,
        priceGross: gross(r.price),
        sortOrder: i + 1,
        isActive: true,
        isDefault: r.default,
      })
    }

    // --- Zubehör (MULTI, alle Kategorien) ---
    const grpZubehoer = await ctx.runMutation(api.optionGroups.create, {
      name: 'Zubehör',
      selectionType: 'MULTI',
      appliesTo: [],
      sortOrder: 6,
      isActive: true,
    })
    const zubehoer = [
      { sku: 'ACC-KORB', art: '95001', name: 'Einkaufskorb hinten', desc: 'Stabiler Metallkorb, abnehmbar', price: 89 },
      { sku: 'ACC-STOCK', art: '95002', name: 'Gehstock-/Krückenhalter', desc: 'Sichere Befestigung am Rahmen', price: 39 },
      { sku: 'ACC-RREGEN', art: '95003', name: 'Regenschutz-Cape', desc: 'Wasserdichter Poncho-Schutz für Fahrer', price: 69 },
      { sku: 'ACC-O2', art: '95004', name: 'Sauerstoffflaschenhalter', desc: 'Sichere Halterung für portable Sauerstoffflaschen', price: 129 },
      { sku: 'ACC-USB', art: '95005', name: 'USB-Ladebuchse', desc: 'Doppel-USB-Anschluss am Lenker', price: 49 },
      { sku: 'ACC-SPIEGEL', art: '95006', name: 'Rückspiegel-Set', desc: 'Links + rechts, verstellbar', price: 59 },
      { sku: 'ACC-TASCHE', art: '95007', name: 'Lenker-Tasche', desc: 'Gepolsterte Tasche mit Reißverschluss', price: 45 },
      { sku: 'ACC-ALARM', art: '95008', name: 'Diebstahlalarm', desc: 'Elektronische Wegfahrsperre mit Fernbedienung', price: 159 },
      { sku: 'ACC-DACH', art: '95009', name: 'Sonnendach/Regendach', desc: 'Klappbares Dach mit UV-Schutz', price: 590 },
      { sku: 'ACC-ANHAENGER', art: '95010', name: 'Anhängerkupplung', desc: 'Für Mini Crosser Transportanhänger', price: 129 },
    ]
    for (let i = 0; i < zubehoer.length; i++) {
      const z = zubehoer[i]
      await ctx.runMutation(api.options.create, {
        optionGroupId: grpZubehoer,
        skuCode: z.sku,
        articleNo: z.art,
        name: z.name,
        description: z.desc,
        priceNet: z.price,
        priceGross: gross(z.price),
        sortOrder: i + 1,
        isActive: true,
        isDefault: false,
      })
    }

    // ══════════════════════════════════════════════════════
    // 4. SAMPLE CUSTOMERS
    // ══════════════════════════════════════════════════════
    const kunden = [
      {
        company: 'Sanitätshaus Müller GmbH',
        firstName: 'Thomas',
        lastName: 'Müller',
        street: 'Lange Straße 15',
        zip: '26122',
        city: 'Oldenburg',
        email: 'mueller@sanitaetshaus-mueller.de',
        phone: '0441 / 12345678',
        customerNumber: 'K-10001',
      },
      {
        company: 'Reha-Technik Schmidt',
        firstName: 'Sabine',
        lastName: 'Schmidt',
        street: 'Am Markt 7',
        zip: '28195',
        city: 'Bremen',
        email: 'info@reha-schmidt.de',
        phone: '0421 / 98765432',
        customerNumber: 'K-10002',
      },
      {
        company: 'Gesundheitshaus am Park',
        firstName: 'Michael',
        lastName: 'Weber',
        street: 'Parkallee 23',
        zip: '49074',
        city: 'Osnabrück',
        email: 'm.weber@gesundheitshaus-park.de',
        phone: '0541 / 55667788',
        customerNumber: 'K-10003',
      },
      {
        company: 'Orthopädie-Zentrum Nord',
        firstName: 'Petra',
        lastName: 'Fischer',
        street: 'Kieler Straße 42',
        zip: '22769',
        city: 'Hamburg',
        email: 'fischer@ortho-nord.de',
        phone: '040 / 33445566',
        customerNumber: 'K-10004',
      },
      {
        company: 'Mobilität Plus e.K.',
        firstName: 'Klaus',
        lastName: 'Bergmann',
        street: 'Hauptstraße 112',
        zip: '30159',
        city: 'Hannover',
        email: 'bergmann@mobilitaet-plus.de',
        phone: '0511 / 77889900',
        customerNumber: 'K-10005',
      },
    ]
    for (const k of kunden) {
      await ctx.runMutation(api.customers.create, k)
    }

    // ══════════════════════════════════════════════════════
    // 5. EMPLOYEE USERS
    // ══════════════════════════════════════════════════════
    const bcrypt = await import('bcryptjs')
    const pin1234 = await bcrypt.hash('1234', 10)
    const pin5678 = await bcrypt.hash('5678', 10)

    await ctx.runMutation(api.users.create, {
      name: 'Max Berater',
      role: 'employee',
      pin: pin1234,
      isActive: true,
      mustChangePassword: false,
    })
    await ctx.runMutation(api.users.create, {
      name: 'Lisa Verkauf',
      role: 'employee',
      pin: pin5678,
      isActive: true,
      mustChangePassword: false,
    })

    return {
      seeded: true,
      message:
        'Sample data created: 3 categories, 7 models, 6 option groups with 29 options, 5 customers, 2 employees (Max PIN:1234, Lisa PIN:5678)',
    }
  },
})

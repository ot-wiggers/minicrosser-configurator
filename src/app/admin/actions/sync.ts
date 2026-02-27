'use server'

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../convex/_generated/api'
import { buildExportPayload } from '@/lib/catalog-export'

// ── Types ────────────────────────────────────────────────────────────

export interface SyncResult {
  success: boolean
  catalog?: {
    categories: { created: number; updated: number }
    optionGroups: { created: number; updated: number }
    baseModels: { created: number; updated: number }
    options: { created: number; updated: number }
    errors: Array<{ entity: string; name: string; message: string }>
  }
  settingsCount?: number
  error?: string
}

// ── Helpers ──────────────────────────────────────────────────────────

function getEnvConfig() {
  const urlDev = process.env.CONVEX_URL_DEV
  const urlProd = process.env.CONVEX_URL_PROD
  const keyDev = process.env.CONVEX_DEPLOY_KEY_DEV
  const keyProd = process.env.CONVEX_DEPLOY_KEY_PROD

  if (!urlDev || !urlProd || !keyDev || !keyProd) {
    return null
  }

  return { urlDev, urlProd, keyDev, keyProd }
}

function createAdminClient(url: string, deployKey: string): ConvexHttpClient {
  const client = new ConvexHttpClient(url)
  // setAdminAuth exists at runtime but is missing from public type declarations
  ;(client as unknown as { setAdminAuth(key: string): void }).setAdminAuth(deployKey)
  return client
}

// ── Main Server Action ───────────────────────────────────────────────

export async function syncEnvironments(
  direction: 'to-prod' | 'to-dev',
  sessionToken: string,
): Promise<SyncResult> {
  // 1. Check env vars
  const env = getEnvConfig()
  if (!env) {
    return {
      success: false,
      error: 'Sync-Umgebungsvariablen nicht konfiguriert. Bitte CONVEX_URL_DEV, CONVEX_URL_PROD, CONVEX_DEPLOY_KEY_DEV und CONVEX_DEPLOY_KEY_PROD setzen.',
    }
  }

  // 2. Determine source / target
  const sourceUrl = direction === 'to-prod' ? env.urlDev : env.urlProd
  const sourceKey = direction === 'to-prod' ? env.keyDev : env.keyProd
  const targetUrl = direction === 'to-prod' ? env.urlProd : env.urlDev
  const targetKey = direction === 'to-prod' ? env.keyProd : env.keyDev

  // 3. Verify admin session on current deployment
  const currentUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  const currentKey =
    currentUrl === env.urlDev ? env.keyDev :
    currentUrl === env.urlProd ? env.keyProd :
    null

  if (!currentKey) {
    return {
      success: false,
      error: 'Aktuelle Umgebung konnte nicht ermittelt werden.',
    }
  }

  try {
    const currentClient = createAdminClient(currentUrl!, currentKey)
    const session = await currentClient.query(api.sessions.getByToken, { token: sessionToken })

    if (!session) {
      return { success: false, error: 'Ungültige oder abgelaufene Sitzung.' }
    }

    const user = await currentClient.query(api.users.getById, { id: session.userId })
    if (!user || user.role !== 'admin') {
      return { success: false, error: 'Nur Administratoren können synchronisieren.' }
    }

    // 4. Read catalog + settings from source
    const source = createAdminClient(sourceUrl, sourceKey)

    const [categories, baseModels, optionGroups, options, settings] = await Promise.all([
      source.query(api.categories.list, {}),
      source.query(api.baseModels.list, {}),
      source.query(api.optionGroups.list, {}),
      source.query(api.options.list, {}),
      source.query(api.settings.list, {}),
    ])

    // 5. Convert to portable format (IDs → names)
    const payload = buildExportPayload({ categories, baseModels, optionGroups, options })

    // 6. Map description: null → undefined for Convex compatibility
    const cleanedModels = payload.baseModels.map(({ description, ...rest }) => ({
      ...rest,
      description: description ?? undefined,
    }))
    const cleanedOptions = payload.options.map(({ description, ...rest }) => ({
      ...rest,
      description: description ?? undefined,
    }))

    // 7. Write catalog to target
    const target = createAdminClient(targetUrl, targetKey)

    const catalogResult = await target.mutation(api.catalogImport.importCatalog, {
      categories: payload.categories,
      optionGroups: payload.optionGroups,
      baseModels: cleanedModels,
      options: cleanedOptions,
    })

    // 8. Write settings to target
    const settingsEntries = settings.map((s: { key: string; value: string | number | boolean }) => ({
      key: s.key,
      value: s.value,
    }))

    if (settingsEntries.length > 0) {
      await target.mutation(api.settings.setMany, { entries: settingsEntries })
    }

    return {
      success: true,
      catalog: catalogResult,
      settingsCount: settingsEntries.length,
    }
  } catch (e) {
    return {
      success: false,
      error: `Synchronisation fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`,
    }
  }
}

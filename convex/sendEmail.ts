"use node"

import { v } from 'convex/values'
import { action } from './_generated/server'
import { api } from './_generated/api'

/** Read a setting value from the DB, return as string or null. */
async function getSetting(ctx: any, key: string): Promise<string | null> {
  const record = await ctx.runQuery(api.settings.getByKey, { key })
  if (!record || record.value === '' || record.value === undefined) return null
  return String(record.value)
}

/**
 * Send an email with PDF attachment via Resend.
 * Reads API key and sender info from admin settings (DB),
 * with fallback to environment variables.
 */
export const send = action({
  args: {
    outboxId: v.id('outbox'),
  },
  handler: async (ctx, args) => {
    // Get the outbox record
    const outbox = await ctx.runQuery(api.outbox.listPending)
    const record = outbox.find((o) => o._id === args.outboxId)

    if (!record) {
      throw new Error('Outbox record not found')
    }

    // Read API key from admin settings, fallback to env var
    const resendApiKey =
      (await getSetting(ctx, 'resendApiKey')) ?? process.env.RESEND_API_KEY
    if (!resendApiKey) {
      await ctx.runMutation(api.outbox.updateStatus, {
        id: args.outboxId,
        status: 'FAILED',
        lastError: 'Resend API-Key nicht konfiguriert (Admin → Einstellungen → API)',
      })
      return { success: false, error: 'Resend API-Key nicht konfiguriert' }
    }

    // Read sender info from admin settings, fallback to env vars / defaults
    const fromEmail =
      (await getSetting(ctx, 'resendFromEmail')) ??
      process.env.EMAIL_FROM ??
      'noreply@minicrosser.info'
    const fromName =
      (await getSetting(ctx, 'resendFromName')) ?? 'Mini Crosser'
    const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [record.toEmail],
          subject: record.subject,
          html: `<p>Anbei erhalten Sie das gewünschte Dokument.</p><p>Mit freundlichen Grüßen</p>`,
          attachments: [
            {
              filename: record.filename,
              content: record.pdfBase64,
            },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Resend API error: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()
      const resendMessageId = responseData.id as string | undefined

      await ctx.runMutation(api.outbox.updateStatus, {
        id: args.outboxId,
        status: 'SENT',
        resendMessageId,
      })

      // Transition document from FINAL → SENT with sentAt timestamp
      const doc = await ctx.runQuery(api.documents.getById, { id: record.documentId })
      if (doc && doc.status === 'FINAL') {
        await ctx.runMutation(api.documents.updateStatus, {
          id: record.documentId,
          status: 'SENT',
          sentAt: Date.now(),
        })
      }

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await ctx.runMutation(api.outbox.updateStatus, {
        id: args.outboxId,
        status: 'FAILED',
        lastError: errorMessage,
        attempts: record.attempts + 1,
      })

      return { success: false, error: errorMessage }
    }
  },
})

"use node"

import { v } from 'convex/values'
import { action } from './_generated/server'
import { api } from './_generated/api'

/**
 * Send an email with PDF attachment via Resend.
 * This is a Convex action (runs in Node.js environment).
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

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      await ctx.runMutation(api.outbox.updateStatus, {
        id: args.outboxId,
        status: 'FAILED',
        lastError: 'RESEND_API_KEY not configured',
      })
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM ?? 'noreply@minicrosser.info',
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

      await ctx.runMutation(api.outbox.updateStatus, {
        id: args.outboxId,
        status: 'SENT',
      })

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

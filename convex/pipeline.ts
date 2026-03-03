import { internalMutation } from './_generated/server'

export const processFollowUps = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Load pipeline settings
    const followUpDaysSetting = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'pipelineFollowUpDays'))
      .first()
    const expiryDaysSetting = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'pipelineExpiryDays'))
      .first()
    const reminderEnabledSetting = await ctx.db
      .query('settings')
      .withIndex('by_key', (q) => q.eq('key', 'pipelineReminderEnabled'))
      .first()

    const followUpDays = (followUpDaysSetting?.value as number) ?? 7
    const expiryDays = (expiryDaysSetting?.value as number) ?? 30
    const reminderEnabled = (reminderEnabledSetting?.value as boolean) ?? true

    const now = Date.now()
    const followUpThreshold = now - followUpDays * 24 * 60 * 60 * 1000
    const expiryThreshold = now - expiryDays * 24 * 60 * 60 * 1000

    // Find SENT documents that need follow-up
    const sentDocs = await ctx.db
      .query('documents')
      .withIndex('by_status', (q) => q.eq('status', 'SENT'))
      .collect()

    for (const doc of sentDocs) {
      if (doc.sentAt && doc.sentAt < followUpThreshold) {
        await ctx.db.patch(doc._id, {
          status: 'FOLLOW_UP',
          followUpAt: now,
        })

        // Create reminder email in outbox if enabled
        if (reminderEnabled && doc.customer.email) {
          await ctx.db.insert('outbox', {
            documentId: doc._id,
            toEmail: doc.customer.email,
            subject: `Erinnerung: ${doc.documentType === 'QUOTE' ? 'Angebot' : 'Bestellung'} ${doc.documentNo}`,
            pdfBase64: '',
            filename: '',
            status: 'PENDING',
            attempts: 0,
          })
        }
      }
    }

    // Find FOLLOW_UP documents that have expired
    const followUpDocs = await ctx.db
      .query('documents')
      .withIndex('by_status', (q) => q.eq('status', 'FOLLOW_UP'))
      .collect()

    for (const doc of followUpDocs) {
      if (doc.sentAt && doc.sentAt < expiryThreshold) {
        await ctx.db.patch(doc._id, { status: 'EXPIRED' })
      }
    }
  },
})

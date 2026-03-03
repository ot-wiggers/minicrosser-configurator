import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

http.route({
  path: '/webhooks/resend',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.json()

    // Resend webhook payload structure:
    // { type: "email.opened", data: { email_id: "...", ... }, created_at: "..." }
    const eventType = body.type?.replace('email.', '')
    const resendMessageId = body.data?.email_id

    if (!eventType || !resendMessageId) {
      return new Response('Invalid payload', { status: 400 })
    }

    // Only process known event types
    const validTypes = ['delivered', 'opened', 'clicked', 'bounced']
    if (!validTypes.includes(eventType)) {
      return new Response('OK', { status: 200 })
    }

    // Find matching outbox entry by resendMessageId (uses index)
    const matchingEntry = await ctx.runQuery(api.outbox.getByResendMessageId, {
      resendMessageId,
    })

    if (matchingEntry) {
      await ctx.runMutation(api.emailEvents.create, {
        outboxId: matchingEntry._id,
        documentId: matchingEntry.documentId,
        resendMessageId,
        eventType: eventType as 'delivered' | 'opened' | 'clicked' | 'bounced',
        timestamp: new Date(body.created_at ?? Date.now()).getTime(),
        metadata: body.data?.click?.link ?? undefined,
      })
    }

    return new Response('OK', { status: 200 })
  }),
})

export default http

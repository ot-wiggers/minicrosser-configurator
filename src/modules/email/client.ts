import { outboxRepo } from '@/modules/storage'
import { documentRepo } from '@/modules/storage'

interface SendEmailPayload {
  documentId: number
  toEmail: string
  subject: string
  htmlBody: string
  pdfBase64: string
  filename: string
}

export async function sendOrQueueEmail(payload: SendEmailPayload): Promise<void> {
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        await documentRepo.updateStatus(payload.documentId, 'SENT')
        return
      }
    } catch {
      // Fall through to queue
    }
  }

  // Offline or failed — queue in outbox
  await outboxRepo.create({
    document_id: payload.documentId,
    to_email: payload.toEmail,
    subject: payload.subject,
    html_body: payload.htmlBody,
    pdf_base64: payload.pdfBase64,
    filename: payload.filename,
    status: 'PENDING',
    attempts: 0,
    created_at: new Date().toISOString(),
  })
}

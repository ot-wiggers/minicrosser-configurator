import { outboxRepo } from '@/modules/storage'
import { documentRepo } from '@/modules/storage'

const MAX_ATTEMPTS = 5

export async function processOutboxQueue(): Promise<void> {
  if (!navigator.onLine) return

  const pending = await outboxRepo.getPending()

  for (const record of pending) {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: record.to_email,
          subject: record.subject,
          htmlBody: record.html_body,
          pdfBase64: record.pdf_base64,
          filename: record.filename,
        }),
      })

      if (res.ok) {
        await outboxRepo.updateStatus(record.id!, 'SENT')
        await documentRepo.updateStatus(record.document_id, 'SENT')
      } else {
        const attempts = record.attempts + 1
        await outboxRepo.updateStatus(
          record.id!,
          attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          `HTTP ${res.status}`,
        )
      }
    } catch (err) {
      const attempts = record.attempts + 1
      await outboxRepo.updateStatus(
        record.id!,
        attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
        err instanceof Error ? err.message : 'Network error',
      )
    }
  }
}

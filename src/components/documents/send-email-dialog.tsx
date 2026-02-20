'use client'

import { useState } from 'react'
import type { DocumentRecord } from '@/modules/storage/types'
import { sendOrQueueEmail } from '@/modules/email/client'
import { generateDocumentPdf } from '@/modules/pdf'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: DocumentRecord
  onSent: () => void
}

const typeLabel: Record<string, string> = {
  QUOTE: 'Angebot',
  ORDER: 'Bestellung',
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function SendEmailDialog({ open, onOpenChange, document: doc, onSent }: SendEmailDialogProps) {
  const [toEmail, setToEmail] = useState(doc.customer.email)
  const [subject, setSubject] = useState(
    `Ihr ${typeLabel[doc.document_type]} ${doc.document_no}`,
  )
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!toEmail.trim()) {
      toast.error('Bitte E-Mail-Adresse eingeben')
      return
    }

    setSending(true)
    try {
      const pdfBytes = await generateDocumentPdf(doc)
      const pdfBase64 = arrayBufferToBase64(pdfBytes)

      await sendOrQueueEmail({
        documentId: doc.id!,
        toEmail,
        subject,
        htmlBody: `<p>Sehr geehrte Damen und Herren,</p><p>anbei erhalten Sie Ihr ${typeLabel[doc.document_type]} Nr. ${doc.document_no}.</p><p>Mit freundlichen Grüßen</p>`,
        pdfBase64,
        filename: `${doc.document_no}.pdf`,
      })

      if (navigator.onLine) {
        toast.success('E-Mail gesendet')
      } else {
        toast.info('In Outbox eingereiht — wird bei Verbindung gesendet')
      }

      onOpenChange(false)
      onSent()
    } catch (err) {
      toast.error('Fehler beim Senden')
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>E-Mail senden</DialogTitle>
          <DialogDescription>
            {typeLabel[doc.document_type]} {doc.document_no} als PDF versenden
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="toEmail">Empfänger</Label>
            <Input
              id="toEmail"
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subject">Betreff</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? 'Sendet...' : 'Senden'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
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

interface ConvexDocument {
  _id: string
  documentType: string
  documentNo: string
  status: string
  customer: {
    company: string
    firstName: string
    lastName: string
    street: string
    zip: string
    city: string
    email: string
    phone?: string
    contactPerson?: string
    customerNumber?: string
  }
  pricing: any
  selectedCategory: string
  selectedBaseModelId: string
  selectedOptions: any[]
  notes?: string
}

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: ConvexDocument
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

export function SendEmailDialog({ open, onOpenChange, document: doc }: SendEmailDialogProps) {
  const createOutboxEntry = useMutation(api.outbox.create)

  const [toEmail, setToEmail] = useState(doc.customer.email)
  const [subject, setSubject] = useState(
    `Ihr ${typeLabel[doc.documentType]} ${doc.documentNo}`,
  )
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!toEmail.trim()) {
      toast.error('Bitte E-Mail-Adresse eingeben')
      return
    }

    setSending(true)
    try {
      // Generate PDF and convert to base64
      const pdfBytes = await generateDocumentPdf(doc as any)
      const pdfBase64 = arrayBufferToBase64(pdfBytes)

      // Queue email in Convex outbox
      await createOutboxEntry({
        documentId: doc._id as any,
        toEmail,
        subject,
        pdfBase64,
        filename: `${doc.documentNo}.pdf`,
        status: 'PENDING',
        attempts: 0,
      })

      toast.info('E-Mail in Outbox eingereiht')
      onOpenChange(false)
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
            {typeLabel[doc.documentType]} {doc.documentNo} als PDF versenden
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

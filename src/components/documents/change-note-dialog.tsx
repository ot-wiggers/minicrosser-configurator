'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ChangeNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (note: string) => void
  saving?: boolean
}

export function ChangeNoteDialog({
  open,
  onOpenChange,
  onConfirm,
  saving,
}: ChangeNoteDialogProps) {
  const [note, setNote] = useState('')

  function handleConfirm() {
    onConfirm(note.trim())
    setNote('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Aenderungsnotiz</DialogTitle>
          <DialogDescription>
            Beschreiben Sie kurz, was geaendert wurde (optional).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          <Label htmlFor="change-note">Notiz</Label>
          <Textarea
            id="change-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="z.B. Kundendaten aktualisiert, Zubehoer geaendert..."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

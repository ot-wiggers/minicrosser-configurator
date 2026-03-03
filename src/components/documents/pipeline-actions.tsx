'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Archive, CheckCircle2, XCircle, Trash2, MailPlus } from 'lucide-react'

interface PipelineActionsProps {
  documentId: string
  status: string
  onDeleted?: () => void
}

export function PipelineActions({ documentId, status, onDeleted }: PipelineActionsProps) {
  const updateStatus = useMutation(api.documents.updateStatus)
  const removeDoc = useMutation(api.documents.remove)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  async function handleStatusChange(
    newStatus: string,
    extra?: Record<string, unknown>,
  ) {
    try {
      await updateStatus({
        id: documentId as Id<'documents'>,
        status: newStatus as any,
        ...extra,
      })
      toast.success('Status aktualisiert')
    } catch {
      toast.error('Fehler beim Status-Update')
    }
  }

  async function handleDelete() {
    try {
      await removeDoc({ id: documentId as Id<'documents'> })
      toast.success('Dokument gelöscht')
      onDeleted?.()
    } catch {
      toast.error('Fehler beim Löschen')
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {(status === 'SENT' || status === 'FOLLOW_UP') && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('ACCEPTED')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Angenommen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('DECLINED')}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Abgelehnt
            </Button>
          </>
        )}

        {status === 'FOLLOW_UP' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleStatusChange('FOLLOW_UP', { followUpAt: Date.now() })
            }
          >
            <MailPlus className="mr-2 h-4 w-4" />
            Erneut erinnern
          </Button>
        )}

        {!['ARCHIVED'].includes(status) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleStatusChange('ARCHIVED', { archivedAt: Date.now() })
            }
          >
            <Archive className="mr-2 h-4 w-4" />
            Archivieren
          </Button>
        )}

        {(status === 'DRAFT' || status === 'ARCHIVED') && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Löschen
          </Button>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokument endgültig löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Das Dokument wird
              dauerhaft entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

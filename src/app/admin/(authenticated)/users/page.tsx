'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserForm } from '@/components/admin/user-form'
import { Plus, Pencil, Trash2, Shield, User } from 'lucide-react'
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
import type { Id } from '../../../../../convex/_generated/dataModel'

export default function UsersPage() {
  const users = useQuery(api.users.list)
  const removeUser = useMutation(api.users.remove)

  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteUserId) return
    await removeUser({ id: deleteUserId as Id<'users'> })
    setDeleteUserId(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benutzerverwaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Administratoren und Mitarbeiter
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Benutzer
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Neuer Benutzer</CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm onClose={() => setShowCreateForm(false)} />
          </CardContent>
        </Card>
      )}

      {editingUser && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Benutzer bearbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <UserForm
              userId={editingUser}
              onClose={() => setEditingUser(null)}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {users?.map((u: any) => (
          <Card key={u._id}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {u.role === 'admin' ? (
                    <Shield className="h-5 w-5 text-primary" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{u.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role === 'admin' ? 'Administrator' : 'Mitarbeiter'}
                    </Badge>
                    {!u.isActive && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Deaktiviert
                      </Badge>
                    )}
                    {u.username && (
                      <span className="text-sm text-muted-foreground">
                        @{u.username}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingUser(u._id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteUserId(u._id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {users?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Keine Benutzer vorhanden
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Benutzer löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diesen Benutzer wirklich löschen? Diese Aktion kann nicht
              rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

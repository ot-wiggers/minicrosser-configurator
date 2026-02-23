'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useAuthStore } from '@/modules/auth/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const { isAuthenticated, user, setSession, setMustChangePassword } = useAuthStore()
  const loginAdmin = useAction(api.auth.loginAdmin)
  const changePasswordMutation = useAction(api.auth.changePassword)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginAdmin({ username, password })
      setSession(result.token, {
        id: result.user.id,
        name: result.user.name,
        username: result.user.username ?? undefined,
        role: result.user.role as 'admin' | 'employee',
        mustChangePassword: result.user.mustChangePassword,
      })

      if (!result.user.mustChangePassword) {
        router.push('/admin')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }

    setLoading(true)
    try {
      const token = useAuthStore.getState().token
      if (!token) throw new Error('Nicht authentifiziert')

      await changePasswordMutation({
        token,
        currentPassword: password,
        newPassword,
      })
      setMustChangePassword(false)
      router.push('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Passwortänderung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  // Show password change form after successful login with mustChangePassword
  if (isAuthenticated && user?.mustChangePassword) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Passwort ändern</CardTitle>
            <p className="text-sm text-muted-foreground">
              Bitte wählen Sie ein neues Passwort
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Speichert...' : 'Passwort ändern'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Admin-Anmeldung</CardTitle>
          <p className="text-sm text-muted-foreground">
            Melden Sie sich an, um den Katalog zu verwalten
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Benutzername</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Anmelden...' : 'Anmelden'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

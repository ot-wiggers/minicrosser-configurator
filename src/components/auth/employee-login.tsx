'use client'

import { useState } from 'react'
import { useQuery, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthStore } from '@/modules/auth/auth-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

export function EmployeeLogin() {
  const employees = useQuery(api.users.listActive)
  const loginEmployee = useAction(api.auth.loginEmployee)
  const { setSession } = useAuthStore()

  const [selectedUserId, setSelectedUserId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await loginEmployee({
        userId: selectedUserId as Id<'users'>,
        pin,
      })

      setSession(result.token, {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role as 'admin' | 'employee',
        mustChangePassword: result.user.mustChangePassword,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Anmeldung</CardTitle>
          <p className="text-sm text-muted-foreground">
            Wählen Sie Ihren Namen und geben Sie Ihre PIN ein
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee">Mitarbeiter</Label>
              <Select
                value={selectedUserId}
                onValueChange={(v) => {
                  setSelectedUserId(v)
                  setError('')
                }}
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Mitarbeiter auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp: any) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                  {(!employees || employees.length === 0) && (
                    <SelectItem value="_none" disabled>
                      Keine Mitarbeiter vorhanden
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="4-6 stellige PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !selectedUserId || pin.length < 4}
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { Id } from '../../../convex/_generated/dataModel'

interface UserFormProps {
  userId?: string
  onClose: () => void
}

export function UserForm({ userId, onClose }: UserFormProps) {
  const existingUser = useQuery(
    api.users.getById,
    userId ? { id: userId as Id<'users'> } : 'skip',
  )
  const createUser = useMutation(api.users.create)
  const updateUser = useMutation(api.users.update)
  const updatePassword = useMutation(api.users.updatePassword)
  const updatePin = useMutation(api.users.updatePin)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<'admin' | 'employee'>('employee')
  const [isActive, setIsActive] = useState(true)
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (existingUser) {
      setName(existingUser.name)
      setUsername(existingUser.username ?? '')
      setRole(existingUser.role)
      setIsActive(existingUser.isActive)
    }
  }, [existingUser])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (userId) {
        // Update existing user
        await updateUser({
          id: userId as Id<'users'>,
          name,
          username: role === 'admin' ? username : undefined,
          role,
          isActive,
        })

        // Update password if provided (admin)
        if (password && role === 'admin') {
          const bcrypt = await import('bcryptjs')
          const hash = await bcrypt.hash(password, 10)
          await updatePassword({
            id: userId as Id<'users'>,
            passwordHash: hash,
          })
        }

        // Update PIN if provided (employee)
        if (pin && role === 'employee') {
          const bcrypt = await import('bcryptjs')
          const hash = await bcrypt.hash(pin, 10)
          await updatePin({
            id: userId as Id<'users'>,
            pin: hash,
          })
        }

        toast.success('Benutzer aktualisiert')
      } else {
        // Create new user
        let passwordHash: string | undefined
        let pinHash: string | undefined

        if (role === 'admin') {
          if (!password) {
            toast.error('Bitte geben Sie ein Passwort ein')
            setLoading(false)
            return
          }
          if (!username) {
            toast.error('Bitte geben Sie einen Benutzernamen ein')
            setLoading(false)
            return
          }
          const bcrypt = await import('bcryptjs')
          passwordHash = await bcrypt.hash(password, 10)
        } else {
          if (!pin || pin.length < 4) {
            toast.error('Bitte geben Sie eine 4-6 stellige PIN ein')
            setLoading(false)
            return
          }
          const bcrypt = await import('bcryptjs')
          pinHash = await bcrypt.hash(pin, 10)
        }

        await createUser({
          name,
          username: role === 'admin' ? username : undefined,
          passwordHash,
          pin: pinHash,
          role,
          isActive: true,
          mustChangePassword: role === 'admin',
        })

        toast.success('Benutzer erstellt')
      }

      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max Mustermann"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rolle</Label>
          <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'employee')}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="employee">Mitarbeiter</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {role === 'admin' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="username">Benutzername</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required={role === 'admin'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              {userId ? 'Neues Passwort (optional)' : 'Passwort'}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={userId ? 'Unverändert lassen...' : 'Passwort'}
              required={!userId && role === 'admin'}
            />
          </div>
        </div>
      )}

      {role === 'employee' && (
        <div className="space-y-2">
          <Label htmlFor="pin">
            {userId ? 'Neue PIN (optional)' : 'PIN (4-6 Ziffern)'}
          </Label>
          <Input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder={userId ? 'Unverändert lassen...' : '4-6 stellige PIN'}
            required={!userId && role === 'employee'}
          />
        </div>
      )}

      {userId && (
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} id="isActive" />
          <Label htmlFor="isActive">Aktiv</Label>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Speichert...' : userId ? 'Aktualisieren' : 'Erstellen'}
        </Button>
      </div>
    </form>
  )
}

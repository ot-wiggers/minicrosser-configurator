'use client'

import { useEffect, useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthStore } from '@/modules/auth/auth-store'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Guards admin routes — requires authenticated admin role.
 * Validates the session server-side on mount to prevent stale localStorage.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, token, user, clearSession } = useAuthStore()
  const router = useRouter()
  const validateSession = useAction(api.auth.validateSession)
  const [validating, setValidating] = useState(true)

  useEffect(() => {
    async function validate() {
      // No local session at all → redirect immediately
      if (!isAuthenticated || !token || !user) {
        router.replace('/admin/login')
        return
      }

      // Non-admin in local state → redirect
      if (user.role !== 'admin') {
        router.replace('/')
        return
      }

      // Validate session on the server
      try {
        const serverUser = await validateSession({ token })
        if (!serverUser || serverUser.role !== 'admin') {
          clearSession()
          router.replace('/admin/login')
          return
        }
      } catch {
        clearSession()
        router.replace('/admin/login')
        return
      }

      setValidating(false)
    }

    validate()
  }, []) // Run once on mount only

  if (validating) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}

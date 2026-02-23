'use client'

import { useAuthStore } from '@/modules/auth/auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Guards admin routes — requires authenticated admin role.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/admin/login')
      return
    }
    if (user.role !== 'admin') {
      router.replace('/')
      return
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || !user || user.role !== 'admin') return null
  return <>{children}</>
}

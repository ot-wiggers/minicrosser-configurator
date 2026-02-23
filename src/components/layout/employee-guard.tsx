'use client'

import { useAuthStore } from '@/modules/auth/auth-store'

/**
 * Guards routes that require any authenticated user (admin or employee).
 * Shows a login prompt if not authenticated.
 */
export function EmployeeGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || !user) {
    // Don't redirect — the dashboard page itself shows the login panel
    return null
  }

  return <>{children}</>
}

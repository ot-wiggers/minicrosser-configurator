'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'admin' | 'employee'

interface AuthUser {
  id: string
  name: string
  username?: string
  role: UserRole
  mustChangePassword: boolean
}

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  user: AuthUser | null

  // Actions (called from components after Convex mutation)
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
  setMustChangePassword: (value: boolean) => void

  // Derived helpers
  isAdmin: () => boolean
  isEmployee: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      user: null,

      setSession: (token: string, user: AuthUser) => {
        set({
          isAuthenticated: true,
          token,
          user,
        })
      },

      clearSession: () => {
        set({
          isAuthenticated: false,
          token: null,
          user: null,
        })
      },

      setMustChangePassword: (value: boolean) => {
        const user = get().user
        if (user) {
          set({ user: { ...user, mustChangePassword: value } })
        }
      },

      isAdmin: () => get().user?.role === 'admin',
      isEmployee: () => get().user?.role === 'employee',
    }),
    { name: 'mc-auth' },
  ),
)

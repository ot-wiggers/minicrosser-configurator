'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import bcrypt from 'bcryptjs'
import { userRepo } from '@/modules/storage/user-repo'

interface AuthState {
  isAuthenticated: boolean
  username: string | null
  mustChangePassword: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  changePassword: (newPassword: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      username: null,
      mustChangePassword: false,

      login: async (username: string, password: string) => {
        const user = await userRepo.getByUsername(username)
        if (!user) return false
        const valid = await bcrypt.compare(password, user.passwordHash)
        if (!valid) return false
        set({
          isAuthenticated: true,
          username: user.username,
          mustChangePassword: user.mustChangePassword,
        })
        return true
      },

      logout: () => {
        set({ isAuthenticated: false, username: null, mustChangePassword: false })
      },

      changePassword: async (newPassword: string) => {
        const { username } = get()
        if (!username) return false
        const user = await userRepo.getByUsername(username)
        if (!user) return false
        const hash = await bcrypt.hash(newPassword, 10)
        await userRepo.updatePassword(user.id, hash)
        set({ mustChangePassword: false })
        return true
      },
    }),
    { name: 'mc-auth' },
  ),
)

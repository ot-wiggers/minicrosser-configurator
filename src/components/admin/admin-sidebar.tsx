'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthStore } from '@/modules/auth/auth-store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderOpen,
  Car,
  Layers,
  Settings,
  ListChecks,
  Users,
  Contact,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Kategorien', icon: FolderOpen },
  { href: '/admin/models', label: 'Modelle', icon: Car },
  { href: '/admin/option-groups', label: 'Optionsgruppen', icon: Layers },
  { href: '/admin/options', label: 'Optionen', icon: ListChecks },
  { href: '/admin/customers', label: 'Kunden', icon: Contact },
  { href: '/admin/users', label: 'Benutzer', icon: Users },
  { href: '/admin/settings', label: 'Einstellungen', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { clearSession, user, token } = useAuthStore()
  const logoutMutation = useAction(api.auth.logout)

  async function handleLogout() {
    if (token) {
      try {
        await logoutMutation({ token })
      } catch {
        // Ignore errors during logout — clear local state regardless
      }
    }
    clearSession()
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Admin
        </h2>
        {user && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {user.name}
          </p>
        )}
      </div>
      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </aside>
  )
}

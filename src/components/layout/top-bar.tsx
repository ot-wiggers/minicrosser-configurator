'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { OnlineIndicator } from './online-indicator'
import { cn } from '@/lib/utils'
import { LayoutDashboard, SendHorizonal } from 'lucide-react'

export function TopBar() {
  const pathname = usePathname()
  const outbox = useQuery(api.outbox.listPending)
  const pendingCount = (outbox as any[] | undefined)?.length ?? 0

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, badge: 0 },
    { href: '/outbox', label: 'Outbox', icon: SendHorizonal, badge: pendingCount },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Mini Crosser
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <OnlineIndicator />
      </div>
    </header>
  )
}

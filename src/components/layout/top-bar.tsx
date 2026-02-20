'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { OnlineIndicator } from './online-indicator'
import { cn } from '@/lib/utils'
import { outboxRepo } from '@/modules/storage'
import { LayoutDashboard, SendHorizonal } from 'lucide-react'

export function TopBar() {
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  const loadPendingCount = useCallback(async () => {
    try {
      const count = await outboxRepo.countPending()
      setPendingCount(count)
    } catch {
      // IndexedDB may not be available during SSR
    }
  }, [])

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect body
    const timeout = setTimeout(loadPendingCount, 0)
    const interval = setInterval(loadPendingCount, 10000)
    window.addEventListener('online', loadPendingCount)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
      window.removeEventListener('online', loadPendingCount)
    }
  }, [loadPendingCount])

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

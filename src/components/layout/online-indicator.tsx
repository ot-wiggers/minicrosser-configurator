'use client'

import { useOnlineStatus } from '@/hooks/use-online-status'
import { Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function OnlineIndicator() {
  const isOnline = useOnlineStatus()

  return (
    <Badge variant={isOnline ? 'default' : 'destructive'} className="gap-1">
      {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {isOnline ? 'Online' : 'Offline'}
    </Badge>
  )
}

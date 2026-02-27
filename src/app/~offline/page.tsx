import { WifiOff } from 'lucide-react'
import Link from 'next/link'

export default function OfflinePage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-6 px-4 text-center">
      <WifiOff className="h-16 w-16 text-muted-foreground" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Offline</h1>
        <p className="text-muted-foreground">
          Diese Seite ist gerade nicht verfügbar.
        </p>
        <p className="text-sm text-muted-foreground">
          Der Konfigurator und bereits besuchte Seiten sind weiterhin verfügbar.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Zum Dashboard
      </Link>
    </div>
  )
}

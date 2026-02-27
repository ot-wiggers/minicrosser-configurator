import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ConvexProvider } from '@/modules/convex/provider'
import { TopBar } from '@/components/layout/top-bar'
import { OutboxProcessor } from '@/components/layout/outbox-processor'
import { CacheSync } from '@/components/layout/cache-sync'
import { CatalogProvider } from '@/components/layout/catalog-provider'
import { Toaster } from 'sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Mini Crosser Konfigurator',
  description: 'Angebots- und Bestellkonfigurator für Mini Crosser Fahrzeuge',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MC Konfigurator',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1E3A5F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ConvexProvider>
          <CatalogProvider>
            <TopBar />
            <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
            <OutboxProcessor />
            <CacheSync />
          </CatalogProvider>
          <Toaster richColors position="top-right" />
        </ConvexProvider>
      </body>
    </html>
  )
}

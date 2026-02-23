import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { TopBar } from '@/components/layout/top-bar'
import { OutboxProcessor } from '@/components/layout/outbox-processor'
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
}

export const viewport: Viewport = {
  themeColor: '#E8731A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <CatalogProvider>
          <TopBar />
          <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
          <OutboxProcessor />
        </CatalogProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}

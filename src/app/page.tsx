'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PipelineBoard } from '@/components/documents/pipeline-board'
import { BlankPdfButtons } from '@/components/dashboard/blank-pdf-buttons'
import { EmployeeLogin } from '@/components/auth/employee-login'
import { useConfiguratorStore } from '@/modules/configurator'
import { useAuthStore } from '@/modules/auth/auth-store'
import { FilePlus2, ShoppingCart, LogOut, Shield } from 'lucide-react'

export default function DashboardPage() {
  const { setDocumentType, reset } = useConfiguratorStore()
  const { isAuthenticated, user, clearSession } = useAuthStore()

  function handleNew(type: 'QUOTE' | 'ORDER') {
    reset()
    setDocumentType(type)
  }

  // Show employee login if not authenticated
  if (!isAuthenticated || !user) {
    return <EmployeeLogin />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Willkommen, {user.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'admin' && (
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <Shield className="mr-2 h-4 w-4" />
                Admin-Bereich
              </Button>
            </Link>
          )}
          <Button variant="ghost" size="sm" onClick={clearSession}>
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4">
        <Link href="/new" onClick={() => handleNew('QUOTE')}>
          <Button variant="outline" className="h-24 w-full text-lg" size="lg">
            <FilePlus2 className="mr-2 h-6 w-6" />
            Neues Angebot
          </Button>
        </Link>
        <Link href="/new" onClick={() => handleNew('ORDER')}>
          <Button variant="outline" className="h-24 w-full text-lg" size="lg">
            <ShoppingCart className="mr-2 h-6 w-6" />
            Neue Bestellung
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Blanko-Formulare</h2>
        <BlankPdfButtons />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold">Pipeline</h2>
        <PipelineBoard />
      </div>
    </div>
  )
}

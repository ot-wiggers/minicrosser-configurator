'use client'

import { SettingsForm } from '@/components/admin/settings-form'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Einstellungen</h1>
      <SettingsForm />
    </div>
  )
}

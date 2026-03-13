'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SettingsForm } from '@/components/admin/settings-form'
import { ApiSettingsTab } from '@/components/admin/api-settings-tab'
import { MiscSettingsTab } from '@/components/admin/misc-settings-tab'
import { CustomerActionsSettings } from '@/components/admin/customer-actions-settings'
import UsersContent from '@/app/admin/(authenticated)/users/page'
import ImportExportContent from '@/app/admin/(authenticated)/import-export/page'

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Einstellungen</h1>
      <Tabs defaultValue="pdf">
        <TabsList className="mb-6">
          <TabsTrigger value="pdf">PDF Designer</TabsTrigger>
          <TabsTrigger value="api">API-Schnittstellen</TabsTrigger>
          <TabsTrigger value="users">Benutzer</TabsTrigger>
          <TabsTrigger value="import-export">Import / Export</TabsTrigger>
          <TabsTrigger value="customer-actions">Kundenaktionen</TabsTrigger>
          <TabsTrigger value="misc">Sonstiges</TabsTrigger>
        </TabsList>
        <TabsContent value="pdf">
          <SettingsForm />
        </TabsContent>
        <TabsContent value="api">
          <ApiSettingsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersContent />
        </TabsContent>
        <TabsContent value="import-export">
          <ImportExportContent />
        </TabsContent>
        <TabsContent value="customer-actions">
          <CustomerActionsSettings />
        </TabsContent>
        <TabsContent value="misc">
          <MiscSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

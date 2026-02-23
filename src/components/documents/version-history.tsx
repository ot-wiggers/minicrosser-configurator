'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { History, FileEdit } from 'lucide-react'

interface VersionHistoryProps {
  documentId: string
}

export function VersionHistory({ documentId }: VersionHistoryProps) {
  const versions = useQuery(
    api.documentVersions.listByDocument,
    { documentId: documentId as any },
  )

  if (!versions || (versions as any[]).length === 0) {
    return null
  }

  const sortedVersions = [...(versions as any[])].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Versionshistorie
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedVersions.map((version: any) => (
            <div
              key={version._id}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <FileEdit className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    Version {version.versionNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(new Date(version._creationTime).toISOString())}
                  </span>
                </div>
                {version.changeNote && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {version.changeNote}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

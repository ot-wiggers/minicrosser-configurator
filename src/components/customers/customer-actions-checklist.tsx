'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { useAuthStore } from '@/modules/auth/auth-store'
import { formatDate } from '@/lib/utils'

interface CustomerActionsChecklistProps {
  customerId: string
}

export function CustomerActionsChecklist({ customerId }: CustomerActionsChecklistProps) {
  const actions = useQuery(api.customerActions.listActive)
  const items = useQuery(api.customerActionItems.listByCustomer, {
    customerId: customerId as Id<'customers'>,
  })
  const toggle = useMutation(api.customerActionItems.toggle)
  const reset = useMutation(api.customerActionItems.resetForCustomer)
  const user = useAuthStore((s) => s.user)

  if (!actions || !items) return null
  if (actions.length === 0) return null

  const itemMap = new Map(items.map((item) => [item.actionId, item]))

  const checkedCount = items.filter((i) => i.checked).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Aktionen ({checkedCount}/{actions.length})
        </h3>
        {checkedCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reset({ customerId: customerId as Id<'customers'> })}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Zuruecksetzen
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {actions.map((action) => {
          const item = itemMap.get(action._id)
          const isChecked = item?.checked ?? false

          return (
            <div key={action._id} className="flex items-start gap-3">
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) =>
                  toggle({
                    customerId: customerId as Id<'customers'>,
                    actionId: action._id,
                    checked: !!checked,
                    userId: user?.id as Id<'users'> | undefined,
                  })
                }
              />
              <div className="flex-1 space-y-0.5">
                <label className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                  {action.label}
                </label>
                {action.description && (
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                )}
                {isChecked && item?.checkedAt && (
                  <p className="text-xs text-muted-foreground">
                    Erledigt am {formatDate(item.checkedAt)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

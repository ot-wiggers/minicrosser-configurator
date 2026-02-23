'use client'

import { ConvexProvider as BaseConvexProvider, ConvexReactClient } from 'convex/react'
import { type ReactNode, useMemo } from 'react'

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!

export function ConvexProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(CONVEX_URL), [])

  return <BaseConvexProvider client={client}>{children}</BaseConvexProvider>
}

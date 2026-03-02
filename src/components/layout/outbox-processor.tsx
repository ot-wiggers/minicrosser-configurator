'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { db } from '@/modules/storage/db'

/**
 * OutboxProcessor — processes two outbox queues:
 * 1. Convex outbox (email sending) — existing behavior
 * 2. Local syncOutbox (offline-created documents) — new behavior
 */
export function OutboxProcessor() {
  const isOnline = useOnlineStatus()
  const pendingEntries = useQuery(api.outbox.listPending)
  const sendEmail = useAction(api.sendEmail.send)
  const processingRef = useRef<Set<string>>(new Set())

  // Convex mutations for document sync
  const getNextSequence = useMutation(api.sequences.getNext)
  const createDocument = useMutation(api.documents.create)
  const findOrCreateCustomer = useMutation(api.customers.findOrCreate)

  // ── Email outbox (existing) ─────────────────────────────────

  useEffect(() => {
    if (!isOnline || !pendingEntries || pendingEntries.length === 0) return

    for (const entry of pendingEntries) {
      const id = entry._id as string
      if (processingRef.current.has(id)) continue

      processingRef.current.add(id)
      sendEmail({ outboxId: id as Id<"outbox"> })
        .then(() => {
          processingRef.current.delete(id)
        })
        .catch((err) => {
          console.error('Outbox send error:', err)
          processingRef.current.delete(id)
        })
    }
  }, [isOnline, pendingEntries, sendEmail])

  // ── Document sync outbox (new) ──────────────────────────────

  const syncDocuments = useCallback(async () => {
    const pendingDocs = await db.syncOutbox
      .where('status').equals('PENDING')
      .toArray()

    for (const entry of pendingDocs) {
      const syncId = `sync-${entry.id}`
      if (processingRef.current.has(syncId)) continue
      processingRef.current.add(syncId)

      try {
        const params = JSON.parse(entry.payload)

        // Get a server-side sequence number (local one may conflict)
        const year = new Date().getFullYear()
        const seqNum = await getNextSequence({ key: `doc-seq-${year}` })
        const documentNo = `MC-${year}-${String(seqNum).padStart(6, '0')}`

        // Find or create customer in Convex
        const customerId = await findOrCreateCustomer({
          company: params.customer.company,
          firstName: params.customer.firstName,
          lastName: params.customer.lastName,
          street: params.customer.street || undefined,
          zip: params.customer.zip || undefined,
          city: params.customer.city || undefined,
          email: params.customer.email,
          phone: params.customer.phone || undefined,
          contactPerson: params.customer.contactPerson || undefined,
          customerNumber: params.customer.customerNumber || undefined,
        })

        // Create document in Convex
        const convexDocId = await createDocument({
          documentNo,
          documentType: params.documentType,
          status: 'DRAFT',
          customerId: customerId as Id<"customers">,
          customer: params.customer,
          pricing: params.pricing,
          selectedCategory: params.selectedCategory,
          selectedBaseModelId: params.selectedBaseModelId,
          selectedOptions: params.selectedOptions,
          notes: params.notes || undefined,
        })

        // Update local document with Convex ID and synced doc number
        await db.documents.update(entry.localDocId, {
          convexId: convexDocId as string,
          document_no: documentNo,
        })

        // Mark sync entry as done
        await db.syncOutbox.update(entry.id!, { status: 'SENT' })
        processingRef.current.delete(syncId)
      } catch (err) {
        console.error('Document sync error:', err)
        await db.syncOutbox.update(entry.id!, {
          status: 'FAILED',
          attempts: (entry.attempts || 0) + 1,
          last_error: String(err),
        })
        processingRef.current.delete(syncId)
      }
    }
  }, [getNextSequence, createDocument, findOrCreateCustomer])

  useEffect(() => {
    if (!isOnline) return
    // Run sync check on mount and when coming back online
    syncDocuments().catch(console.error)
    // Also set up an interval while online
    const interval = setInterval(() => {
      syncDocuments().catch(console.error)
    }, 10_000) // Check every 10 seconds
    return () => clearInterval(interval)
  }, [isOnline, syncDocuments])

  return null
}

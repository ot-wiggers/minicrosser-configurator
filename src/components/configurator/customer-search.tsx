'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Input } from '@/components/ui/input'
import { Search, User } from 'lucide-react'
import type { CustomerData } from '@/modules/storage/types'

interface CustomerSearchProps {
  onSelect: (customer: CustomerData) => void
}

export function CustomerSearch({ onSelect }: CustomerSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const searchResults = useQuery(
    api.customers.search,
    query.trim().length >= 2 ? { query: query.trim() } : 'skip',
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(customer: any) {
    onSelect({
      company: customer.company,
      firstName: customer.firstName,
      lastName: customer.lastName,
      street: customer.street ?? '',
      zip: customer.zip ?? '',
      city: customer.city ?? '',
      email: customer.email,
      phone: customer.phone ?? '',
      contactPerson: customer.contactPerson ?? '',
      customerNumber: customer.customerNumber ?? '',
    })
    setQuery('')
    setIsOpen(false)
  }

  const results = searchResults ?? []
  const showDropdown = isOpen && query.trim().length >= 2 && results.length > 0

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Bestehenden Kunden suchen..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-[200px] overflow-y-auto py-1">
            {results.map((customer: any) => (
              <button
                key={customer._id}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                onClick={() => handleSelect(customer)}
              >
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{customer.company}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {customer.firstName} {customer.lastName} &middot; {customer.email}
                    {customer.customerNumber && ` · ${customer.customerNumber}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && searchResults !== undefined && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-center text-sm text-muted-foreground shadow-md">
          Kein Kunde gefunden
        </div>
      )}
    </div>
  )
}

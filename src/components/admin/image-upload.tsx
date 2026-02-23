'use client'

import { useCallback, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ImageIcon, X, Loader2 } from 'lucide-react'

interface ImageUploadProps {
  storageId?: string
  onChange: (storageId: string | undefined) => void
  label?: string
}

export function ImageUpload({ storageId, onChange, label = 'Bild hochladen' }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const imageUrl = useQuery(api.files.getUrl, storageId ? { storageId: storageId as Id<"_storage"> } : 'skip')

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return

      setUploading(true)
      try {
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        })
        const { storageId: newStorageId } = await result.json()
        onChange(newStorageId)
      } catch (err) {
        console.error('Failed to upload image:', err)
      } finally {
        setUploading(false)
      }
    },
    [generateUploadUrl, onChange],
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  if (uploading) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-md border">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (imageUrl) {
    return (
      <div className="relative inline-block">
        <img
          src={imageUrl}
          alt="Vorschau"
          className="h-24 w-24 rounded-md border object-cover"
        />
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed transition-colors ${
        isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
    >
      <ImageIcon className="h-6 w-6 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}

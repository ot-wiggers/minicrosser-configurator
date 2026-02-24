'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import SignaturePadLib from 'signature_pad'
import { Button } from '@/components/ui/button'
import { Undo2, Trash2 } from 'lucide-react'

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void
}

export function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const handleChange = useCallback(onChange, [onChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const pad = new SignaturePadLib(canvas, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    })

    pad.addEventListener('endStroke', () => {
      setIsEmpty(pad.isEmpty())
      handleChange(pad.toDataURL('image/png'))
    })

    padRef.current = pad

    // Resize canvas to container
    function resizeCanvas() {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas!.width = canvas!.offsetWidth * ratio
      canvas!.height = canvas!.offsetHeight * ratio
      canvas!.getContext('2d')?.scale(ratio, ratio)
      pad.clear()
      setIsEmpty(true)
      handleChange(null)
    }

    resizeCanvas()

    return () => {
      pad.off()
    }
  }, [handleChange])

  function handleClear() {
    padRef.current?.clear()
    setIsEmpty(true)
    onChange(null)
  }

  function handleUndo() {
    const pad = padRef.current
    if (!pad) return
    const data = pad.toData()
    if (data.length > 0) {
      data.pop()
      pad.fromData(data)
      setIsEmpty(pad.isEmpty())
      onChange(pad.isEmpty() ? null : pad.toDataURL('image/png'))
    }
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border bg-white">
        <canvas
          ref={canvasRef}
          className="h-32 w-full cursor-crosshair touch-none"
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={isEmpty}
        >
          <Undo2 className="mr-1 h-3 w-3" />
          Rückgängig
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty}
        >
          <Trash2 className="mr-1 h-3 w-3" />
          Löschen
        </Button>
      </div>
    </div>
  )
}

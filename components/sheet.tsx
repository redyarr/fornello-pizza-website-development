'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type SheetProps = {
  open: boolean
  onClose: () => void
  label: string
  variant?: 'sheet' | 'full'
  children: ReactNode
}

export function Sheet({ open, onClose, label, variant = 'sheet', children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'fixed inset-0 m-0 w-full max-w-none overflow-hidden p-0 backdrop:bg-black/70 open:animate-in open:fade-in-0 open:duration-200 motion-reduce:animate-none',
        variant === 'sheet' &&
          'mt-auto max-h-[92dvh] rounded-t-3xl bg-card text-card-foreground open:slide-in-from-bottom-8 sm:m-auto sm:max-w-lg sm:rounded-3xl',
        variant === 'full' && 'h-dvh max-h-none bg-foreground text-background',
      )}
    >
      {open ? (
        <div className={cn('flex flex-col', variant === 'sheet' ? 'max-h-[92dvh]' : 'h-dvh')}>{children}</div>
      ) : null}
    </dialog>
  )
}

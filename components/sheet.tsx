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
        'fixed z-50 overflow-hidden p-0 backdrop:bg-black/75 backdrop:backdrop-blur-xs open:animate-in open:fade-in-0 open:duration-200 motion-reduce:animate-none',
        variant === 'sheet' &&
          'inset-x-0 bottom-0 top-auto mx-auto my-0 h-fit max-h-[90dvh] w-full max-w-lg rounded-t-3xl border border-border/60 bg-card text-card-foreground shadow-2xl open:slide-in-from-bottom-6 sm:inset-0 sm:my-auto sm:max-h-[85dvh] sm:w-[calc(100%-2rem)] sm:rounded-3xl',
        variant === 'full' && 'inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-foreground text-background',
      )}
    >
      {open ? (
        <div className={cn('flex flex-col', variant === 'sheet' ? 'max-h-[90dvh] sm:max-h-[85dvh]' : 'h-dvh')}>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}

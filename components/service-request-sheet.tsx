'use client'

import { Bell, Check, Droplets, MessageCircle, Receipt, UtensilsCrossed, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { acknowledgeTableCall, dispatchTableCall } from '@/lib/floor'
import { SITE } from '@/lib/i18n'
import { padTable } from '@/lib/order'
import { playBellChime } from '@/lib/sound'
import { cn } from '@/lib/utils'
import { useOrder } from './order-provider'
import { Sheet } from './sheet'
import { Tricolor } from './tricolor'

type ServiceType = 'waiter' | 'bill' | 'water' | 'cutlery'

export function ServiceRequestSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t, table } = useOrder()
  const [activeRequest, setActiveRequest] = useState<ServiceType | null>(null)
  const [elapsed, setElapsed] = useState(0)

  // Timer for active beacon mode
  useEffect(() => {
    if (!activeRequest) {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [activeRequest])

  const handleSelectService = (type: ServiceType) => {
    playBellChime()
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 70, 40])
    }
    if (table) {
      dispatchTableCall(table, type)
    }
    setActiveRequest(type)
  }

  const handleDismiss = () => {
    if (table) {
      acknowledgeTableCall(table)
    }
    setActiveRequest(null)
    onClose()
  }

  const tableStr = table ? padTable(table) : '??'

  const getServiceLabel = (type: ServiceType) => {
    switch (type) {
      case 'waiter':
        return t.serviceCallWaiter
      case 'bill':
        return t.serviceBill
      case 'water':
        return t.serviceWater
      case 'cutlery':
        return t.serviceCutlery
    }
  }

  const getWhatsAppMessage = (type: ServiceType) => {
    const label = getServiceLabel(type)
    return encodeURIComponent(
      `*${SITE.name} — Table ${tableStr} Service Alert*\n🛎️ Request: ${label}\n📍 Table: ${tableStr}`,
    )
  }

  return (
    <Sheet
      open={open}
      onClose={handleDismiss}
      label={activeRequest ? t.beaconActive : t.serviceModalTitle}
      variant={activeRequest ? 'full' : 'sheet'}
    >
      {activeRequest ? (
        // BEACON MODE: Fullscreen pulsating floor beacon
        <div className="mx-auto flex h-full w-full max-w-lg flex-col justify-between overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center select-none sm:p-6">
          <div className="flex items-center justify-between border-b border-dashed border-background/30 pb-4">
            <span className="font-display text-sm tracking-wider uppercase text-background/70">
              {SITE.name} · Table Service
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t.close}
              className="grid size-9 place-items-center rounded-full border border-background/40 hover:bg-background/10"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="my-auto flex flex-col items-center gap-6 py-8">
            <div className="relative grid size-28 place-items-center rounded-full bg-accent/20 border-2 border-accent text-accent animate-pulse">
              <span className="absolute -inset-3 rounded-full border border-accent/40 animate-ping opacity-75" />
              <Bell className="size-12" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-2">
              <span className="rounded-full bg-accent px-4 py-1 text-xs font-bold tracking-widest text-accent-foreground uppercase">
                {t.beaconActive}
              </span>
              <p className="font-display text-6xl font-extrabold tracking-tight sm:text-7xl">
                {`${t.table} ${tableStr}`}
              </p>
              <p className="font-display text-2xl font-semibold tracking-wide uppercase text-accent">
                {getServiceLabel(activeRequest)}
              </p>
              <p className="text-sm opacity-80">
                {t.beaconHint}
              </p>
              <p className="font-mono text-xs opacity-60">
                Active for {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
              </p>
            </div>

            <a
              href={`https://wa.me/${SITE.whatsappNumber}?text=${getWhatsAppMessage(activeRequest)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full border border-background/40 bg-background/10 px-5 py-2.5 text-xs font-semibold hover:bg-background/20 transition-colors"
            >
              <MessageCircle className="size-4 text-emerald-400" aria-hidden="true" />
              <span>{t.serviceSentViaWhatsApp}</span>
            </a>
          </div>

          <div className="border-t border-dashed border-background/30 pt-4">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-background font-display text-lg font-semibold tracking-wide text-foreground uppercase hover:opacity-95 transition-opacity"
            >
              <Check className="size-5" aria-hidden="true" />
              {t.beaconCancel}
            </button>
          </div>
        </div>
      ) : (
        // SELECTION MODE
        <div className="mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col gap-5 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:gap-6 sm:p-6">
          <div className="flex items-center justify-between border-b border-dashed border-foreground/30 pb-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-wide uppercase">{t.serviceModalTitle}</h2>
              <p className="text-xs text-muted-foreground">
                {`${t.table} ${tableStr} · ${SITE.name}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleSelectService('waiter')}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-start hover:border-primary hover:bg-foreground/5 transition-all"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Bell className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-base font-semibold tracking-wide uppercase">{t.serviceCallWaiter}</p>
                <p className="text-xs text-muted-foreground">{t.serviceCallWaiterDesc}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectService('bill')}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-start hover:border-accent hover:bg-foreground/5 transition-all"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Receipt className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-base font-semibold tracking-wide uppercase">{t.serviceBill}</p>
                <p className="text-xs text-muted-foreground">{t.serviceBillDesc}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectService('water')}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-start hover:border-sky-500 hover:bg-foreground/5 transition-all"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                <Droplets className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-base font-semibold tracking-wide uppercase">{t.serviceWater}</p>
                <p className="text-xs text-muted-foreground">{t.serviceWaterDesc}</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectService('cutlery')}
              className="group flex flex-col items-start gap-2 rounded-2xl border border-border p-4 text-start hover:border-amber-500 hover:bg-foreground/5 transition-all"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                <UtensilsCrossed className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-base font-semibold tracking-wide uppercase">{t.serviceCutlery}</p>
                <p className="text-xs text-muted-foreground">{t.serviceCutleryDesc}</p>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-center pt-2">
            <Tricolor />
          </div>
        </div>
      )}
    </Sheet>
  )
}

'use client'

import { Bell, ShoppingBag, Utensils, X } from 'lucide-react'
import { useState } from 'react'
import { padTable } from '@/lib/order'
import { ModeSwitcher } from './mode-switcher'
import { useOrder } from './order-provider'
import { ServiceRequestSheet } from './service-request-sheet'
import { Sheet } from './sheet'
import { Tricolor } from './tricolor'

export function SiteHeader() {
  const { lang, mode, table, setLang, t } = useOrder()
  const [modeOpen, setModeOpen] = useState(false)
  const [serviceOpen, setServiceOpen] = useState(false)
  const ModeIcon = mode === 'dine-in' ? Utensils : ShoppingBag
  const modeLabel = mode === 'dine-in' ? (table ? `${t.table} ${padTable(table)}` : t.dineIn) : t.takeaway

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4">
        <a href="#top" lang="en" className="flex shrink-0 flex-col gap-1" aria-label="Fornello Pizza">
          <span className="font-display text-xl leading-none font-semibold tracking-[0.18em] text-primary">
            FORNELLO
          </span>
          <Tricolor className="h-0.5 w-full" />
        </a>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {mode === 'dine-in' && table ? (
            <button
              type="button"
              onClick={() => setServiceOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 text-xs font-semibold text-accent hover:bg-accent/25 transition-colors sm:px-3 sm:text-sm"
              title={t.serviceModalTitle}
            >
              <Bell className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{t.callWaiter}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setModeOpen(true)}
            aria-label={`${t.orderType}: ${modeLabel}`}
            className="flex h-9 max-w-[140px] items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium transition-colors hover:bg-foreground/10 sm:max-w-none sm:gap-2 sm:px-3 sm:text-sm"
          >
            <ModeIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate">{modeLabel}</span>
          </button>
          <button
            type="button"
            lang={lang === 'en' ? 'ckb' : 'en'}
            onClick={() => setLang(lang === 'en' ? 'ckb' : 'en')}
            className="h-9 shrink-0 rounded-full border border-border px-2.5 text-xs font-medium transition-colors hover:bg-foreground/10 sm:px-3 sm:text-sm"
          >
            {t.switchLanguage}
          </button>
        </div>
      </div>

      <Sheet open={modeOpen} onClose={() => setModeOpen(false)} label={t.orderType}>
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-wide uppercase">{t.orderType}</h2>
            <button
              type="button"
              onClick={() => setModeOpen(false)}
              aria-label={t.close}
              className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <ModeSwitcher id="header-table" />
          <button
            type="button"
            onClick={() => setModeOpen(false)}
            className="h-12 rounded-full bg-primary font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t.done}
          </button>
        </div>
      </Sheet>

      <ServiceRequestSheet open={serviceOpen} onClose={() => setServiceOpen(false)} />
    </header>
  )
}

'use client'

import { ShoppingBag, Utensils, X } from 'lucide-react'
import { useState } from 'react'
import { padTable } from '@/lib/order'
import { ModeSwitcher } from './mode-switcher'
import { useOrder } from './order-provider'
import { Sheet } from './sheet'
import { Tricolor } from './tricolor'

export function SiteHeader() {
  const { lang, mode, table, setLang, t } = useOrder()
  const [modeOpen, setModeOpen] = useState(false)
  const ModeIcon = mode === 'dine-in' ? Utensils : ShoppingBag
  const modeLabel = mode === 'dine-in' ? (table ? `${t.table} ${padTable(table)}` : t.dineIn) : t.takeaway

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <a href="#top" lang="en" className="flex flex-col gap-1" aria-label="Fornello Pizza">
          <span className="font-display text-xl leading-none font-semibold tracking-[0.18em] text-primary">
            FORNELLO
          </span>
          <Tricolor className="h-0.5 w-full" />
        </a>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModeOpen(true)}
            aria-label={`${t.orderType}: ${modeLabel}`}
            className="flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium transition-colors hover:bg-foreground/10"
          >
            <ModeIcon className="size-4 text-primary" aria-hidden="true" />
            {modeLabel}
          </button>
          <button
            type="button"
            lang={lang === 'en' ? 'ckb' : 'en'}
            onClick={() => setLang(lang === 'en' ? 'ckb' : 'en')}
            className="h-9 rounded-full border border-border px-3 text-sm font-medium transition-colors hover:bg-foreground/10"
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
    </header>
  )
}

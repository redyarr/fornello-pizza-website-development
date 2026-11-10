'use client'

import { Clock, MessageCircle, Minus, Plus, Trash2, X } from 'lucide-react'
import { getItem } from '@/lib/menu'
import {
  buildReceipt,
  cartTotal,
  describeSelections,
  formatIQD,
  lineTotal,
  needsPacing,
  prepEstimate,
  whatsappUrl,
  type Pacing,
} from '@/lib/order'
import { cn } from '@/lib/utils'
import { ModeSwitcher } from './mode-switcher'
import { useOrder } from './order-provider'
import { Sheet } from './sheet'

const PACING_OPTIONS: Pacing[] = ['now', 'together', 'after']

type OrderSheetProps = { open: boolean; onClose: () => void; onShowTicket: () => void }

export function OrderSheet({ open, onClose, onShowTicket }: OrderSheetProps) {
  const order = useOrder()
  const { lang, t, mode, table, lines, pacing, customerName, note } = order
  const ready = lines.length > 0 && (mode === 'takeaway' || table !== null)
  const [low, high] = prepEstimate(lines)
  const receipt = buildReceipt({ lang, t, mode, table, lines, pacing, customerName, note })
  const actionClass =
    'flex h-12 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-90 sm:flex-1'

  return (
    <Sheet open={open} onClose={onClose} label={t.yourOrder}>
      <div className="flex items-center justify-between gap-4 border-b border-dashed border-foreground/30 px-5 py-4">
        <h2 className="font-display text-2xl font-medium tracking-wide uppercase">{t.yourOrder}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5 [&>*]:shrink-0">
        <ModeSwitcher id="order-table" />

        {lines.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">{t.emptyOrder}</p>
        ) : (
          <ul className="divide-y divide-dashed divide-foreground/30">
            {lines.map((line) => {
              const item = getItem(line.itemId)
              if (!item) return null
              return (
                <li key={line.uid} className="flex flex-col gap-3 py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p lang="en" className="font-display text-lg leading-snug tracking-wide uppercase">
                        {item.name}
                      </p>
                      {describeSelections(item, line.selections, lang).map((detail) => (
                        <p key={detail} className="text-sm leading-relaxed text-muted-foreground">
                          {detail}
                        </p>
                      ))}
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">{formatIQD(lineTotal(line))}</p>
                  </div>
                  <div
                    role="group"
                    aria-label={`${t.quantity}: ${item.name}`}
                    className="flex h-10 w-fit items-center rounded-full border border-border"
                  >
                    <button
                      type="button"
                      onClick={() => order.setQty(line.uid, line.qty - 1)}
                      aria-label={line.qty === 1 ? t.remove : t.decrease}
                      className="grid size-10 place-items-center rounded-full hover:bg-foreground/10"
                    >
                      {line.qty === 1 ? (
                        <Trash2 className="size-4" aria-hidden="true" />
                      ) : (
                        <Minus className="size-4" aria-hidden="true" />
                      )}
                    </button>
                    <span aria-live="polite" className="w-6 text-center text-sm font-medium tabular-nums">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => order.setQty(line.uid, line.qty + 1)}
                      aria-label={t.increase}
                      className="grid size-10 place-items-center rounded-full hover:bg-foreground/10"
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {mode === 'dine-in' && needsPacing(lines) ? (
          <fieldset className="flex flex-col gap-3">
            <legend className="font-display text-lg tracking-wide uppercase">{t.pacingTitle}</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {PACING_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border border-border px-2 py-2 text-center text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
                >
                  <input
                    type="radio"
                    name="pacing"
                    checked={pacing === option}
                    onChange={() => order.setPacing(option)}
                    className="sr-only"
                  />
                  {t.pacing[option]}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {mode === 'takeaway' && lines.length > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-xl bg-background/50 px-4 py-3">
              <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">{t.readyIn(low, high)}</p>
                <p className="text-sm text-muted-foreground">{t.estimateNote}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="pickup-name" className="text-sm font-medium">
                {t.nameLabel}
              </label>
              <input
                id="pickup-name"
                type="text"
                autoComplete="given-name"
                maxLength={40}
                value={customerName}
                onChange={(event) => order.setCustomerName(event.target.value)}
                placeholder={t.namePlaceholder}
                className="h-12 rounded-xl border border-input bg-background/50 px-4 text-base placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>
          </div>
        ) : null}

        {lines.length > 0 ? (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="order-note" className="text-sm font-medium">
                {t.noteLabel}
              </label>
              <textarea
                id="order-note"
                rows={2}
                maxLength={200}
                value={note}
                onChange={(event) => order.setNote(event.target.value)}
                placeholder={t.notePlaceholder}
                className="rounded-xl border border-input bg-background/50 px-4 py-3 text-base placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            </div>
            <button
              type="button"
              onClick={order.clearOrder}
              className="w-fit text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t.clearOrder}
            </button>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-card px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-lg tracking-wide uppercase">{t.total}</span>
          <span className="text-xl font-semibold tabular-nums">{formatIQD(cartTotal(lines))}</span>
        </div>
        {lines.length > 0 && !ready ? (
          <p role="status" className="text-sm text-primary">
            {t.needTable}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          {ready ? (
            <a
              href={whatsappUrl(receipt)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(actionClass, 'bg-accent text-accent-foreground')}
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              {t.sendWhatsApp}
            </a>
          ) : (
            <button type="button" disabled className={cn(actionClass, 'bg-accent text-accent-foreground opacity-50')}>
              <MessageCircle className="size-4" aria-hidden="true" />
              {t.sendWhatsApp}
            </button>
          )}
          <button
            type="button"
            disabled={!ready}
            onClick={onShowTicket}
            className={cn(actionClass, 'bg-primary text-primary-foreground disabled:opacity-50')}
          >
            {mode === 'dine-in' ? t.showToWaiter : t.showAtCounter}
          </button>
        </div>
      </div>
    </Sheet>
  )
}

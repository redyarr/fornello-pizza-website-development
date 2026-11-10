'use client'

import { CheckCircle2, Clock, Receipt, Utensils, X } from 'lucide-react'
import { getItem } from '@/lib/menu'
import { describeSelections, formatIQD, lineTotal, padTable, prepEstimate } from '@/lib/order'
import { useOrder, type PlacedOrder } from './order-provider'
import { Sheet } from './sheet'
import { Tricolor } from './tricolor'

type OrderConfirmationProps = {
  open: boolean
  order: PlacedOrder | null
  onClose: () => void
  onShowTicket: () => void
}

export function OrderConfirmation({ open, order, onClose, onShowTicket }: OrderConfirmationProps) {
  const { lang, t } = useOrder()
  if (!order) return null

  const dineIn = order.mode === 'dine-in'
  const tableStr = order.table ? padTable(order.table) : '??'
  const [low, high] = prepEstimate(order.lines)

  return (
    <Sheet open={open} onClose={onClose} label={dineIn ? t.orderSentTitle : t.orderSentCounterTitle} variant="sheet">
      <div className="flex min-h-0 flex-1 flex-col justify-between p-6 overflow-y-auto">
        <div className="flex flex-col gap-5">
          {/* Top Close */}
          <div className="flex items-center justify-between border-b border-dashed border-foreground/30 pb-3">
            <span className="font-display text-sm tracking-wider uppercase text-muted-foreground">
              {t.orderConfirmedBadge}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              className="grid size-9 place-items-center rounded-full border border-border hover:bg-foreground/10"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Success Banner */}
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <div className="grid size-16 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="size-9" aria-hidden="true" />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl font-bold tracking-wide uppercase sm:text-3xl text-primary">
                {dineIn ? t.orderSentTitle : t.orderSentCounterTitle}
              </h2>
              <Tricolor className="mx-auto" />
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                {t.orderSentSubtitle}
              </p>
            </div>

            {/* Target & Ref Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-semibold">
              <span className="rounded-full bg-primary/20 text-primary px-3 py-1 font-mono">
                {order.orderRef}
              </span>
              <span className="rounded-full bg-secondary border border-border px-3 py-1">
                {dineIn ? `${t.table} ${tableStr}` : t.takeaway}
              </span>
              <span className="rounded-full bg-secondary border border-border px-3 py-1 tabular-nums text-muted-foreground">
                {order.timestamp}
              </span>
            </div>
          </div>

          {/* Estimate Note */}
          <div className="flex items-center gap-3 rounded-2xl bg-secondary/50 border border-border p-3.5 text-xs">
            <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{t.readyIn(low, high)}</span>
          </div>

          {/* What You Ordered Breakdown */}
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="font-display text-sm tracking-wide uppercase text-muted-foreground border-b border-dashed border-foreground/20 pb-2">
              {t.whatYouOrdered} ({order.lines.length})
            </p>

            <ul className="divide-y divide-dashed divide-foreground/20 mt-2 max-h-48 overflow-y-auto pe-1">
              {order.lines.map((line) => {
                const item = getItem(line.itemId)
                if (!item) return null
                return (
                  <li key={line.uid} className="py-2.5 first:pt-1 last:pb-1 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold uppercase">
                          {line.qty}× {item.name}
                        </p>
                        {describeSelections(item, line.selections, lang).map((s) => (
                          <p key={s} className="text-[11px] text-muted-foreground leading-snug">{s}</p>
                        ))}
                        {line.notes ? (
                          <p className="mt-0.5 text-[11px] italic text-primary">📝 {line.notes}</p>
                        ) : null}
                      </div>
                      <span className="font-semibold tabular-nums text-foreground">{formatIQD(lineTotal(line))}</span>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="mt-3 border-t border-dashed border-foreground/30 pt-3 flex items-baseline justify-between">
              <span className="font-display text-base font-semibold uppercase">{t.total}</span>
              <span className="font-display text-xl font-bold tabular-nums text-primary">{formatIQD(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 flex flex-col gap-2 pt-2 border-t border-dashed border-foreground/30">
          <button
            type="button"
            onClick={onShowTicket}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-xs text-accent-foreground uppercase tracking-wide hover:opacity-90 shadow-md transition-opacity"
          >
            <Receipt className="size-4" aria-hidden="true" />
            <span>{t.showOrderTicket}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-full border border-border text-xs font-medium hover:bg-foreground/10 transition-colors"
          >
            <span>{t.backToMenu}</span>
          </button>
        </div>
      </div>
    </Sheet>
  )
}

'use client'

import { Receipt } from 'lucide-react'
import { useState } from 'react'
import { cartCount, cartTotal, formatIQD, padTable } from '@/lib/order'
import { OrderSheet } from './order-sheet'
import { useOrder } from './order-provider'
import { WaiterTicket } from './waiter-ticket'

export function CartBar() {
  const { lines, t, activePlacedOrder } = useOrder()
  const [view, setView] = useState<'cart' | 'ticket' | null>(null)
  const [ticketTime, setTicketTime] = useState('')
  const count = cartCount(lines)

  const showTicket = () => {
    setTicketTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    setView('ticket')
  }

  const activeTarget = activePlacedOrder
    ? activePlacedOrder.mode === 'dine-in'
      ? `${t.table} ${padTable(activePlacedOrder.table ?? 0)}`
      : t.takeaway
    : ''

  return (
    <>
      {count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setView('cart')}
            className="mx-auto flex h-14 w-full max-w-xl items-center justify-between gap-4 rounded-full bg-primary px-5 font-medium text-primary-foreground shadow-lg shadow-black/40 transition-transform hover:scale-[1.01]"
          >
            <span className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-primary-foreground text-sm text-primary tabular-nums">
                {count}
              </span>
              {t.viewOrder}
            </span>
            <span className="tabular-nums">{formatIQD(cartTotal(lines))}</span>
          </button>
        </div>
      ) : activePlacedOrder ? (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={showTicket}
            className="mx-auto flex h-14 w-full max-w-xl items-center justify-between gap-3 rounded-full bg-emerald-950/95 text-emerald-100 border border-emerald-500/50 px-5 font-medium shadow-xl shadow-black/60 backdrop-blur-md transition-transform hover:scale-[1.01]"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <span className="truncate text-xs sm:text-sm font-semibold">
                {t.orderActiveBar(activePlacedOrder.orderRef, activeTarget)}
              </span>
            </span>
            <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Receipt className="size-3.5" aria-hidden="true" />
              <span>{t.showOrderTicket}</span>
            </span>
          </button>
        </div>
      ) : null}

      <OrderSheet
        open={view === 'cart'}
        onClose={() => setView(null)}
        onShowTicket={showTicket}
        onOrderPlaced={showTicket}
      />

      <WaiterTicket
        open={view === 'ticket'}
        time={ticketTime || activePlacedOrder?.timestamp || ''}
        onBack={() => setView(null)}
        onFinish={() => setView(null)}
      />
    </>
  )
}

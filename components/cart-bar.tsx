'use client'

import { useState } from 'react'
import { cartCount, cartTotal, formatIQD } from '@/lib/order'
import { OrderSheet } from './order-sheet'
import { useOrder } from './order-provider'
import { WaiterTicket } from './waiter-ticket'

export function CartBar() {
  const { lines, t } = useOrder()
  const [view, setView] = useState<'cart' | 'ticket' | null>(null)
  const [ticketTime, setTicketTime] = useState('')
  const count = cartCount(lines)

  const showTicket = () => {
    setTicketTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
    setView('ticket')
  }

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
      ) : null}

      <OrderSheet open={view === 'cart'} onClose={() => setView(null)} onShowTicket={showTicket} />
      <WaiterTicket
        open={view === 'ticket'}
        time={ticketTime}
        onBack={() => setView('cart')}
        onFinish={() => setView(null)}
      />
    </>
  )
}

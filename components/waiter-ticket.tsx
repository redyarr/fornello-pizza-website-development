'use client'

import { ArrowLeft, Bell, Check, CheckCircle2, Printer } from 'lucide-react'
import { useState } from 'react'
import { getItem } from '@/lib/menu'
import { cartTotal, describeSelections, formatIQD, lineTotal, needsPacing, padTable, prepEstimate } from '@/lib/order'
import { useOrder } from './order-provider'
import { Sheet } from './sheet'
import { Tricolor } from './tricolor'

type WaiterTicketProps = { open: boolean; time: string; onBack: () => void; onFinish: () => void }

export function WaiterTicket({ open, time, onBack, onFinish }: WaiterTicketProps) {
  const { lang, t, mode, table, lines, pacing, customerName, note, orderRef, clearOrder } = useOrder()
  const [waiterCalled, setWaiterCalled] = useState(false)
  const [staffConfirmed, setStaffConfirmed] = useState(false)
  const dineIn = mode === 'dine-in'
  const [low, high] = prepEstimate(lines)
  const name = customerName.trim()

  const handleCallWaiter = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 60, 40])
    }
    setWaiterCalled(true)
    setTimeout(() => setWaiterCalled(false), 8000)
  }

  return (
    <Sheet open={open} onClose={onBack} label={dineIn ? t.ticketHintWaiter : t.ticketHintCounter} variant="full">
      <div className="mx-auto flex h-full w-full max-w-xl flex-col">
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 items-center gap-2 rounded-full border border-background/30 px-4 text-sm font-medium hover:bg-background/10"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            {t.backToOrder}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex h-9 items-center gap-1.5 rounded-full border border-background/30 px-3 text-xs font-medium hover:bg-background/10 print:hidden"
              title={t.printThermalTicket}
            >
              <Printer className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.printThermalTicket}</span>
            </button>
            <span className="rounded-full border border-background/30 px-2.5 py-0.5 text-xs font-mono font-semibold tracking-wider">
              {orderRef}
            </span>
            <p className="text-sm tabular-nums">{time}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <div className="flex flex-col items-center gap-2 border-b-2 border-dashed border-background/40 pb-5 text-center">
            <p lang="en" className="font-display text-2xl font-semibold tracking-[0.18em]">
              FORNELLO
            </p>
            <Tricolor className="[&>span:nth-child(2)]:bg-background/20" />
            <p className="text-sm">{dineIn ? t.ticketHintWaiter : t.ticketHintCounter}</p>
            <p className="font-display text-4xl sm:text-5xl md:text-6xl leading-tight font-semibold tracking-wide uppercase break-words">
              {dineIn ? `${t.table} ${table ? padTable(table) : ''}` : t.takeaway}
            </p>
            {!dineIn && name ? <p className="text-2xl font-semibold">{name}</p> : null}
            {!dineIn ? <p className="text-sm">{t.readyIn(low, high)}</p> : null}
            {dineIn && needsPacing(lines) ? (
              <p className="rounded-full bg-background px-4 py-1.5 text-sm font-medium text-foreground">
                {`${t.coffeeService}: ${t.pacing[pacing]}`}
              </p>
            ) : null}

            {staffConfirmed ? (
              <div className="mt-2 flex items-center gap-2 rounded-full border-2 border-emerald-500 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {t.ticketReceived}
              </div>
            ) : null}
          </div>

          <ul className="divide-y divide-dashed divide-background/40">
            {lines.map((line) => {
              const item = getItem(line.itemId)
              if (!item) return null
              return (
                <li key={line.uid} className="flex items-start gap-4 py-4">
                  <span className="w-10 shrink-0 font-display text-3xl leading-none font-semibold tabular-nums">
                    {`${line.qty}×`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p lang="en" className="font-display text-2xl leading-tight font-medium tracking-wide uppercase">
                      {item.name}
                    </p>
                    {describeSelections(item, line.selections, lang).map((detail) => (
                      <p key={detail} className="leading-relaxed">
                        {detail}
                      </p>
                    ))}
                    {line.notes ? (
                      <p className="mt-1 text-sm font-medium italic opacity-90">
                        📝 {line.notes}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatIQD(lineTotal(line))}</p>
                </li>
              )
            })}
          </ul>

          {note.trim() ? (
            <p className="mt-4 rounded-xl border-2 border-background/40 px-4 py-3 leading-relaxed">
              <span className="font-semibold">{`${t.note}: `}</span>
              {note.trim()}
            </p>
          ) : null}

          {dineIn ? (
            <div className="mt-6 flex flex-col items-center gap-2 border-t border-dashed border-background/30 pt-5">
              <button
                type="button"
                onClick={handleCallWaiter}
                disabled={waiterCalled}
                className="flex h-11 items-center gap-2 rounded-full border border-background/40 px-5 text-sm font-medium hover:bg-background/10 disabled:opacity-60"
              >
                {waiterCalled ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
                {waiterCalled ? t.waiterCalled : t.callWaiter}
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-background px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl tracking-wide uppercase">{t.total}</span>
            <span className="text-3xl font-semibold tabular-nums">{formatIQD(cartTotal(lines))}</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {!staffConfirmed ? (
              <button
                type="button"
                onClick={() => setStaffConfirmed(true)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-background/40 font-medium text-background hover:bg-background/10"
              >
                <Check className="size-4" aria-hidden="true" />
                {t.markReceived}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                clearOrder()
                onFinish()
              }}
              className="h-12 flex-1 rounded-full bg-background font-medium text-foreground hover:opacity-90"
            >
              {t.startNewOrder}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

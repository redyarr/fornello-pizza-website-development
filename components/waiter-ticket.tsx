'use client'

import { ArrowLeft } from 'lucide-react'
import { getItem } from '@/lib/menu'
import { cartTotal, describeSelections, formatIQD, lineTotal, needsPacing, padTable, prepEstimate } from '@/lib/order'
import { useOrder } from './order-provider'
import { Sheet } from './sheet'
import { Tricolor } from './tricolor'

type WaiterTicketProps = { open: boolean; time: string; onBack: () => void; onFinish: () => void }

export function WaiterTicket({ open, time, onBack, onFinish }: WaiterTicketProps) {
  const { lang, t, mode, table, lines, pacing, customerName, note, clearOrder } = useOrder()
  const dineIn = mode === 'dine-in'
  const [low, high] = prepEstimate(lines)
  const name = customerName.trim()

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
          <p className="text-sm tabular-nums">{time}</p>
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
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatIQD(lineTotal(line))}</p>
                </li>
              )
            })}
          </ul>

          {note.trim() ? (
            <p className="rounded-xl border-2 border-background/40 px-4 py-3 leading-relaxed">
              <span className="font-semibold">{`${t.note}: `}</span>
              {note.trim()}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t-2 border-background px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl tracking-wide uppercase">{t.total}</span>
            <span className="text-3xl font-semibold tabular-nums">{formatIQD(cartTotal(lines))}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              clearOrder()
              onFinish()
            }}
            className="h-12 rounded-full bg-background font-medium text-foreground hover:opacity-90"
          >
            {t.startNewOrder}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
